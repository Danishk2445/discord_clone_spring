package com.mihord.api.server.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "channels")
public class ChannelEntity {
    @Id
    @Column(length = 40)
    private String id;

    @Column(name = "server_id", nullable = false, length = 40)
    private String serverId;

    @Column(name = "category_id", nullable = false, length = 40)
    private String categoryId;

    @Column(nullable = false, length = 64)
    private String name;

    @Column(nullable = false, length = 10)
    private String kind;

    @Column(length = 300)
    private String topic;

    @Column(nullable = false)
    private int position;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getServerId() { return serverId; }
    public void setServerId(String serverId) { this.serverId = serverId; }
    public String getCategoryId() { return categoryId; }
    public void setCategoryId(String categoryId) { this.categoryId = categoryId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getKind() { return kind; }
    public void setKind(String kind) { this.kind = kind; }
    public String getTopic() { return topic; }
    public void setTopic(String topic) { this.topic = topic; }
    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }
}
