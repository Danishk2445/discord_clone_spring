package com.mihord.api.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class UserEntity {
    @Id
    @Column(length = 40)
    private String id;

    @Column(nullable = false, unique = true, length = 190)
    private String email;

    @Column(name = "password_hash", nullable = false, columnDefinition = "text")
    private String passwordHash;

    @Column(nullable = false, length = 64)
    private String username;

    @Column(name = "display_name", length = 64)
    private String displayName;

    @Column(nullable = false, length = 4)
    private String discriminator;

    @Column(name = "avatar_color", nullable = false, length = 7)
    private String avatarColor;

    @Column(name = "avatar_url", columnDefinition = "text")
    private String avatarUrl;

    @Column(length = 190)
    private String bio;

    @Column(nullable = false, length = 10)
    private String status = "online";

    @Column(name = "created_at", nullable = false)
    private long createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public String getDiscriminator() { return discriminator; }
    public void setDiscriminator(String discriminator) { this.discriminator = discriminator; }
    public String getAvatarColor() { return avatarColor; }
    public void setAvatarColor(String avatarColor) { this.avatarColor = avatarColor; }
    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public long getCreatedAt() { return createdAt; }
    public void setCreatedAt(long createdAt) { this.createdAt = createdAt; }
}
