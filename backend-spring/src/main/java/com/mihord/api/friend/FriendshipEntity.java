package com.mihord.api.friend;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "friendships")
public class FriendshipEntity {

    @EmbeddedId
    private FriendshipId id;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "created_at", nullable = false)
    private long createdAt;

    public FriendshipEntity() {}

    public FriendshipEntity(String userId, String friendId, String status, long createdAt) {
        this.id = new FriendshipId(userId, friendId);
        this.status = status;
        this.createdAt = createdAt;
    }

    public FriendshipId getId() { return id; }
    public void setId(FriendshipId id) { this.id = id; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public long getCreatedAt() { return createdAt; }
    public void setCreatedAt(long createdAt) { this.createdAt = createdAt; }

    public String getUserId() { return id.getUserId(); }
    public String getFriendId() { return id.getFriendId(); }
}
