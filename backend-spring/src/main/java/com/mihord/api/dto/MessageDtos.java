package com.mihord.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

public final class MessageDtos {

    public record Attachment(
        String url,
        String name,
        @JsonInclude(JsonInclude.Include.ALWAYS) String contentType,
        @JsonInclude(JsonInclude.Include.ALWAYS) Long size
    ) {}

    public record ReactionSummary(
        String emoji,
        int count,
        List<String> userIds
    ) {}

    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record Message(
        String id,
        String channelId,
        String authorId,
        String content,
        long createdAt,
        Long editedAt,
        Long deletedAt,
        String replyToId,
        List<Attachment> attachments,
        List<String> mentions,
        List<ReactionSummary> reactions,
        Long pinnedAt,
        String kind
    ) {}

    private MessageDtos() {}
}
