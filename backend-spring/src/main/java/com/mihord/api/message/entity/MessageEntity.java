package com.mihord.api.message.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Stores both channel messages (channel_id = channels.id) AND DM messages
 * (channel_id = dms.id). There is intentionally no foreign key. Visibility is
 * resolved at the service layer. */
@Entity
@Table(name = "messages")
public class MessageEntity {
    @Id
    @Column(length = 40)
    private String id;

    @Column(name = "channel_id", nullable = false, length = 40)
    private String channelId;

    @Column(name = "author_id", nullable = false, length = 40)
    private String authorId;

    @Column(nullable = false, columnDefinition = "text")
    private String content;

    @Column(name = "created_at", nullable = false)
    private long createdAt;

    @Column(name = "edited_at")
    private Long editedAt;

    @Column(name = "deleted_at")
    private Long deletedAt;

    @Column(name = "reply_to_id", length = 40)
    private String replyToId;

    @Column(columnDefinition = "text")
    private String attachments;

    @Column(columnDefinition = "text")
    private String mentions;

    @Column(name = "pinned_at")
    private Long pinnedAt;

    @Column(nullable = false, length = 16)
    private String kind = "default";

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getChannelId() { return channelId; }
    public void setChannelId(String channelId) { this.channelId = channelId; }
    public String getAuthorId() { return authorId; }
    public void setAuthorId(String authorId) { this.authorId = authorId; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public long getCreatedAt() { return createdAt; }
    public void setCreatedAt(long createdAt) { this.createdAt = createdAt; }
    public Long getEditedAt() { return editedAt; }
    public void setEditedAt(Long editedAt) { this.editedAt = editedAt; }
    public Long getDeletedAt() { return deletedAt; }
    public void setDeletedAt(Long deletedAt) { this.deletedAt = deletedAt; }
    public String getReplyToId() { return replyToId; }
    public void setReplyToId(String replyToId) { this.replyToId = replyToId; }
    public String getAttachments() { return attachments; }
    public void setAttachments(String attachments) { this.attachments = attachments; }
    public String getMentions() { return mentions; }
    public void setMentions(String mentions) { this.mentions = mentions; }
    public Long getPinnedAt() { return pinnedAt; }
    public void setPinnedAt(Long pinnedAt) { this.pinnedAt = pinnedAt; }
    public String getKind() { return kind; }
    public void setKind(String kind) { this.kind = kind; }
}
