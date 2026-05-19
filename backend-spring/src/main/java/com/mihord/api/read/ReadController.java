package com.mihord.api.read;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mihord.api.auth.CurrentUser;
import com.mihord.api.dm.DmParticipantRepository;
import com.mihord.api.dm.DmRepository;
import com.mihord.api.dm.entity.DmEntity;
import com.mihord.api.dto.MessageDtos;
import com.mihord.api.error.ApiException;
import com.mihord.api.message.MessageRepository;
import com.mihord.api.message.MessageShaper;
import com.mihord.api.message.entity.MessageEntity;
import com.mihord.api.read.entity.ChannelNotificationEntity;
import com.mihord.api.read.entity.ChannelNotificationId;
import com.mihord.api.read.entity.ReadStateEntity;
import com.mihord.api.read.entity.ReadStateId;
import com.mihord.api.server.ChannelRepository;
import com.mihord.api.server.ServerMemberRepository;
import com.mihord.api.server.ServerRepository;
import com.mihord.api.server.entity.ChannelEntity;
import com.mihord.api.server.entity.ServerEntity;
import com.mihord.api.user.UserEntity;
import com.mihord.api.user.UserRepository;
import com.mihord.api.util.IdGen;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/** Read-state + notification-level handlers. Mirrors backend/src/routes/read.ts. */
@RestController
public class ReadController {

    private static final Set<String> VALID_LEVELS = Set.of("all", "mentions", "nothing");

    private final ReadStateRepository readStates;
    private final ChannelNotificationRepository notificationLevels;
    private final ChannelRepository channels;
    private final ServerRepository servers;
    private final ServerMemberRepository members;
    private final DmRepository dms;
    private final DmParticipantRepository dmParticipants;
    private final MessageRepository messages;
    private final MessageShaper shaper;
    private final UserRepository users;
    private final ObjectMapper mapper;

    public ReadController(ReadStateRepository readStates,
                          ChannelNotificationRepository notificationLevels,
                          ChannelRepository channels, ServerRepository servers,
                          ServerMemberRepository members, DmRepository dms,
                          DmParticipantRepository dmParticipants,
                          MessageRepository messages, MessageShaper shaper,
                          UserRepository users, ObjectMapper mapper) {
        this.readStates = readStates;
        this.notificationLevels = notificationLevels;
        this.channels = channels;
        this.servers = servers;
        this.members = members;
        this.dms = dms;
        this.dmParticipants = dmParticipants;
        this.messages = messages;
        this.shaper = shaper;
        this.users = users;
        this.mapper = mapper;
    }

    // -------- per-channel/dm read + notifications --------------------------

    public record NotificationBody(String level) {}

    @PostMapping("/api/channels/{channelId}/read")
    @Transactional
    public Map<String, Object> markChannelRead(@CurrentUser UserEntity me, @PathVariable String channelId) {
        ChannelEntity c = channels.findById(channelId).orElseThrow(() -> ApiException.notFound("not_found"));
        if (!members.isMember(c.getServerId(), me.getId())) throw ApiException.forbidden("forbidden");
        long now = IdGen.now();
        readStates.save(new ReadStateEntity(me.getId(), c.getId(), now));
        return Map.of("ok", true, "lastReadAt", now);
    }

    @PutMapping("/api/channels/{channelId}/notifications")
    @Transactional
    public Map<String, Object> setChannelNotification(@CurrentUser UserEntity me, @PathVariable String channelId,
                                                      @RequestBody(required = false) NotificationBody body) {
        ChannelEntity c = channels.findById(channelId).orElseThrow(() -> ApiException.notFound("not_found"));
        if (!members.isMember(c.getServerId(), me.getId())) throw ApiException.forbidden("forbidden");
        if (body == null || body.level == null || !VALID_LEVELS.contains(body.level)) {
            throw ApiException.badRequest("invalid_level");
        }
        setLevel(me.getId(), c.getId(), body.level);
        return Map.of("ok", true, "level", body.level);
    }

    @PostMapping("/api/dms/{dmId}/read")
    @Transactional
    public Map<String, Object> markDmRead(@CurrentUser UserEntity me, @PathVariable String dmId) {
        if (!dmParticipants.isParticipant(dmId, me.getId())) throw ApiException.notFound("not_found");
        long now = IdGen.now();
        readStates.save(new ReadStateEntity(me.getId(), dmId, now));
        return Map.of("ok", true, "lastReadAt", now);
    }

    @PutMapping("/api/dms/{dmId}/notifications")
    @Transactional
    public Map<String, Object> setDmNotification(@CurrentUser UserEntity me, @PathVariable String dmId,
                                                 @RequestBody(required = false) NotificationBody body) {
        DmEntity d = dms.findById(dmId).orElseThrow(() -> ApiException.notFound("not_found"));
        if (!dmParticipants.isParticipant(d.getId(), me.getId())) throw ApiException.forbidden("forbidden");
        if (body == null || body.level == null || !VALID_LEVELS.contains(body.level)) {
            throw ApiException.badRequest("invalid_level");
        }
        setLevel(me.getId(), d.getId(), body.level);
        return Map.of("ok", true, "level", body.level);
    }

