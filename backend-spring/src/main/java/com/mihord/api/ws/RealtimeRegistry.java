package com.mihord.api.ws;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mihord.api.dto.MessageDtos;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/** Tracks open WebSocket sessions per user and broadcasts events
 * to viewers of a given channel/DM. Visibility (canSee) and voice routing
 * are delegated via callbacks set at startup by RealtimeHandler/VoiceRoomManager. */
@Component
public class RealtimeRegistry {

    private final ObjectMapper mapper;

    /** userId -> set of open sessions for that user (one per browser tab). */
    private final ConcurrentHashMap<String, Set<WebSocketSession>> sessionsByUser = new ConcurrentHashMap<>();
    /** session -> userId, for reverse lookup on close. */
    private final ConcurrentHashMap<WebSocketSession, String> userBySession = new ConcurrentHashMap<>();

    private volatile CanSeeFn canSee = (uid, cid) -> true;

    public interface CanSeeFn {
        boolean canSee(String userId, String channelId);
    }

    @Autowired
    public RealtimeRegistry(@Lazy ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public void setCanSeeFn(CanSeeFn fn) {
        this.canSee = fn;
    }

    public void register(String userId, WebSocketSession session) {
        userBySession.put(session, userId);
        sessionsByUser.computeIfAbsent(userId, k -> new LinkedHashSet<>()).add(session);
    }

    public void unregister(WebSocketSession session) {
        String userId = userBySession.remove(session);
        if (userId == null) return;
        Set<WebSocketSession> sessions = sessionsByUser.get(userId);
        if (sessions != null) {
            sessions.remove(session);
            if (sessions.isEmpty()) sessionsByUser.remove(userId);
        }
    }

    public String userOf(WebSocketSession session) {
        return userBySession.get(session);
    }

    public Map<String, Set<WebSocketSession>> snapshot() {
        return new HashMap<>(sessionsByUser);
    }

    public void sendTo(WebSocketSession session, Object payload) {
        try {
            if (session.isOpen()) {
                session.sendMessage(new TextMessage(mapper.writeValueAsString(payload)));
            }
        } catch (IOException ignored) {}
    }

    public void broadcastAll(Object payload) {
        String text = encode(payload);
        if (text == null) return;
        for (WebSocketSession s : userBySession.keySet()) {
            send(s, text);
        }
    }

    /** Broadcast to every session whose user can see channelId. */
    public void broadcast(String channelId, Object payload) {
        String text = encode(payload);
        if (text == null) return;
        for (Map.Entry<WebSocketSession, String> e : userBySession.entrySet()) {
            if (canSee.canSee(e.getValue(), channelId)) {
                send(e.getKey(), text);
            }
        }
    }

    public void broadcastExcept(String channelId, Object payload, String exceptUserId) {
        String text = encode(payload);
        if (text == null) return;
        for (Map.Entry<WebSocketSession, String> e : userBySession.entrySet()) {
            if (exceptUserId != null && exceptUserId.equals(e.getValue())) continue;
            if (canSee.canSee(e.getValue(), channelId)) {
                send(e.getKey(), text);
            }
        }
    }

    private void send(WebSocketSession session, String text) {
        try {
            if (session.isOpen()) {
                session.sendMessage(new TextMessage(text));
            }
        } catch (IOException ignored) {}
    }

    private String encode(Object payload) {
        try {
            return mapper.writeValueAsString(payload);
        } catch (Exception e) {
            return null;
        }
    }

    // ---- Convenience helpers for typed WS payloads -------------------------

    public void broadcastMessage(String channelId, MessageDtos.Message message) {
        broadcast(channelId, Map.of("type", "message", "message", message));
    }

    public void broadcastMessageUpdate(String channelId, MessageDtos.Message message) {
        broadcast(channelId, Map.of("type", "message:update", "message", message));
    }

    public void broadcastMessageDelete(String channelId, String messageId, long deletedAt) {
        broadcast(channelId, Map.of(
            "type", "message:delete",
            "channelId", channelId,
            "messageId", messageId,
            "deletedAt", deletedAt));
    }

    public void broadcastReaction(String channelId, String messageId, String emoji,
                                  String userId, String action) {
        broadcast(channelId, Map.of(
            "type", "reaction",
            "channelId", channelId,
            "messageId", messageId,
            "emoji", emoji,
            "userId", userId,
            "action", action));
    }

    public void broadcastPin(String channelId, String messageId, Long pinnedAt) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "message:pin");
        payload.put("channelId", channelId);
        payload.put("messageId", messageId);
        payload.put("pinnedAt", pinnedAt);
        broadcast(channelId, payload);
    }

    public void broadcastPresence(String userId, String status) {
        broadcastAll(Map.of("type", "presence", "userId", userId, "status", status));
    }
}
