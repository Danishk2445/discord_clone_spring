package com.mihord.api.message;

import com.mihord.api.message.entity.MessageEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MessageRepository extends JpaRepository<MessageEntity, String> {

    @Query(value = "SELECT * FROM messages WHERE channel_id = :channelId ORDER BY created_at ASC LIMIT 200", nativeQuery = true)
    List<MessageEntity> listByChannel(@Param("channelId") String channelId);

    @Query(value = "SELECT * FROM messages WHERE channel_id = :channelId AND deleted_at IS NULL AND LOWER(content) LIKE :like ESCAPE '\\' ORDER BY created_at DESC LIMIT 100", nativeQuery = true)
    List<MessageEntity> searchInChannel(@Param("channelId") String channelId, @Param("like") String like);

    @Query(value = "SELECT * FROM messages WHERE channel_id = :channelId AND deleted_at IS NULL AND author_id = :authorId AND LOWER(content) LIKE :like ESCAPE '\\' ORDER BY created_at DESC LIMIT 100", nativeQuery = true)
    List<MessageEntity> searchInChannelByAuthor(@Param("channelId") String channelId, @Param("authorId") String authorId, @Param("like") String like);

    @Query(value = "SELECT * FROM messages WHERE channel_id = :channelId AND pinned_at IS NOT NULL AND deleted_at IS NULL ORDER BY pinned_at DESC LIMIT 50", nativeQuery = true)
    List<MessageEntity> listPins(@Param("channelId") String channelId);

    @Modifying
    @Query(value = "UPDATE messages SET deleted_at = :ts, content = '', attachments = NULL, mentions = NULL WHERE id = :id", nativeQuery = true)
    int softDelete(@Param("id") String id, @Param("ts") long ts);

    @Modifying
    @Query(value = "UPDATE messages SET pinned_at = :ts WHERE id = :id", nativeQuery = true)
    int setPinnedAt(@Param("id") String id, @Param("ts") Long ts);

    @Query(value = """
        SELECT COUNT(*) FROM messages
        WHERE channel_id = :channelId
          AND deleted_at IS NULL
          AND author_id != :userId
          AND created_at > :lastReadAt
        """, nativeQuery = true)
    long countUnread(@Param("channelId") String channelId, @Param("userId") String userId, @Param("lastReadAt") long lastReadAt);

    @Query(value = """
        SELECT mentions FROM messages
        WHERE channel_id = :channelId
          AND deleted_at IS NULL
          AND author_id != :userId
          AND created_at > :lastReadAt
          AND mentions IS NOT NULL
        """, nativeQuery = true)
    List<String> mentionsForUnread(@Param("channelId") String channelId, @Param("userId") String userId, @Param("lastReadAt") long lastReadAt);

    @Query(value = """
        SELECT m.* FROM messages m
        WHERE m.deleted_at IS NULL
          AND m.mentions IS NOT NULL
          AND m.author_id != :userId
          AND (
            EXISTS (
              SELECT 1 FROM channels c
                JOIN server_members sm ON sm.server_id = c.server_id
              WHERE c.id = m.channel_id AND sm.user_id = :userId
            )
            OR EXISTS (
              SELECT 1 FROM dm_participants dp
              WHERE dp.dm_id = m.channel_id AND dp.user_id = :userId
            )
          )
        ORDER BY m.created_at DESC LIMIT 200
        """, nativeQuery = true)
    List<MessageEntity> recentMentionsForUser(@Param("userId") String userId);
}