    private void setLevel(String userId, String channelId, String level) {
        ChannelNotificationId id = new ChannelNotificationId(userId, channelId);
        if ("all".equals(level)) {
            notificationLevels.findById(id).ifPresent(notificationLevels::delete);
            return;
        }
        notificationLevels.save(new ChannelNotificationEntity(userId, channelId, level));
    }

    // -------- /me/unread, /me/notifications, /me/mentions, /me/inbox -------

    @GetMapping("/api/users/me/notifications")
    public Map<String, Object> notifications(@CurrentUser UserEntity me) {
        Map<String, String> levels = new HashMap<>();
        for (ChannelNotificationEntity e : notificationLevels.findByIdUserId(me.getId())) {
            levels.put(e.getId().getChannelId(), e.getLevel());
        }
        return Map.of("levels", levels);
    }

    @GetMapping("/api/users/me/unread")
    public Map<String, Object> unread(@CurrentUser UserEntity me) {
        Map<String, Long> readMap = new HashMap<>();
        for (ReadStateEntity r : readStates.findByIdUserId(me.getId())) {
            readMap.put(r.getId().getChannelId(), r.getLastReadAt());
        }
        Map<String, String> levels = new HashMap<>();
        for (ChannelNotificationEntity e : notificationLevels.findByIdUserId(me.getId())) {
            levels.put(e.getId().getChannelId(), e.getLevel());
        }
        Map<String, Object> out = new HashMap<>();
        for (ChannelEntity c : channels.findTextChannelsForUser(me.getId())) {
            Object summary = computeUnreadFor(c.getId(), true, c.getServerId(), me.getId(), readMap, levels);
            if (summary != null) out.put(c.getId(), summary);
        }
        for (String dmId : dmParticipants.findDmIdsByUser(me.getId())) {
            Object summary = computeUnreadFor(dmId, false, null, me.getId(), readMap, levels);
            if (summary != null) out.put(dmId, summary);
        }
        return Map.of("unread", out);
    }

    private Map<String, Object> computeUnreadFor(String channelId, boolean isChannel,
                                                 String serverId, String userId,
                                                 Map<String, Long> readMap, Map<String, String> levels) {
        long lastRead = readMap.getOrDefault(channelId, 0L);
        String level = levels.getOrDefault(channelId, "all");
        if ("nothing".equals(level)) {
            if (lastRead > 0) {
                Map<String, Object> entry = new HashMap<>();
                entry.put("unreadCount", 0);
                entry.put("mentionCount", 0);
                entry.put("lastReadAt", lastRead);
                entry.put("serverId", serverId);
                return entry;
            }
            return null;
        }
        long n = messages.countUnread(channelId, userId, lastRead);
        if (n == 0) {
            if (lastRead > 0) {
                Map<String, Object> entry = new HashMap<>();
                entry.put("unreadCount", 0);
                entry.put("mentionCount", 0);
                entry.put("lastReadAt", lastRead);
                entry.put("serverId", serverId);
                return entry;
            }
            return null;
        }
        int mentionCount = 0;
        for (String raw : messages.mentionsForUnread(channelId, userId, lastRead)) {
            if (mentionsTargetMe(raw, userId, isChannel)) mentionCount++;
        }
        Map<String, Object> entry = new HashMap<>();
        entry.put("unreadCount", "mentions".equals(level) ? mentionCount : (int) n);
        entry.put("mentionCount", mentionCount);
        entry.put("lastReadAt", lastRead);
        entry.put("serverId", serverId);
        return entry;
    }

    private boolean mentionsTargetMe(String rawJson, String me, boolean isChannel) {
        if (rawJson == null || rawJson.isEmpty()) return false;
        try {
            List<String> arr = mapper.readValue(rawJson, new TypeReference<List<String>>() {});
            for (String id : arr) {
                if (me.equals(id)) return true;
                if (isChannel && ("@everyone".equals(id) || "@here".equals(id))) return true;
            }
        } catch (Exception ignored) {}
        return false;
    }

    @GetMapping("/api/users/me/mentions")
    public Map<String, Object> myMentions(@CurrentUser UserEntity me) {
        List<MessageEntity> rows = messages.recentMentionsForUser(me.getId());
        List<MessageEntity> filtered = new ArrayList<>();
        for (MessageEntity r : rows) {
            String mentions = r.getMentions();
            if (mentions == null) continue;
            boolean isChannel = channels.findById(r.getChannelId()).isPresent();
            if (mentionsTargetMe(mentions, me.getId(), isChannel)) filtered.add(r);
            if (filtered.size() >= 50) break;
        }
        return Map.of("messages", shaper.shape(filtered));
    }

