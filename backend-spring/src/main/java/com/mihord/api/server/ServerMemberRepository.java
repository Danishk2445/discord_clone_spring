package com.mihord.api.server;

import com.mihord.api.server.entity.ServerMemberEntity;
import com.mihord.api.server.entity.ServerMemberId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ServerMemberRepository extends JpaRepository<ServerMemberEntity, ServerMemberId> {

    @Query("SELECT m.id.userId FROM ServerMemberEntity m WHERE m.id.serverId = :serverId")
    List<String> findUserIdsByServer(@Param("serverId") String serverId);

    @Query("SELECT CASE WHEN COUNT(m) > 0 THEN true ELSE false END FROM ServerMemberEntity m " +
           "WHERE m.id.serverId = :serverId AND m.id.userId = :userId")
    boolean isMember(@Param("serverId") String serverId, @Param("userId") String userId);

    @Modifying
    @Query("DELETE FROM ServerMemberEntity m WHERE m.id.serverId = :serverId AND m.id.userId = :userId")
    int deleteOne(@Param("serverId") String serverId, @Param("userId") String userId);
}
