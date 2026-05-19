package com.mihord.api.ws;

import com.mihord.api.dm.DmParticipantRepository;
import com.mihord.api.server.ChannelRepository;
import com.mihord.api.server.ServerMemberRepository;
import com.mihord.api.server.entity.ChannelEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/** Ports backend/src/ws/voice.ts — voice channel state + signaling + DM call lifecycle. */
@Component
public class VoiceRoomManager {

    public static final class VoiceMember {
        public final String userId;
        public boolean muted;
        public boolean deafened;
        public boolean speaking;
        public WebSocketSession socket;

        VoiceMember(String userId, WebSocketSession socket) {
            this.userId = userId;
            this.socket = socket;
        }

        public Map<String, Object> toJson() {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("userId", userId);
            m.put("muted", muted);
            m.put("deafened", deafened);
            m.put("speaking", speaking);
            return m;
        }
    }

    public static final class PendingDmCall {
        public final String dmId;
        public final String callerId;
        public final long startedAt;

        PendingDmCall(String dmId, String callerId, long startedAt) {
            this.dmId = dmId;
            this.callerId = callerId;
            this.startedAt = startedAt;
        }

        public Map<String, Object> toJson() {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("dmId", dmId);
            m.put("callerId", callerId);
            m.put("startedAt", startedAt);
            return m;
        }
    }

    private final ChannelRepository channels;
    private final DmParticipantRepository dmParticipants;
    private final ServerMemberRepository serverMembers;
    private final RealtimeRegistry registry;

    private final Map<String, Map<String, VoiceMember>> rooms = new ConcurrentHashMap<>();
    private final Map<String, Set<String>> userChannels = new ConcurrentHashMap<>();
    private final Map<String, PendingDmCall> pendingDmCalls = new ConcurrentHashMap<>();

    public VoiceRoomManager(ChannelRepository channels,
                            DmParticipantRepository dmParticipants,
                            ServerMemberRepository serverMembers,
                            RealtimeRegistry registry) {
        this.channels = channels;
        this.dmParticipants = dmParticipants;
        this.serverMembers = serverMembers;
        this.registry = registry;
    }

    private boolean canJoin(String userId, String channelId) {
        ChannelEntity ch = channels.findById(channelId).orElse(null);
        if (ch != null) {
            if (!"voice".equals(ch.getKind())) return false;
            return serverMembers.isMember(ch.getServerId(), userId);
        }
        return dmParticipants.isParticipant(channelId, userId);
    }

    private boolean isDm(String channelId) {
        return !channels.existsById(channelId);
    }

    public List<Map<String, Object>> snapshot(String channelId) {
        Map<String, VoiceMember> room = rooms.get(channelId);
        if (room == null) return List.of();
        List<Map<String, Object>> out = new ArrayList<>(room.size());
        for (VoiceMember m : room.values()) out.add(m.toJson());
        return out;
    }

    public Map<String, List<Map<String, Object>>> getAllVoiceChannelStates() {
        Map<String, List<Map<String, Object>>> out = new LinkedHashMap<>();
        for (Map.Entry<String, Map<String, VoiceMember>> e : rooms.entrySet()) {
            if (e.getValue().isEmpty()) continue;
            out.put(e.getKey(), snapshot(e.getKey()));
        }
        return out;
    }

