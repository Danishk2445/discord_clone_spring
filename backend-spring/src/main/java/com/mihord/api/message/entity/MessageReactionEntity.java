package com.mihord.api.message.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "message_reactions")
public class MessageReactionEntity {
    @EmbeddedId
    private MessageReactionId id;

    @Column(name = "created_at", nullable = false)
    private long createdAt;

    public MessageReactionEntity() {}
    public MessageReactionEntity(String messageId, String userId, String emoji, long createdAt) {
        this.id = new MessageReactionId(messageId, userId, emoji);
        this.createdAt = createdAt;
    }

    public MessageReactionId getId() { return id; }
    public void setId(MessageReactionId id) { this.id = id; }
    public long getCreatedAt() { return createdAt; }
    public void setCreatedAt(long createdAt) { this.createdAt = createdAt; }
}
