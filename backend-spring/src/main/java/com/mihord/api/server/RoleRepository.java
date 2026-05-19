package com.mihord.api.server;

import com.mihord.api.server.entity.RoleEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RoleRepository extends JpaRepository<RoleEntity, String> {
    List<RoleEntity> findByServerIdOrderByPositionDescNameAsc(String serverId);
}
