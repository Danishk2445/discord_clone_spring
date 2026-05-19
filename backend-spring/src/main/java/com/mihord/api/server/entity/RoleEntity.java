package com.mihord.api.server.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "roles")
public class RoleEntity {
    @Id
    @Column(length = 40)
    private String id;

    @Column(name = "server_id", nullable = false, length = 40)
    private String serverId;

    @Column(nullable = false, length = 64)
    private String name;

    @Column(nullable = false, length = 7)
    private String color = "#9aa3a1";

    @Column(nullable = false)
    private int permissions;

    @Column(nullable = false)
    private int position;

    @Column(name = "is_everyone", nullable = false)
    private boolean isEveryone;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getServerId() { return serverId; }
    public void setServerId(String serverId) { this.serverId = serverId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public int getPermissions() { return permissions; }
    public void setPermissions(int permissions) { this.permissions = permissions; }
    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }
    public boolean isEveryone() { return isEveryone; }
    public void setEveryone(boolean everyone) { isEveryone = everyone; }
}
