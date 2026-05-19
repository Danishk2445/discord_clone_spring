package com.mihord.api.friend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FriendshipRepository extends JpaRepository<FriendshipEntity, FriendshipId> {

    @Query("SELECT f FROM FriendshipEntity f WHERE f.id.userId = :userId")
    List<FriendshipEntity> findAllForUser(@Param("userId") String userId);

    @Query("SELECT f FROM FriendshipEntity f WHERE f.id.userId = :userId AND f.id.friendId = :friendId")
    Optional<FriendshipEntity> findOne(@Param("userId") String userId, @Param("friendId") String friendId);

    @Modifying
    @Query("DELETE FROM FriendshipEntity f WHERE f.id.userId = :userId AND f.id.friendId = :friendId")
    int deleteOne(@Param("userId") String userId, @Param("friendId") String friendId);

    @Query("SELECT f.id.friendId FROM FriendshipEntity f WHERE f.id.userId = :userId AND f.status = 'blocked'")
    List<String> findBlockedIds(@Param("userId") String userId);

    @Query("SELECT CASE WHEN COUNT(f) > 0 THEN true ELSE false END FROM FriendshipEntity f " +
           "WHERE f.id.userId = :userId AND f.id.friendId = :friendId AND f.status = 'blocked'")
    boolean isBlocked(@Param("userId") String userId, @Param("friendId") String friendId);
}
