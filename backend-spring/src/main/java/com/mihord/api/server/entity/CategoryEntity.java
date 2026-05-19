package com.mihord.api.server.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "categories")
public class CategoryEntity {
    @Id
    @Column(length = 40)
    private String id;

    @Column(name = "server_id", nullable = false, length = 40)
    private String serverId;

    @Column(nullable = false, length = 64)
    private String name;

    @Column(nullable = false)
    private int position;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getServerId() { return serverId; }
    public void setServerId(String serverId) { this.serverId = serverId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }
}
