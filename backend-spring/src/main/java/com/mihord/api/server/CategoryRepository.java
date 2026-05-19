package com.mihord.api.server;

import com.mihord.api.server.entity.CategoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CategoryRepository extends JpaRepository<CategoryEntity, String> {
    List<CategoryEntity> findByServerIdOrderByPositionAsc(String serverId);
}
