package com.mihord.api.server.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class ServerBanId implements Serializable {
    @Column(name = "server_id", length = 40, nullable = false)
    private String serverId;

    @Column(name = "user_id", length = 40, nullable = false)
    private String userId;

    public ServerBanId() {}
    public ServerBanId(String serverId, String userId) {
        this.serverId = serverId;
        this.userId = userId;
    }
    public String getServerId() { return serverId; }
    public void setServerId(String serverId) { this.serverId = serverId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    @Override public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ServerBanId i)) return false;
        return Objects.equals(serverId, i.serverId) && Objects.equals(userId, i.userId);
    }
    @Override public int hashCode() { return Objects.hash(serverId, userId); }
}
