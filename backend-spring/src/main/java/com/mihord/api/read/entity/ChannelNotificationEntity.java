package com.mihord.api.read.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "channel_notifications")
public class ChannelNotificationEntity {
    @EmbeddedId
    private ChannelNotificationId id;

    @Column(nullable = false, length = 10)
    private String level;

    public ChannelNotificationEntity() {}
    public ChannelNotificationEntity(String userId, String channelId, String level) {
        this.id = new ChannelNotificationId(userId, channelId);
        this.level = level;
    }

    public ChannelNotificationId getId() { return id; }
    public void setId(ChannelNotificationId id) { this.id = id; }
    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }
}
