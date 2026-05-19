package com.mihord.api.dm;

import com.mihord.api.auth.CurrentUser;
import com.mihord.api.dm.entity.DmEntity;
import com.mihord.api.dm.entity.DmParticipantEntity;
import com.mihord.api.dto.MessageDtos;
import com.mihord.api.error.ApiException;
import com.mihord.api.friend.FriendService;
import com.mihord.api.friend.FriendshipRepository;
import com.mihord.api.message.MessageRepository;
import com.mihord.api.message.MessageReactionRepository;
import com.mihord.api.message.MessageService;
import com.mihord.api.message.MessageShaper;
import com.mihord.api.message.entity.MessageEntity;
import com.mihord.api.message.entity.MessageReactionEntity;
import com.mihord.api.read.ReadStateRepository;
import com.mihord.api.read.entity.ReadStateEntity;
import com.mihord.api.read.entity.ReadStateId;
import com.mihord.api.user.UserEntity;
import com.mihord.api.util.EmojiValidator;
import com.mihord.api.util.IdGen;
import com.mihord.api.ws.RealtimeRegistry;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/dms")
public class DmController {

    private final DmRepository dms;
    private final DmParticipantRepository participants;
    private final FriendshipRepository friendships;
    private final FriendService friendService;
    private final DmShaper shaper;
    private final MessageRepository messages;
    private final MessageReactionRepository reactions;
    private final MessageService messageService;
    private final MessageShaper messageShaper;
    private final ReadStateRepository readStates;
    private final RealtimeRegistry realtime;

    public DmController(DmRepository dms, DmParticipantRepository participants,
                        FriendshipRepository friendships, FriendService friendService,
                        DmShaper shaper, MessageRepository messages, MessageReactionRepository reactions,
                        MessageService messageService, MessageShaper messageShaper,
                        ReadStateRepository readStates, RealtimeRegistry realtime) {
        this.dms = dms;
        this.participants = participants;
        this.friendships = friendships;
        this.friendService = friendService;
        this.shaper = shaper;
        this.messages = messages;
        this.reactions = reactions;
        this.messageService = messageService;
        this.messageShaper = messageShaper;
        this.readStates = readStates;
        this.realtime = realtime;
    }

    private DmEntity ensureParticipant(String dmId, String userId) {
        DmEntity dm = dms.findById(dmId).orElseThrow(() -> ApiException.notFound("not_found"));
        if (!participants.isParticipant(dm.getId(), userId)) throw ApiException.notFound("not_found");
        return dm;
    }

    // ---- DM listing & creation -------------------------------------------

    @GetMapping
    public Map<String, Object> list(@CurrentUser UserEntity me) {
        List<DmEntity> mine = dms.findForUser(me.getId());
        return Map.of("dms", mine.stream().map(shaper::toDm).toList());
    }

