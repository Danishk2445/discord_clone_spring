package com.mihord.api.server.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "server_bans")
public class ServerBanEntity {
    @EmbeddedId
    private ServerBanId id;

    @Column(name = "banned_by", nullable = false, length = 40)
    private String bannedBy;

    @Column(length = 300)
    private String reason;

    @Column(name = "created_at", nullable = false)
    private long createdAt;

    public ServerBanEntity() {}
    public ServerBanEntity(String serverId, String userId, String bannedBy, String reason, long createdAt) {
        this.id = new ServerBanId(serverId, userId);
        this.bannedBy = bannedBy;
        this.reason = reason;
        this.createdAt = createdAt;
    }

    public ServerBanId getId() { return id; }
    public void setId(ServerBanId id) { this.id = id; }
    public String getBannedBy() { return bannedBy; }
    public void setBannedBy(String bannedBy) { this.bannedBy = bannedBy; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public long getCreatedAt() { return createdAt; }
    public void setCreatedAt(long createdAt) { this.createdAt = createdAt; }
}
