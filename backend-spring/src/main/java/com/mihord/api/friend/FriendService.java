package com.mihord.api.friend;

import org.springframework.stereotype.Service;

import java.util.List;

/** Block & friendship helpers. Mirrors backend/src/lib/blocks.ts. */
@Service
public class FriendService {

    private final FriendshipRepository friendships;

    public FriendService(FriendshipRepository friendships) {
        this.friendships = friendships;
    }

    public boolean hasBlocked(String blockerId, String blockedId) {
        return friendships.isBlocked(blockerId, blockedId);
    }

    public boolean isBlockedBetween(String a, String b) {
        return hasBlocked(a, b) || hasBlocked(b, a);
    }

    public List<String> blockedUserIds(String userId) {
        return friendships.findBlockedIds(userId);
    }
}
