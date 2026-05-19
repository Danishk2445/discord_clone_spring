package com.mihord.api.read.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class ReadStateId implements Serializable {
    @Column(name = "user_id", length = 40, nullable = false)
    private String userId;

    @Column(name = "channel_id", length = 40, nullable = false)
    private String channelId;

    public ReadStateId() {}
    public ReadStateId(String userId, String channelId) {
        this.userId = userId;
        this.channelId = channelId;
    }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getChannelId() { return channelId; }
    public void setChannelId(String channelId) { this.channelId = channelId; }

    @Override public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ReadStateId i)) return false;
        return Objects.equals(userId, i.userId) && Objects.equals(channelId, i.channelId);
    }
    @Override public int hashCode() { return Objects.hash(userId, channelId); }
}
