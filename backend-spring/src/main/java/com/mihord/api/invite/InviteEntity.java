package com.mihord.api.invite;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "invites")
public class InviteEntity {
    @Id
    @Column(length = 16)
    private String code;

    @Column(name = "server_id", nullable = false, length = 40)
    private String serverId;

    @Column(name = "inviter_id", nullable = false, length = 40)
    private String inviterId;

    @Column(name = "created_at", nullable = false)
    private long createdAt;

    @Column(name = "expires_at")
    private Long expiresAt;

    @Column(nullable = false)
    private int uses;

    @Column(name = "max_uses")
    private Integer maxUses;

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getServerId() { return serverId; }
    public void setServerId(String serverId) { this.serverId = serverId; }
    public String getInviterId() { return inviterId; }
    public void setInviterId(String inviterId) { this.inviterId = inviterId; }
    public long getCreatedAt() { return createdAt; }
    public void setCreatedAt(long createdAt) { this.createdAt = createdAt; }
    public Long getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Long expiresAt) { this.expiresAt = expiresAt; }
    public int getUses() { return uses; }
    public void setUses(int uses) { this.uses = uses; }
    public Integer getMaxUses() { return maxUses; }
    public void setMaxUses(Integer maxUses) { this.maxUses = maxUses; }
}
