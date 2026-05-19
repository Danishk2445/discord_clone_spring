package com.mihord.api.message;

import com.mihord.api.message.entity.MessageReactionEntity;
import com.mihord.api.message.entity.MessageReactionId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MessageReactionRepository extends JpaRepository<MessageReactionEntity, MessageReactionId> {

    @Query("SELECT r FROM MessageReactionEntity r WHERE r.id.messageId = :messageId ORDER BY r.createdAt ASC")
    List<MessageReactionEntity> findByMessageId(@Param("messageId") String messageId);

    @Query("SELECT r FROM MessageReactionEntity r WHERE r.id.messageId IN :messageIds ORDER BY r.createdAt ASC")
    List<MessageReactionEntity> findByMessageIds(@Param("messageIds") List<String> messageIds);

    @Modifying
    @Query("DELETE FROM MessageReactionEntity r WHERE r.id.messageId = :messageId")
    int deleteByMessageId(@Param("messageId") String messageId);

    @Modifying
    @Query("DELETE FROM MessageReactionEntity r WHERE r.id.messageId = :messageId AND r.id.userId = :userId AND r.id.emoji = :emoji")
    int deleteOne(@Param("messageId") String messageId, @Param("userId") String userId, @Param("emoji") String emoji);
}