    public List<Map<String, Object>> getPendingDmCallsForUser(String userId) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (PendingDmCall call : pendingDmCalls.values()) {
            if (call.callerId.equals(userId)) continue;
            if (!dmParticipants.isParticipant(call.dmId, userId)) continue;
            out.add(call.toJson());
        }
        return out;
    }

    public synchronized void joinVoiceChannel(WebSocketSession socket, String userId, String channelId) {
        if (!canJoin(userId, channelId)) {
            registry.sendTo(socket, Map.of("type", "voice:error", "channelId", channelId, "error", "forbidden"));
            return;
        }
        leaveAllVoiceChannels(userId, channelId);

        Map<String, VoiceMember> room = rooms.computeIfAbsent(channelId, k -> new LinkedHashMap<>());
        VoiceMember existing = room.get(userId);
        if (existing != null && existing.socket != socket) {
            registry.sendTo(existing.socket, Map.of(
                "type", "voice:kicked",
                "channelId", channelId,
                "reason", "joined_elsewhere"));
        }
        VoiceMember conn = new VoiceMember(userId, socket);
        room.put(userId, conn);
        userChannels.computeIfAbsent(userId, k -> Collections.newSetFromMap(new ConcurrentHashMap<>()))
            .add(channelId);

        Map<String, Object> joined = new LinkedHashMap<>();
        joined.put("type", "voice:joined");
        joined.put("channelId", channelId);
        joined.put("selfUserId", userId);
        joined.put("members", snapshot(channelId));
        registry.sendTo(socket, joined);

        Map<String, Object> peerJoin = new LinkedHashMap<>();
        peerJoin.put("type", "voice:peer_join");
        peerJoin.put("channelId", channelId);
        peerJoin.put("member", conn.toJson());
        broadcastToAudience(channelId, peerJoin, userId);

        if (isDm(channelId)) {
            PendingDmCall existingCall = pendingDmCalls.get(channelId);
            int roomSize = room.size();
            if (existingCall == null && roomSize == 1) {
                long startedAt = System.currentTimeMillis();
                pendingDmCalls.put(channelId, new PendingDmCall(channelId, userId, startedAt));
                Map<String, Object> incoming = new LinkedHashMap<>();
                incoming.put("type", "call:incoming");
                incoming.put("dmId", channelId);
                incoming.put("callerId", userId);
                incoming.put("startedAt", startedAt);
                broadcastToAudience(channelId, incoming, userId);
            } else if (existingCall != null && roomSize >= 2) {
                pendingDmCalls.remove(channelId);
                broadcastToAudience(channelId, Map.of("type", "call:ended", "dmId", channelId), null);
            }
        }
    }

    public synchronized void leaveVoiceChannel(String userId, String channelId) {
        Map<String, VoiceMember> room = rooms.get(channelId);
        if (room == null) return;
        VoiceMember conn = room.get(userId);
        if (conn == null) return;
        broadcastToAudience(channelId, Map.of(
            "type", "voice:peer_leave",
            "channelId", channelId,
            "userId", userId), null);
        room.remove(userId);
        if (room.isEmpty()) rooms.remove(channelId);
        Set<String> set = userChannels.get(userId);
        if (set != null) {
            set.remove(channelId);
            if (set.isEmpty()) userChannels.remove(userId);
        }
        if (isDm(channelId)) {
            PendingDmCall pending = pendingDmCalls.get(channelId);
            int size = room.size();
            if (pending != null && (size == 0 || pending.callerId.equals(userId))) {
                pendingDmCalls.remove(channelId);
                broadcastToAudience(channelId, Map.of("type", "call:ended", "dmId", channelId), null);
            }
        }
    }

    public synchronized void leaveAllVoiceChannels(String userId, String except) {
        Set<String> set = userChannels.get(userId);
        if (set == null) return;
        for (String channelId : new ArrayList<>(set)) {
            if (except != null && except.equals(channelId)) continue;
            leaveVoiceChannel(userId, channelId);
        }
    }

    public synchronized void relayVoiceSignal(String fromUserId, String channelId, String targetUserId, Object payload) {
        Map<String, VoiceMember> room = rooms.get(channelId);
        if (room == null) return;
        VoiceMember me = room.get(fromUserId);
        if (me == null) return;
        VoiceMember target = room.get(targetUserId);
        if (target == null) return;
        Map<String, Object> msg = new LinkedHashMap<>();
        msg.put("type", "voice:signal");
        msg.put("channelId", channelId);
        msg.put("fromUserId", fromUserId);
        msg.put("payload", payload);
        registry.sendTo(target.socket, msg);
    }

    public synchronized void updateVoiceState(String userId, String channelId,
                                              Boolean muted, Boolean deafened, Boolean speaking) {
        Map<String, VoiceMember> room = rooms.get(channelId);
        if (room == null) return;
        VoiceMember conn = room.get(userId);
        if (conn == null) return;
        if (muted != null) conn.muted = muted;
        if (deafened != null) conn.deafened = deafened;
        if (speaking != null) conn.speaking = speaking;
        Map<String, Object> upd = new LinkedHashMap<>();
        upd.put("type", "voice:peer_update");
        upd.put("channelId", channelId);
        upd.put("member", conn.toJson());
        broadcastToAudience(channelId, upd, null);
    }

    public synchronized void dropSocketFromVoice(WebSocketSession socket, String userId) {
        Set<String> set = userChannels.get(userId);
        if (set == null) return;
        for (String channelId : new ArrayList<>(set)) {
            Map<String, VoiceMember> room = rooms.get(channelId);
            if (room == null) continue;
            VoiceMember conn = room.get(userId);
            if (conn == null || conn.socket != socket) continue;
            leaveVoiceChannel(userId, channelId);
        }
    }

    private void broadcastToAudience(String channelId, Object payload, String exceptUserId) {
        if (exceptUserId == null) {
            registry.broadcast(channelId, payload);
        } else {
            registry.broadcastExcept(channelId, payload, exceptUserId);
        }
    }
}
