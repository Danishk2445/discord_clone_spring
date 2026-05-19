package com.mihord.api.server.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class MemberRoleId implements Serializable {
    @Column(name = "server_id", length = 40, nullable = false)
    private String serverId;

    @Column(name = "user_id", length = 40, nullable = false)
    private String userId;

    @Column(name = "role_id", length = 40, nullable = false)
    private String roleId;

    public MemberRoleId() {}
    public MemberRoleId(String serverId, String userId, String roleId) {
        this.serverId = serverId;
        this.userId = userId;
        this.roleId = roleId;
    }
    public String getServerId() { return serverId; }
    public void setServerId(String serverId) { this.serverId = serverId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getRoleId() { return roleId; }
    public void setRoleId(String roleId) { this.roleId = roleId; }

    @Override public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof MemberRoleId m)) return false;
        return Objects.equals(serverId, m.serverId) && Objects.equals(userId, m.userId) && Objects.equals(roleId, m.roleId);
    }
    @Override public int hashCode() { return Objects.hash(serverId, userId, roleId); }
}
