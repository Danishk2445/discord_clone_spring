package com.mihord.api.ws;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mihord.api.dm.DmParticipantRepository;
import com.mihord.api.server.ChannelRepository;
import com.mihord.api.server.ServerMemberRepository;
import com.mihord.api.server.entity.ChannelEntity;
import com.mihord.api.user.UserEntity;
import com.mihord.api.user.UserRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RealtimeHandler extends TextWebSocketHandler {

    private static final long TYPING_MIN_INTERVAL_MS = 3000L;
    private static final int MAX_TEXT_BYTES = 64_000;

    private final ObjectMapper mapper;
    private final RealtimeRegistry registry;
    private final PresenceTracker presence;
    private final VoiceRoomManager voice;
    private final ChannelRepository channels;
    private final ServerMemberRepository serverMembers;
    private final DmParticipantRepository dmParticipants;
    private final UserRepository users;

    /** Per-session typing throttle: channelId -> last-sent epoch millis. */
    private final Map<WebSocketSession, Map<String, Long>> lastTyping = new ConcurrentHashMap<>();

    @Autowired
    public RealtimeHandler(ObjectMapper mapper,
                           RealtimeRegistry registry,
                           PresenceTracker presence,
                           @Lazy VoiceRoomManager voice,
                           ChannelRepository channels,
                           ServerMemberRepository serverMembers,
                           DmParticipantRepository dmParticipants,
                           UserRepository users) {
        this.mapper = mapper;
        this.registry = registry;
        this.presence = presence;
        this.voice = voice;
        this.channels = channels;
        this.serverMembers = serverMembers;
        this.dmParticipants = dmParticipants;
        this.users = users;
    }

    @PostConstruct
    public void wireCanSee() {
        registry.setCanSeeFn(this::canSee);
    }

    private boolean canSee(String userId, String channelId) {
        ChannelEntity ch = channels.findById(channelId).orElse(null);
        if (ch != null) return serverMembers.isMember(ch.getServerId(), userId);
        return dmParticipants.isParticipant(channelId, userId);
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String userId = (String) session.getAttributes().get(RealtimeHandshakeInterceptor.USER_ID_KEY);
        if (userId == null) {
            session.close(CloseStatus.NOT_ACCEPTABLE);
            return;
        }
        registry.register(userId, session);
        presence.addConnection(userId);
        lastTyping.put(session, new ConcurrentHashMap<>());

        Map<String, Object> hello = new LinkedHashMap<>();
        hello.put("type", "hello");
        hello.put("userId", userId);
        hello.put("voiceStates", voice.getAllVoiceChannelStates());
        hello.put("pendingDmCalls", voice.getPendingDmCallsForUser(userId));
        registry.sendTo(session, hello);

        broadcastPresenceForUser(userId, true);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String userId = registry.userOf(session);
        lastTyping.remove(session);
        if (userId != null) {
            voice.dropSocketFromVoice(session, userId);
            registry.unregister(session);
            presence.removeConnection(userId);
            broadcastPresenceForUser(userId, false);
        } else {
            registry.unregister(session);
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        if (payload == null || payload.length() > MAX_TEXT_BYTES) return;
        JsonNode node;
        try {
            node = mapper.readTree(payload);
        } catch (Exception e) {
            return;
        }
        if (node == null || !node.isObject()) return;
        String type = optString(node, "type");
        if (type == null) return;
        String userId = registry.userOf(session);
        if (userId == null) return;

        switch (type) {
            case "typing" -> handleTyping(session, userId, node);
            case "voice:join" -> {
                String channelId = optString(node, "channelId");
                if (channelId == null || channelId.length() > 80) return;
                voice.joinVoiceChannel(session, userId, channelId);
            }
            case "voice:leave" -> {
                String channelId = optString(node, "channelId");
                if (channelId == null || channelId.length() > 80) return;
                voice.leaveVoiceChannel(userId, channelId);
            }
            case "voice:signal" -> {
                String channelId = optString(node, "channelId");
                String targetUserId = optString(node, "targetUserId");
                if (channelId == null || channelId.length() > 80) return;
                if (targetUserId == null || targetUserId.length() > 80) return;
                Object inner = node.has("payload") ? mapper.convertValue(node.get("payload"), Object.class) : null;
                voice.relayVoiceSignal(userId, channelId, targetUserId, inner);
            }
            case "voice:state" -> {
                String channelId = optString(node, "channelId");
                if (channelId == null || channelId.length() > 80) return;
                Boolean muted = optBool(node, "muted");
                Boolean deafened = optBool(node, "deafened");
                Boolean speaking = optBool(node, "speaking");
                voice.updateVoiceState(userId, channelId, muted, deafened, speaking);
            }
            default -> { /* ignore unknown */ }
        }
    }

    private void handleTyping(WebSocketSession session, String userId, JsonNode node) {
        String channelId = optString(node, "channelId");
        if (channelId == null || channelId.length() > 80) return;
        if (!canSee(userId, channelId)) return;
        long now = System.currentTimeMillis();
        Map<String, Long> map = lastTyping.get(session);
        if (map == null) return;
        Long last = map.get(channelId);
        if (last != null && now - last < TYPING_MIN_INTERVAL_MS) return;
        map.put(channelId, now);
        Map<String, Object> evt = new LinkedHashMap<>();
        evt.put("type", "typing");
        evt.put("channelId", channelId);
        evt.put("userId", userId);
        evt.put("at", now);
        registry.broadcastExcept(channelId, evt, userId);
    }

    private void broadcastPresenceForUser(String userId, boolean online) {
        UserEntity u = users.findById(userId).orElse(null);
        if (u == null) return;
        String stored = u.getStatus();
        String effective = (!online || "offline".equals(stored)) ? "offline" : stored;
        registry.broadcastAll(Map.of("type", "presence", "userId", userId, "status", effective));
    }

    private static String optString(JsonNode node, String key) {
        JsonNode v = node.get(key);
        return v != null && v.isTextual() ? v.asText() : null;
    }

    private static Boolean optBool(JsonNode node, String key) {
        JsonNode v = node.get(key);
        return v != null && v.isBoolean() ? v.asBoolean() : null;
    }
}
