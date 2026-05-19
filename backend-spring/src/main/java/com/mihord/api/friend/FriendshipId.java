package com.mihord.api.friend;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class FriendshipId implements Serializable {
    @Column(name = "user_id", length = 40, nullable = false)
    private String userId;

    @Column(name = "friend_id", length = 40, nullable = false)
    private String friendId;

    public FriendshipId() {}
    public FriendshipId(String userId, String friendId) {
        this.userId = userId;
        this.friendId = friendId;
    }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getFriendId() { return friendId; }
    public void setFriendId(String friendId) { this.friendId = friendId; }

    @Override public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof FriendshipId f)) return false;
        return Objects.equals(userId, f.userId) && Objects.equals(friendId, f.friendId);
    }
    @Override public int hashCode() { return Objects.hash(userId, friendId); }
}
