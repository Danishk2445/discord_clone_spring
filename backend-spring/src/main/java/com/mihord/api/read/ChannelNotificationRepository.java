package com.mihord.api.read;

import com.mihord.api.read.entity.ChannelNotificationEntity;
import com.mihord.api.read.entity.ChannelNotificationId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChannelNotificationRepository extends JpaRepository<ChannelNotificationEntity, ChannelNotificationId> {

    List<ChannelNotificationEntity> findByIdUserId(String userId);
}
