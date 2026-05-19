package com.mihord.api.read;

import com.mihord.api.read.entity.ReadStateEntity;
import com.mihord.api.read.entity.ReadStateId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReadStateRepository extends JpaRepository<ReadStateEntity, ReadStateId> {

    List<ReadStateEntity> findByIdUserId(String userId);
}
