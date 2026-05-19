package com.mihord.api.server.entity;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "member_roles")
public class MemberRoleEntity {
    @EmbeddedId
    private MemberRoleId id;

    public MemberRoleEntity() {}
    public MemberRoleEntity(String serverId, String userId, String roleId) {
        this.id = new MemberRoleId(serverId, userId, roleId);
    }

    public MemberRoleId getId() { return id; }
    public void setId(MemberRoleId id) { this.id = id; }
}
