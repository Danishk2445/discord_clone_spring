package com.mihord.api.invite;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InviteRepository extends JpaRepository<InviteEntity, String> {

    @Modifying
    @Query("UPDATE InviteEntity i SET i.uses = i.uses + 1 WHERE i.code = :code")
    int incrementUses(@Param("code") String code);
}
