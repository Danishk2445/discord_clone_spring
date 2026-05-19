package com.mihord.api.dm;

import com.mihord.api.dm.entity.DmEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DmRepository extends JpaRepository<DmEntity, String> {

    @Query("SELECT d FROM DmEntity d JOIN DmParticipantEntity p ON p.id.dmId = d.id " +
           "WHERE p.id.userId = :userId ORDER BY d.createdAt DESC")
    List<DmEntity> findForUser(@Param("userId") String userId);

    @Query("SELECT d FROM DmEntity d WHERE d.group = false " +
           "AND d.id IN (SELECT p1.id.dmId FROM DmParticipantEntity p1 WHERE p1.id.userId = :a) " +
           "AND d.id IN (SELECT p2.id.dmId FROM DmParticipantEntity p2 WHERE p2.id.userId = :b)")
    List<DmEntity> findDirectBetween(@Param("a") String a, @Param("b") String b);
}
