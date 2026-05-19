package com.mihord.api.channel;

import com.mihord.api.auth.CurrentUser;
import com.mihord.api.dto.MessageDtos;
import com.mihord.api.error.ApiException;
import com.mihord.api.message.MessageRepository;
import com.mihord.api.message.MessageReactionRepository;
import com.mihord.api.message.MessageService;
import com.mihord.api.message.MessageShaper;
import com.mihord.api.message.entity.MessageEntity;
import com.mihord.api.message.entity.MessageReactionEntity;
import com.mihord.api.perm.Permissions;
import com.mihord.api.read.ReadStateRepository;
import com.mihord.api.read.entity.ReadStateEntity;
import com.mihord.api.read.entity.ReadStateId;
import com.mihord.api.server.ChannelRepository;
import com.mihord.api.server.ServerShaper;
import com.mihord.api.server.entity.ChannelEntity;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/channels")
public class ChannelController {

    private static final Pattern CHANNEL_NAME = Pattern.compile("^[a-z0-9-]{2,32}$");

    private final ChannelRepository channels;
    private final MessageRepository messages;
    private final MessageReactionRepository reactions;
    private final MessageService messageService;
    private final MessageShaper shaper;
    private final ReadStateRepository readStates;
    private final ServerShaper serverShaper;
    private final Permissions perms;
    private final RealtimeRegistry realtime;

    public ChannelController(ChannelRepository channels, MessageRepository messages,
                             MessageReactionRepository reactions, MessageService messageService,
                             MessageShaper shaper, ReadStateRepository readStates,
                             ServerShaper serverShaper, Permissions perms,
                             RealtimeRegistry realtime) {
        this.channels = channels;
        this.messages = messages;
        this.reactions = reactions;
        this.messageService = messageService;
        this.shaper = shaper;
        this.readStates = readStates;
        this.serverShaper = serverShaper;
        this.perms = perms;
        this.realtime = realtime;
    }

    private ChannelEntity load(String channelId, String userId) {
        ChannelEntity c = channels.findById(channelId).orElseThrow(() -> ApiException.notFound("not_found"));
        if (!perms.isServerMember(c.getServerId(), userId)) throw ApiException.forbidden("forbidden");
        return c;
    }

    @GetMapping("/{channelId}")
    public Map<String, Object> get(@CurrentUser UserEntity me, @PathVariable String channelId) {
        ChannelEntity c = load(channelId, me.getId());
        return Map.of("channel", serverShaper.toChannel(c));
    }

    @PatchMapping("/{channelId}")
    @Transactional
    public Map<String, Object> patch(@CurrentUser UserEntity me, @PathVariable String channelId,
                                     @RequestBody(required = false) Map<String, Object> body) {
        ChannelEntity c = channels.findById(channelId).orElseThrow(() -> ApiException.notFound("not_found"));
        perms.requirePerm(c.getServerId(), me.getId(), Permissions.MANAGE_CHANNELS);
        if (body == null) body = Map.of();
        if (body.get("name") instanceof String n) {
            String nextName = n.trim().toLowerCase();
            if (!CHANNEL_NAME.matcher(nextName).matches()) throw ApiException.badRequest("invalid_name");
            c.setName(nextName);
        }
        if (body.containsKey("topic")) {
            Object v = body.get("topic");
            if (v == null || (v instanceof String s && s.trim().isEmpty())) {
                c.setTopic(null);
            } else if (v instanceof String s) {
                String t = s.trim();
                if (t.length() > 200) t = t.substring(0, 200);
                c.setTopic(t.isEmpty() ? null : t);
            }
        }
        channels.save(c);
        return Map.of("channel", serverShaper.toChannel(c));
    }

    @DeleteMapping("/{channelId}")
    @Transactional
    public Map<String, Object> delete(@CurrentUser UserEntity me, @PathVariable String channelId) {
        ChannelEntity c = channels.findById(channelId).orElseThrow(() -> ApiException.notFound("not_found"));
        perms.requirePerm(c.getServerId(), me.getId(), Permissions.MANAGE_CHANNELS);
        channels.delete(c);
        return Map.of("ok", true);
    }

    // ---- Messages ---------------------------------------------------------

    @GetMapping("/{channelId}/messages")
    public Map<String, Object> listMessages(@CurrentUser UserEntity me, @PathVariable String channelId) {
        ChannelEntity c = load(channelId, me.getId());
        List<MessageEntity> rows = messages.listByChannel(c.getId());
        Optional<ReadStateEntity> rs = readStates.findById(new ReadStateId(me.getId(), c.getId()));
        Map<String, Object> out = new HashMap<>();
        out.put("messages", shaper.shape(rows));
        out.put("lastReadAt", rs.map(ReadStateEntity::getLastReadAt).orElse(0L));
        return out;
    }

