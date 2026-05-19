package com.mihord.api.server;

import com.mihord.api.server.entity.ServerEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ServerRepository extends JpaRepository<ServerEntity, String> {

    @Query("SELECT s FROM ServerEntity s JOIN ServerMemberEntity m ON m.id.serverId = s.id " +
           "WHERE m.id.userId = :userId ORDER BY s.createdAt ASC")
    List<ServerEntity> findForMember(@Param("userId") String userId);
}
