package com.mihord.api.message;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mihord.api.dto.MessageDtos;
import com.mihord.api.message.entity.MessageEntity;
import com.mihord.api.message.entity.MessageReactionEntity;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Mirrors backend/src/lib/shapes.ts:toMessage + lib/messages.ts. */
@Component
public class MessageShaper {

    private final ObjectMapper mapper;
    private final MessageReactionRepository reactions;

    public MessageShaper(ObjectMapper mapper, MessageReactionRepository reactions) {
        this.mapper = mapper;
        this.reactions = reactions;
    }

    public MessageDtos.Message shape(MessageEntity m) {
        return toShape(m, reactions.findByMessageId(m.getId()));
    }

    public List<MessageDtos.Message> shape(List<MessageEntity> messages) {
        if (messages.isEmpty()) return List.of();
        List<String> ids = messages.stream().map(MessageEntity::getId).toList();
        List<MessageReactionEntity> all = reactions.findByMessageIds(ids);
        Map<String, List<MessageReactionEntity>> grouped = new HashMap<>();
        for (MessageReactionEntity r : all) {
            grouped.computeIfAbsent(r.getId().getMessageId(), k -> new ArrayList<>()).add(r);
        }
        List<MessageDtos.Message> out = new ArrayList<>(messages.size());
        for (MessageEntity m : messages) {
            out.add(toShape(m, grouped.getOrDefault(m.getId(), List.of())));
        }
        return out;
    }

    private MessageDtos.Message toShape(MessageEntity m, List<MessageReactionEntity> rxs) {
        boolean deleted = m.getDeletedAt() != null;
        LinkedHashMap<String, MessageDtos.ReactionSummary> bucket = new LinkedHashMap<>();
        for (MessageReactionEntity r : rxs) {
            MessageDtos.ReactionSummary existing = bucket.get(r.getId().getEmoji());
            if (existing == null) {
                List<String> ids = new ArrayList<>();
                ids.add(r.getId().getUserId());
                bucket.put(r.getId().getEmoji(), new MessageDtos.ReactionSummary(r.getId().getEmoji(), 1, ids));
            } else {
                List<String> ids = new ArrayList<>(existing.userIds());
                ids.add(r.getId().getUserId());
                bucket.put(r.getId().getEmoji(),
                    new MessageDtos.ReactionSummary(existing.emoji(), existing.count() + 1, ids));
            }
        }
        List<MessageDtos.Attachment> attachments = deleted ? List.of() : parseAttachments(m.getAttachments());
        List<String> mentions = deleted ? List.of() : parseStringList(m.getMentions());
        List<MessageDtos.ReactionSummary> reactionsOut = deleted ? List.of() : new ArrayList<>(bucket.values());
        return new MessageDtos.Message(
            m.getId(),
            m.getChannelId(),
            m.getAuthorId(),
            deleted ? "" : m.getContent(),
            m.getCreatedAt(),
            m.getEditedAt(),
            m.getDeletedAt(),
            m.getReplyToId(),
            attachments,
            mentions,
            reactionsOut,
            deleted ? null : m.getPinnedAt(),
            m.getKind() != null ? m.getKind() : "default"
        );
    }

    private List<MessageDtos.Attachment> parseAttachments(String raw) {
        if (raw == null || raw.isEmpty()) return List.of();
        try {
            return mapper.readValue(raw, new TypeReference<List<MessageDtos.Attachment>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    private List<String> parseStringList(String raw) {
        if (raw == null || raw.isEmpty()) return List.of();
        try {
            return mapper.readValue(raw, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }
}
