package com.mihord.api.dm.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "dms")
public class DmEntity {
    @Id
    @Column(length = 40)
    private String id;

    @Column(name = "is_group", nullable = false)
    private boolean group;

    @Column(name = "group_name", length = 120)
    private String groupName;

    @Column(name = "created_at", nullable = false)
    private long createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public boolean isGroup() { return group; }
    public void setGroup(boolean group) { this.group = group; }
    public String getGroupName() { return groupName; }
    public void setGroupName(String groupName) { this.groupName = groupName; }
    public long getCreatedAt() { return createdAt; }
    public void setCreatedAt(long createdAt) { this.createdAt = createdAt; }
}