    @PostMapping
    @Transactional
    public ResponseEntity<Map<String, Object>> createOrOpen(@CurrentUser UserEntity me,
                                                            @RequestBody(required = false) Map<String, Object> body) {
        if (body == null) body = Map.of();

        if (body.get("userIds") instanceof List<?> raw) {
            LinkedHashSet<String> ids = new LinkedHashSet<>();
            for (Object o : raw) {
                if (o instanceof String s && !s.equals(me.getId())) ids.add(s);
            }
            if (ids.isEmpty() || ids.size() > 9) throw ApiException.badRequest("invalid_participants");

            for (String id : ids) {
                if (friendService.isBlockedBetween(me.getId(), id)) throw ApiException.forbidden("blocked");
                var f = friendships.findOne(me.getId(), id);
                if (f.isEmpty() || !"accepted".equals(f.get().getStatus())) {
                    throw ApiException.forbidden("not_friends");
                }
            }

            if (ids.size() == 1) {
                String other = ids.iterator().next();
                List<DmEntity> existing = dms.findDirectBetween(me.getId(), other);
                if (!existing.isEmpty()) {
                    return ResponseEntity.ok(Map.of("dm", shaper.toDm(existing.get(0))));
                }
                DmEntity dm = createDirect(me.getId(), other);
                return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("dm", shaper.toDm(dm)));
            }

            String rawName = body.get("groupName") instanceof String n ? n.trim() : "";
            if (rawName.length() > 100) rawName = rawName.substring(0, 100);
            String id = IdGen.newId("dm");
            DmEntity dm = new DmEntity();
            dm.setId(id); dm.setGroup(true);
            dm.setGroupName(rawName.isEmpty() ? null : rawName);
            dm.setCreatedAt(IdGen.now());
            dms.save(dm);
            participants.save(new DmParticipantEntity(id, me.getId()));
            for (String uid : ids) participants.save(new DmParticipantEntity(id, uid));
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("dm", shaper.toDm(dm)));
        }

        Object otherIdRaw = body.get("userId");
        if (!(otherIdRaw instanceof String otherId) || otherId.equals(me.getId())) {
            throw ApiException.badRequest("invalid_user");
        }
        if (friendService.isBlockedBetween(me.getId(), otherId)) throw ApiException.forbidden("blocked");
        var f = friendships.findOne(me.getId(), otherId);
        if (f.isEmpty() || !"accepted".equals(f.get().getStatus())) throw ApiException.forbidden("not_friends");

        List<DmEntity> existing = dms.findDirectBetween(me.getId(), otherId);
        if (!existing.isEmpty()) {
            return ResponseEntity.ok(Map.of("dm", shaper.toDm(existing.get(0))));
        }
        DmEntity dm = createDirect(me.getId(), otherId);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("dm", shaper.toDm(dm)));
    }

    private DmEntity createDirect(String a, String b) {
        String id = IdGen.newId("dm");
        DmEntity dm = new DmEntity();
        dm.setId(id); dm.setGroup(false); dm.setGroupName(null); dm.setCreatedAt(IdGen.now());
        dms.save(dm);
        participants.save(new DmParticipantEntity(id, a));
        participants.save(new DmParticipantEntity(id, b));
        return dm;
    }

    @GetMapping("/{dmId}")
    public Map<String, Object> get(@CurrentUser UserEntity me, @PathVariable String dmId) {
        DmEntity dm = ensureParticipant(dmId, me.getId());
        return Map.of("dm", shaper.toDm(dm));
    }

    @PatchMapping("/{dmId}")
    @Transactional
    public Map<String, Object> patch(@CurrentUser UserEntity me, @PathVariable String dmId,
                                     @RequestBody(required = false) Map<String, Object> body) {
        DmEntity dm = ensureParticipant(dmId, me.getId());
        if (!dm.isGroup()) throw ApiException.badRequest("not_a_group");
        String name = body != null && body.get("groupName") instanceof String s ? s.trim() : null;
        if (name != null && name.length() > 100) name = name.substring(0, 100);
        dm.setGroupName(name != null && !name.isEmpty() ? name : null);
        dms.save(dm);
        return Map.of("dm", shaper.toDm(dm));
    }

    @PostMapping("/{dmId}/participants")
    @Transactional
    public ResponseEntity<Map<String, Object>> addParticipant(@CurrentUser UserEntity me, @PathVariable String dmId,
                                                              @RequestBody(required = false) Map<String, Object> body) {
        DmEntity dm = ensureParticipant(dmId, me.getId());
        if (!dm.isGroup()) throw ApiException.badRequest("not_a_group");
        Object otherIdRaw = body != null ? body.get("userId") : null;
        if (!(otherIdRaw instanceof String otherId) || otherId.equals(me.getId())) {
            throw ApiException.badRequest("invalid_user");
        }
        if (participants.isParticipant(dm.getId(), otherId)) throw ApiException.conflict("already_participant");
        if (friendService.isBlockedBetween(me.getId(), otherId)) throw ApiException.forbidden("blocked");
        var f = friendships.findOne(me.getId(), otherId);
        if (f.isEmpty() || !"accepted".equals(f.get().getStatus())) throw ApiException.forbidden("not_friends");
        if (participants.countByDm(dm.getId()) >= 10) throw ApiException.badRequest("group_full");
        participants.save(new DmParticipantEntity(dm.getId(), otherId));
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("dm", shaper.toDm(dm)));
    }

    @DeleteMapping("/{dmId}/participants/me")
    @Transactional
    public Map<String, Object> leaveGroup(@CurrentUser UserEntity me, @PathVariable String dmId) {
        DmEntity dm = ensureParticipant(dmId, me.getId());
        if (!dm.isGroup()) throw ApiException.badRequest("not_a_group");
        participants.deleteOne(dm.getId(), me.getId());
        if (participants.countByDm(dm.getId()) == 0) dms.delete(dm);
        return Map.of("ok", true);
    }

    // ---- DM messages ------------------------------------------------------

    @GetMapping("/{dmId}/messages")
    public Map<String, Object> listMessages(@CurrentUser UserEntity me, @PathVariable String dmId) {
        DmEntity dm = ensureParticipant(dmId, me.getId());
        List<MessageEntity> rows = messages.listByChannel(dm.getId());
        Optional<ReadStateEntity> rs = readStates.findById(new ReadStateId(me.getId(), dm.getId()));
        Map<String, Object> out = new HashMap<>();
        out.put("messages", messageShaper.shape(rows));
        out.put("lastReadAt", rs.map(ReadStateEntity::getLastReadAt).orElse(0L));
        return out;
    }

    @GetMapping("/{dmId}/messages/search")
    public Map<String, Object> search(@CurrentUser UserEntity me, @PathVariable String dmId,
                                      @RequestParam(value = "q", required = false) String q,
                                      @RequestParam(value = "from", required = false) String from) {
        DmEntity dm = ensureParticipant(dmId, me.getId());
        String query = q != null ? q.trim() : "";
        if (query.isEmpty() || query.length() > 200) return Map.of("messages", List.of());
        String like = "%" + escapeLike(query.toLowerCase()) + "%";
        List<MessageEntity> rows = (from != null && !from.isEmpty())
            ? messages.searchInChannelByAuthor(dm.getId(), from, like)
            : messages.searchInChannel(dm.getId(), like);
        return Map.of("messages", messageShaper.shape(rows));
    }

    private static String escapeLike(String s) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            if (ch == '\\' || ch == '%' || ch == '_') sb.append('\\');
            sb.append(ch);
        }
        return sb.toString();
    }

    @PostMapping("/{dmId}/messages")
    @Transactional
    public ResponseEntity<Map<String, Object>> sendMessage(@CurrentUser UserEntity me, @PathVariable String dmId,
                                                           @RequestBody(required = false) Map<String, Object> body) {
        DmEntity dm = ensureParticipant(dmId, me.getId());
        if (!dm.isGroup()) {
            String other = participants.findUserIdsByDm(dm.getId()).stream()
                .filter(p -> !p.equals(me.getId())).findFirst().orElse(null);
            if (other != null && friendService.isBlockedBetween(me.getId(), other)) {
                throw ApiException.forbidden("blocked");
            }
        }
        String content = body != null && body.get("content") instanceof String s ? s.trim() : "";
        List<MessageDtos.Attachment> attachments = body != null ? messageService.parseAttachments(body.get("attachments")) : List.of();
        if ((content.isEmpty() || content.length() > 2000) && attachments.isEmpty()) {
            throw ApiException.badRequest("invalid_content");
        }
        if (content.length() > 2000) throw ApiException.badRequest("invalid_content");
        String replyToId = null;
        if (body != null && body.get("replyToId") instanceof String rid && !rid.isEmpty()) {
            Optional<MessageEntity> target = messages.findById(rid);
            if (target.isPresent() && target.get().getChannelId().equals(dm.getId())
                && target.get().getDeletedAt() == null) {
                replyToId = target.get().getId();
            }
        }
        List<String> rawMentions = body != null ? messageService.parseMentions(body.get("mentions")) : List.of();
        List<String> mentions = messageService.filterMentionsForDm(dm.getId(), rawMentions);

        MessageEntity m = new MessageEntity();
        m.setId(IdGen.newId("m"));
        m.setChannelId(dm.getId());
        m.setAuthorId(me.getId());
        m.setContent(content);
        m.setCreatedAt(IdGen.now());
        m.setReplyToId(replyToId);
        m.setAttachments(attachments.isEmpty() ? null : messageService.toJson(attachments));
        m.setMentions(mentions.isEmpty() ? null : messageService.toJson(mentions));
        m.setKind("default");
        messages.save(m);
        MessageDtos.Message shaped = messageShaper.shape(m);
        realtime.broadcastMessage(dm.getId(), shaped);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", shaped));
    }

    @PatchMapping("/{dmId}/messages/{messageId}")
    @Transactional
    public Map<String, Object> editMessage(@CurrentUser UserEntity me, @PathVariable String dmId,
                                           @PathVariable String messageId,
                                           @RequestBody(required = false) Map<String, Object> body) {
        DmEntity dm = ensureParticipant(dmId, me.getId());
        MessageEntity m = messages.findById(messageId)
            .filter(x -> x.getChannelId().equals(dm.getId()) && x.getDeletedAt() == null)
            .orElseThrow(() -> ApiException.notFound("not_found"));
        if (!m.getAuthorId().equals(me.getId())) throw ApiException.forbidden("forbidden");
        String content = body != null && body.get("content") instanceof String s ? s.trim() : "";
        if (content.isEmpty() || content.length() > 2000) throw ApiException.badRequest("invalid_content");
        List<String> rawMentions = body != null ? messageService.parseMentions(body.get("mentions")) : List.of();
        List<String> mentions = messageService.filterMentionsForDm(dm.getId(), rawMentions);
        m.setContent(content);
        m.setMentions(mentions.isEmpty() ? null : messageService.toJson(mentions));
        m.setEditedAt(IdGen.now());
        messages.save(m);
        MessageDtos.Message shaped = messageShaper.shape(m);
        realtime.broadcastMessageUpdate(dm.getId(), shaped);
        return Map.of("message", shaped);
    }

    @DeleteMapping("/{dmId}/messages/{messageId}")
    @Transactional
    public Map<String, Object> deleteMessage(@CurrentUser UserEntity me, @PathVariable String dmId,
                                             @PathVariable String messageId) {
        DmEntity dm = ensureParticipant(dmId, me.getId());
        MessageEntity m = messages.findById(messageId)
            .filter(x -> x.getChannelId().equals(dm.getId()))
            .orElseThrow(() -> ApiException.notFound("not_found"));
        if (!m.getAuthorId().equals(me.getId())) throw ApiException.forbidden("forbidden");
        if (m.getDeletedAt() != null) return Map.of("ok", true);
        long deletedAt = IdGen.now();
        messages.softDelete(m.getId(), deletedAt);
        reactions.deleteByMessageId(m.getId());
        realtime.broadcastMessageDelete(dm.getId(), m.getId(), deletedAt);
        return Map.of("ok", true);
    }

    @PutMapping("/{dmId}/messages/{messageId}/reactions/{emoji}")
    @Transactional
    public Map<String, Object> addReaction(@CurrentUser UserEntity me, @PathVariable String dmId,
                                           @PathVariable String messageId, @PathVariable String emoji) {
        DmEntity dm = ensureParticipant(dmId, me.getId());
        MessageEntity m = messages.findById(messageId)
            .filter(x -> x.getChannelId().equals(dm.getId()) && x.getDeletedAt() == null)
            .orElseThrow(() -> ApiException.notFound("not_found"));
        String decoded = URLDecoder.decode(emoji, StandardCharsets.UTF_8);
        if (!EmojiValidator.isValid(decoded)) throw ApiException.badRequest("invalid_emoji");
        reactions.save(new MessageReactionEntity(m.getId(), me.getId(), decoded, IdGen.now()));
        realtime.broadcastReaction(dm.getId(), m.getId(), decoded, me.getId(), "add");
        return Map.of("ok", true);
    }

    @DeleteMapping("/{dmId}/messages/{messageId}/reactions/{emoji}")
    @Transactional
    public Map<String, Object> removeReaction(@CurrentUser UserEntity me, @PathVariable String dmId,
                                              @PathVariable String messageId, @PathVariable String emoji) {
        DmEntity dm = ensureParticipant(dmId, me.getId());
        MessageEntity m = messages.findById(messageId)
            .filter(x -> x.getChannelId().equals(dm.getId()))
            .orElseThrow(() -> ApiException.notFound("not_found"));
        String decoded = URLDecoder.decode(emoji, StandardCharsets.UTF_8);
        reactions.deleteOne(m.getId(), me.getId(), decoded);
        realtime.broadcastReaction(dm.getId(), m.getId(), decoded, me.getId(), "remove");
        return Map.of("ok", true);
    }

    @GetMapping("/{dmId}/pins")
    public Map<String, Object> listPins(@CurrentUser UserEntity me, @PathVariable String dmId) {
        DmEntity dm = ensureParticipant(dmId, me.getId());
        List<MessageEntity> rows = messages.listPins(dm.getId());
        return Map.of("messages", messageShaper.shape(rows));
    }

    @PutMapping("/{dmId}/messages/{messageId}/pin")
    @Transactional
    public Map<String, Object> pin(@CurrentUser UserEntity me, @PathVariable String dmId,
                                   @PathVariable String messageId) {
        DmEntity dm = ensureParticipant(dmId, me.getId());
        MessageEntity m = messages.findById(messageId)
            .filter(x -> x.getChannelId().equals(dm.getId()) && x.getDeletedAt() == null)
            .orElseThrow(() -> ApiException.notFound("not_found"));
        boolean wasUnpinned = m.getPinnedAt() == null;
        long pinnedAt = m.getPinnedAt() != null ? m.getPinnedAt() : IdGen.now();
        if (wasUnpinned) {
            messages.setPinnedAt(m.getId(), pinnedAt);
            m.setPinnedAt(pinnedAt);
        }
        realtime.broadcastPin(dm.getId(), m.getId(), pinnedAt);
        if (wasUnpinned) {
            MessageEntity sys = new MessageEntity();
            sys.setId(IdGen.newId("m"));
            sys.setChannelId(dm.getId());
            sys.setAuthorId(me.getId());
            sys.setContent("");
            sys.setCreatedAt(pinnedAt);
            sys.setReplyToId(m.getId());
            sys.setKind("pin");
            messages.save(sys);
            realtime.broadcastMessage(dm.getId(), messageShaper.shape(sys));
        }
        return Map.of("ok", true, "pinnedAt", pinnedAt);
    }

    @DeleteMapping("/{dmId}/messages/{messageId}/pin")
    @Transactional
    public Map<String, Object> unpin(@CurrentUser UserEntity me, @PathVariable String dmId,
                                     @PathVariable String messageId) {
        DmEntity dm = ensureParticipant(dmId, me.getId());
        MessageEntity m = messages.findById(messageId)
            .filter(x -> x.getChannelId().equals(dm.getId()))
            .orElseThrow(() -> ApiException.notFound("not_found"));
        messages.setPinnedAt(m.getId(), null);
        realtime.broadcastPin(dm.getId(), m.getId(), null);
        return Map.of("ok", true);
    }
}
