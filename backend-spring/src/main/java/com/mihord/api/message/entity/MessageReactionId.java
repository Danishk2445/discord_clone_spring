package com.mihord.api.message.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class MessageReactionId implements Serializable {
    @Column(name = "message_id", length = 40, nullable = false)
    private String messageId;

    @Column(name = "user_id", length = 40, nullable = false)
    private String userId;

    @Column(length = 80, nullable = false)
    private String emoji;

    public MessageReactionId() {}
    public MessageReactionId(String messageId, String userId, String emoji) {
        this.messageId = messageId;
        this.userId = userId;
        this.emoji = emoji;
    }
    public String getMessageId() { return messageId; }
    public void setMessageId(String messageId) { this.messageId = messageId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getEmoji() { return emoji; }
    public void setEmoji(String emoji) { this.emoji = emoji; }

    @Override public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof MessageReactionId r)) return false;
        return Objects.equals(messageId, r.messageId) && Objects.equals(userId, r.userId) && Objects.equals(emoji, r.emoji);
    }
    @Override public int hashCode() { return Objects.hash(messageId, userId, emoji); }
}
