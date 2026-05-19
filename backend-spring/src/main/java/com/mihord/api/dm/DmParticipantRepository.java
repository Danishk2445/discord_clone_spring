package com.mihord.api.dm;

import com.mihord.api.dm.entity.DmParticipantEntity;
import com.mihord.api.dm.entity.DmParticipantId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DmParticipantRepository extends JpaRepository<DmParticipantEntity, DmParticipantId> {

    @Query("SELECT p.id.userId FROM DmParticipantEntity p WHERE p.id.dmId = :dmId")
    List<String> findUserIdsByDm(@Param("dmId") String dmId);

    @Query("SELECT p.id.dmId FROM DmParticipantEntity p WHERE p.id.userId = :userId")
    List<String> findDmIdsByUser(@Param("userId") String userId);

    @Query("SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END FROM DmParticipantEntity p " +
           "WHERE p.id.dmId = :dmId AND p.id.userId = :userId")
    boolean isParticipant(@Param("dmId") String dmId, @Param("userId") String userId);

    @Query("SELECT COUNT(p) FROM DmParticipantEntity p WHERE p.id.dmId = :dmId")
    long countByDm(@Param("dmId") String dmId);

    @Modifying
    @Query("DELETE FROM DmParticipantEntity p WHERE p.id.dmId = :dmId AND p.id.userId = :userId")
    int deleteOne(@Param("dmId") String dmId, @Param("userId") String userId);
}