    @GetMapping("/{channelId}/messages/search")
    public Map<String, Object> search(@CurrentUser UserEntity me, @PathVariable String channelId,
                                      @RequestParam(value = "q", required = false) String q,
                                      @RequestParam(value = "from", required = false) String from) {
        ChannelEntity c = load(channelId, me.getId());
        String query = q != null ? q.trim() : "";
        if (query.isEmpty() || query.length() > 200) return Map.of("messages", List.of());
        String like = "%" + escapeLike(query.toLowerCase()) + "%";
        List<MessageEntity> rows = (from != null && !from.isEmpty())
            ? messages.searchInChannelByAuthor(c.getId(), from, like)
            : messages.searchInChannel(c.getId(), like);
        return Map.of("messages", shaper.shape(rows));
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

    @PostMapping("/{channelId}/messages")
    @Transactional
    public ResponseEntity<Map<String, Object>> sendMessage(@CurrentUser UserEntity me,
                                                           @PathVariable String channelId,
                                                           @RequestBody(required = false) Map<String, Object> body) {
        ChannelEntity c = load(channelId, me.getId());
        if (!"text".equals(c.getKind())) throw ApiException.badRequest("not_text_channel");

        String content = body != null && body.get("content") instanceof String s ? s.trim() : "";
        List<MessageDtos.Attachment> attachments = body != null ? messageService.parseAttachments(body.get("attachments")) : List.of();
        if ((content.isEmpty() || content.length() > 2000) && attachments.isEmpty()) {
            throw ApiException.badRequest("invalid_content");
        }
        if (content.length() > 2000) throw ApiException.badRequest("invalid_content");

        String replyToId = null;
        if (body != null && body.get("replyToId") instanceof String rid && !rid.isEmpty()) {
            Optional<MessageEntity> target = messages.findById(rid);
            if (target.isPresent() && target.get().getChannelId().equals(c.getId())
                && target.get().getDeletedAt() == null) {
                replyToId = target.get().getId();
            }
        }

        boolean canMentionEveryone = perms.hasPerm(c.getServerId(), me.getId(), Permissions.MENTION_EVERYONE);
        List<String> rawMentions = body != null ? messageService.parseMentions(body.get("mentions")) : List.of();
        List<String> mentions = messageService.filterMentionsForServer(c.getServerId(), rawMentions, canMentionEveryone);

        MessageEntity m = new MessageEntity();
        m.setId(IdGen.newId("m"));
        m.setChannelId(c.getId());
        m.setAuthorId(me.getId());
        m.setContent(content);
        m.setCreatedAt(IdGen.now());
        m.setReplyToId(replyToId);
        m.setAttachments(attachments.isEmpty() ? null : messageService.toJson(attachments));
        m.setMentions(mentions.isEmpty() ? null : messageService.toJson(mentions));
        m.setKind("default");
        messages.save(m);

        MessageDtos.Message shaped = shaper.shape(m);
        realtime.broadcastMessage(c.getId(), shaped);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", shaped));
    }

    @PatchMapping("/{channelId}/messages/{messageId}")
    @Transactional
    public Map<String, Object> editMessage(@CurrentUser UserEntity me, @PathVariable String channelId,
                                           @PathVariable String messageId,
                                           @RequestBody(required = false) Map<String, Object> body) {
        ChannelEntity c = load(channelId, me.getId());
        MessageEntity m = messages.findById(messageId)
            .filter(x -> x.getChannelId().equals(c.getId()) && x.getDeletedAt() == null)
            .orElseThrow(() -> ApiException.notFound("not_found"));
        if (!m.getAuthorId().equals(me.getId())) throw ApiException.forbidden("forbidden");
        String content = body != null && body.get("content") instanceof String s ? s.trim() : "";
        if (content.isEmpty() || content.length() > 2000) throw ApiException.badRequest("invalid_content");

        boolean canMentionEveryone = perms.hasPerm(c.getServerId(), me.getId(), Permissions.MENTION_EVERYONE);
        List<String> rawMentions = body != null ? messageService.parseMentions(body.get("mentions")) : List.of();
        List<String> mentions = messageService.filterMentionsForServer(c.getServerId(), rawMentions, canMentionEveryone);
        m.setContent(content);
        m.setMentions(mentions.isEmpty() ? null : messageService.toJson(mentions));
        m.setEditedAt(IdGen.now());
        messages.save(m);

        MessageDtos.Message shaped = shaper.shape(m);
        realtime.broadcastMessageUpdate(c.getId(), shaped);
        return Map.of("message", shaped);
    }

    @DeleteMapping("/{channelId}/messages/{messageId}")
    @Transactional
    public Map<String, Object> deleteMessage(@CurrentUser UserEntity me, @PathVariable String channelId,
                                             @PathVariable String messageId) {
        ChannelEntity c = load(channelId, me.getId());
        MessageEntity m = messages.findById(messageId)
            .filter(x -> x.getChannelId().equals(c.getId()))
            .orElseThrow(() -> ApiException.notFound("not_found"));
        boolean canManage = perms.hasPerm(c.getServerId(), me.getId(), Permissions.MANAGE_MESSAGES);
        if (!m.getAuthorId().equals(me.getId()) && !canManage) throw ApiException.forbidden("forbidden");
        if (m.getDeletedAt() != null) return Map.of("ok", true);
        long deletedAt = IdGen.now();
        messages.softDelete(m.getId(), deletedAt);
        reactions.deleteByMessageId(m.getId());
        realtime.broadcastMessageDelete(c.getId(), m.getId(), deletedAt);
        return Map.of("ok", true);
    }

    @PutMapping("/{channelId}/messages/{messageId}/reactions/{emoji}")
    @Transactional
    public Map<String, Object> addReaction(@CurrentUser UserEntity me, @PathVariable String channelId,
                                           @PathVariable String messageId, @PathVariable String emoji) {
        ChannelEntity c = load(channelId, me.getId());
        MessageEntity m = messages.findById(messageId)
            .filter(x -> x.getChannelId().equals(c.getId()) && x.getDeletedAt() == null)
            .orElseThrow(() -> ApiException.notFound("not_found"));
        String decoded = URLDecoder.decode(emoji, StandardCharsets.UTF_8);
        if (!EmojiValidator.isValid(decoded)) throw ApiException.badRequest("invalid_emoji");
        reactions.save(new MessageReactionEntity(m.getId(), me.getId(), decoded, IdGen.now()));
        realtime.broadcastReaction(c.getId(), m.getId(), decoded, me.getId(), "add");
        return Map.of("ok", true);
    }

    @DeleteMapping("/{channelId}/messages/{messageId}/reactions/{emoji}")
    @Transactional
    public Map<String, Object> removeReaction(@CurrentUser UserEntity me, @PathVariable String channelId,
                                              @PathVariable String messageId, @PathVariable String emoji) {
        ChannelEntity c = load(channelId, me.getId());
        MessageEntity m = messages.findById(messageId)
            .filter(x -> x.getChannelId().equals(c.getId()))
            .orElseThrow(() -> ApiException.notFound("not_found"));
        String decoded = URLDecoder.decode(emoji, StandardCharsets.UTF_8);
        reactions.deleteOne(m.getId(), me.getId(), decoded);
        realtime.broadcastReaction(c.getId(), m.getId(), decoded, me.getId(), "remove");
        return Map.of("ok", true);
    }

    @GetMapping("/{channelId}/pins")
    public Map<String, Object> listPins(@CurrentUser UserEntity me, @PathVariable String channelId) {
        ChannelEntity c = load(channelId, me.getId());
        List<MessageEntity> rows = messages.listPins(c.getId());
        return Map.of("messages", shaper.shape(rows));
    }

    @PutMapping("/{channelId}/messages/{messageId}/pin")
    @Transactional
    public Map<String, Object> pin(@CurrentUser UserEntity me, @PathVariable String channelId,
                                   @PathVariable String messageId) {
        ChannelEntity c = load(channelId, me.getId());
        perms.requirePerm(c.getServerId(), me.getId(), Permissions.MANAGE_MESSAGES);
        MessageEntity m = messages.findById(messageId)
            .filter(x -> x.getChannelId().equals(c.getId()) && x.getDeletedAt() == null)
            .orElseThrow(() -> ApiException.notFound("not_found"));
        boolean wasUnpinned = m.getPinnedAt() == null;
        long pinnedAt = m.getPinnedAt() != null ? m.getPinnedAt() : IdGen.now();
        if (wasUnpinned) {
            messages.setPinnedAt(m.getId(), pinnedAt);
            m.setPinnedAt(pinnedAt);
        }
        realtime.broadcastPin(c.getId(), m.getId(), pinnedAt);
        if (wasUnpinned) {
            MessageEntity sys = new MessageEntity();
            sys.setId(IdGen.newId("m"));
            sys.setChannelId(c.getId());
            sys.setAuthorId(me.getId());
            sys.setContent("");
            sys.setCreatedAt(pinnedAt);
            sys.setReplyToId(m.getId());
            sys.setKind("pin");
            messages.save(sys);
            realtime.broadcastMessage(c.getId(), shaper.shape(sys));
        }
        return Map.of("ok", true, "pinnedAt", pinnedAt);
    }

    @DeleteMapping("/{channelId}/messages/{messageId}/pin")
    @Transactional
    public Map<String, Object> unpin(@CurrentUser UserEntity me, @PathVariable String channelId,
                                     @PathVariable String messageId) {
        ChannelEntity c = load(channelId, me.getId());
        perms.requirePerm(c.getServerId(), me.getId(), Permissions.MANAGE_MESSAGES);
        MessageEntity m = messages.findById(messageId)
            .filter(x -> x.getChannelId().equals(c.getId()))
            .orElseThrow(() -> ApiException.notFound("not_found"));
        messages.setPinnedAt(m.getId(), null);
        realtime.broadcastPin(c.getId(), m.getId(), null);
        return Map.of("ok", true);
    }
}
