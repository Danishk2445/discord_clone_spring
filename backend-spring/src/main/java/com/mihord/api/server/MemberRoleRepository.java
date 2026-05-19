package com.mihord.api.server;

import com.mihord.api.server.entity.MemberRoleEntity;
import com.mihord.api.server.entity.MemberRoleId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MemberRoleRepository extends JpaRepository<MemberRoleEntity, MemberRoleId> {

    @Query("SELECT mr.id.roleId FROM MemberRoleEntity mr WHERE mr.id.serverId = :serverId AND mr.id.userId = :userId")
    List<String> findRoleIdsFor(@Param("serverId") String serverId, @Param("userId") String userId);

    @Modifying
    @Query("DELETE FROM MemberRoleEntity mr WHERE mr.id.serverId = :serverId AND mr.id.userId = :userId AND mr.id.roleId = :roleId")
    int deleteOne(@Param("serverId") String serverId, @Param("userId") String userId, @Param("roleId") String roleId);
}