    public record InboxLocation(String kind, String id, String name,
                                @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL) String serverId,
                                @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL) String serverName) {}

    @GetMapping("/api/users/me/inbox")
    public Map<String, Object> inbox(@CurrentUser UserEntity me) {
        List<MessageEntity> recent = messages.recentMentionsForUser(me.getId());
        List<Map<String, Object>> mentionItems = new ArrayList<>();
        for (MessageEntity r : recent) {
            String raw = r.getMentions();
            if (raw == null) continue;
            boolean isChannel = channels.findById(r.getChannelId()).isPresent();
            if (!mentionsTargetMe(raw, me.getId(), isChannel)) continue;
            InboxLocation loc = resolveLocation(me.getId(), r.getChannelId());
            if (loc == null) continue;
            MessageDtos.Message msg = shaper.shape(r);
            Map<String, Object> item = new HashMap<>();
            item.put("message", msg);
            item.put("location", loc);
            mentionItems.add(item);
            if (mentionItems.size() >= 30) break;
        }

        Map<String, Long> readMap = new HashMap<>();
        for (ReadStateEntity rs : readStates.findByIdUserId(me.getId())) {
            readMap.put(rs.getId().getChannelId(), rs.getLastReadAt());
        }
        Map<String, String> levels = new HashMap<>();
        for (ChannelNotificationEntity e : notificationLevels.findByIdUserId(me.getId())) {
            levels.put(e.getId().getChannelId(), e.getLevel());
        }

        List<Map<String, Object>> unreadList = new ArrayList<>();
        for (ChannelEntity c : channels.findTextChannelsForUser(me.getId())) {
            Map<String, Object> u = computeInboxUnread(c.getId(), true, me.getId(), readMap, levels);
            if (u != null) unreadList.add(u);
        }
        for (String dmId : dmParticipants.findDmIdsByUser(me.getId())) {
            Map<String, Object> u = computeInboxUnread(dmId, false, me.getId(), readMap, levels);
            if (u != null) unreadList.add(u);
        }
        unreadList.sort((a, b) -> {
            int ma = ((Number) a.get("mentionCount")).intValue();
            int mb = ((Number) b.get("mentionCount")).intValue();
            if (mb != ma) return mb - ma;
            int ua = ((Number) a.get("unreadCount")).intValue();
            int ub = ((Number) b.get("unreadCount")).intValue();
            return ub - ua;
        });

        return Map.of("mentions", mentionItems, "unreads", unreadList);
    }

    private Map<String, Object> computeInboxUnread(String channelId, boolean isChannel, String userId,
                                                   Map<String, Long> readMap, Map<String, String> levels) {
        long lastRead = readMap.getOrDefault(channelId, 0L);
        String level = levels.getOrDefault(channelId, "all");
        if ("nothing".equals(level)) return null;
        long n = messages.countUnread(channelId, userId, lastRead);
        if (n == 0) return null;
        int mentionCount = 0;
        for (String raw : messages.mentionsForUnread(channelId, userId, lastRead)) {
            if (mentionsTargetMe(raw, userId, isChannel)) mentionCount++;
        }
        int total = "mentions".equals(level) ? mentionCount : (int) n;
        if (total == 0) return null;
        InboxLocation loc = resolveLocation(userId, channelId);
        if (loc == null) return null;
        Map<String, Object> entry = new HashMap<>();
        entry.put("location", loc);
        entry.put("unreadCount", total);
        entry.put("mentionCount", mentionCount);
        entry.put("lastReadAt", lastRead);
        return entry;
    }

    private InboxLocation resolveLocation(String me, String channelId) {
        Optional<ChannelEntity> chanOpt = channels.findById(channelId);
        if (chanOpt.isPresent()) {
            ChannelEntity c = chanOpt.get();
            Optional<ServerEntity> sOpt = servers.findById(c.getServerId());
            if (sOpt.isEmpty()) return null;
            return new InboxLocation("channel", c.getId(), c.getName(), sOpt.get().getId(), sOpt.get().getName());
        }
        Optional<DmEntity> dmOpt = dms.findById(channelId);
        if (dmOpt.isEmpty()) return null;
        DmEntity d = dmOpt.get();
        if (d.isGroup()) {
            String name = d.getGroupName() != null ? d.getGroupName() : "Group";
            return new InboxLocation("dm", d.getId(), name, null, null);
        }
        List<String> parts = dmParticipants.findUserIdsByDm(d.getId());
        String otherId = parts.stream().filter(p -> !p.equals(me)).findFirst().orElse(parts.isEmpty() ? null : parts.get(0));
        if (otherId == null) return new InboxLocation("dm", d.getId(), "Direct Message", null, null);
        UserEntity other = users.findById(otherId).orElse(null);
        String name = other != null
            ? (other.getDisplayName() != null ? other.getDisplayName() : other.getUsername())
            : "Direct Message";
        return new InboxLocation("dm", d.getId(), name, null, null);
    }
}
