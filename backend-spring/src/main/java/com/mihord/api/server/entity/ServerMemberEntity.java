package com.mihord.api.server.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "server_members")
public class ServerMemberEntity {
    @EmbeddedId
    private ServerMemberId id;

    @Column(name = "joined_at", nullable = false)
    private long joinedAt;

    public ServerMemberEntity() {}
    public ServerMemberEntity(String serverId, String userId, long joinedAt) {
        this.id = new ServerMemberId(serverId, userId);
        this.joinedAt = joinedAt;
    }

    public ServerMemberId getId() { return id; }
    public void setId(ServerMemberId id) { this.id = id; }
    public long getJoinedAt() { return joinedAt; }
    public void setJoinedAt(long joinedAt) { this.joinedAt = joinedAt; }
}
