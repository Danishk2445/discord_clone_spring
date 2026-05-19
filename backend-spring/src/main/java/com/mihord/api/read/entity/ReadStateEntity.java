package com.mihord.api.read.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "read_state")
public class ReadStateEntity {
    @EmbeddedId
    private ReadStateId id;

    @Column(name = "last_read_at", nullable = false)
    private long lastReadAt;

    public ReadStateEntity() {}
    public ReadStateEntity(String userId, String channelId, long lastReadAt) {
        this.id = new ReadStateId(userId, channelId);
        this.lastReadAt = lastReadAt;
    }

    public ReadStateId getId() { return id; }
    public void setId(ReadStateId id) { this.id = id; }
    public long getLastReadAt() { return lastReadAt; }
    public void setLastReadAt(long lastReadAt) { this.lastReadAt = lastReadAt; }
}
