package com.mihord.api.server;

import com.mihord.api.server.entity.ServerBanEntity;
import com.mihord.api.server.entity.ServerBanId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ServerBanRepository extends JpaRepository<ServerBanEntity, ServerBanId> {

    List<ServerBanEntity> findByIdServerIdOrderByCreatedAtDesc(String serverId);

    @Query("SELECT CASE WHEN COUNT(b) > 0 THEN true ELSE false END FROM ServerBanEntity b " +
           "WHERE b.id.serverId = :serverId AND b.id.userId = :userId")
    boolean isBanned(@Param("serverId") String serverId, @Param("userId") String userId);

    @Modifying
    @Query("DELETE FROM ServerBanEntity b WHERE b.id.serverId = :serverId AND b.id.userId = :userId")
    int deleteOne(@Param("serverId") String serverId, @Param("userId") String userId);
}
