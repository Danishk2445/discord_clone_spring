package com.mihord.api.server;

import com.mihord.api.server.entity.ChannelEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChannelRepository extends JpaRepository<ChannelEntity, String> {
    List<ChannelEntity> findByServerIdOrderByPositionAsc(String serverId);
    List<ChannelEntity> findByCategoryId(String categoryId);

    @org.springframework.data.jpa.repository.Query(
        "SELECT c FROM ChannelEntity c JOIN ServerMemberEntity m ON m.id.serverId = c.serverId " +
        "WHERE m.id.userId = :userId AND c.kind = 'text'")
    List<ChannelEntity> findTextChannelsForUser(@org.springframework.data.repository.query.Param("userId") String userId);
}
