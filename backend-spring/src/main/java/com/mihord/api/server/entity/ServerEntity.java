package com.mihord.api.server.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "servers")
public class ServerEntity {
    @Id
    @Column(length = 40)
    private String id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "short", nullable = false, length = 8)
    private String shortName;

    @Column(nullable = false, length = 7)
    private String accent;

    @Column(name = "owner_id", nullable = false, length = 40)
    private String ownerId;

    @Column(name = "icon_url", length = 500)
    private String iconUrl;

    @Column(name = "banner_url", length = 500)
    private String bannerUrl;

    @Column(name = "created_at", nullable = false)
    private long createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getShortName() { return shortName; }
    public void setShortName(String shortName) { this.shortName = shortName; }
    public String getAccent() { return accent; }
    public void setAccent(String accent) { this.accent = accent; }
    public String getOwnerId() { return ownerId; }
    public void setOwnerId(String ownerId) { this.ownerId = ownerId; }
    public String getIconUrl() { return iconUrl; }
    public void setIconUrl(String iconUrl) { this.iconUrl = iconUrl; }
    public String getBannerUrl() { return bannerUrl; }
    public void setBannerUrl(String bannerUrl) { this.bannerUrl = bannerUrl; }
    public long getCreatedAt() { return createdAt; }
    public void setCreatedAt(long createdAt) { this.createdAt = createdAt; }
}
