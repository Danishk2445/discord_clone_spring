package com.mihord.api.user;

import com.mihord.api.dto.UserDtos;
import com.mihord.api.ws.PresenceTracker;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

@Component
public class UserShaper {

    private final PresenceTracker presence;

    @Autowired
    public UserShaper(@Lazy PresenceTracker presence) {
        this.presence = presence;
    }

    public UserDtos.PublicUser toPublicUser(UserEntity u) {
        return new UserDtos.PublicUser(
            u.getId(),
            u.getUsername(),
            u.getDisplayName() != null ? u.getDisplayName() : u.getUsername(),
            u.getDiscriminator(),
            u.getAvatarColor(),
            u.getAvatarUrl(),
            u.getBio(),
            effectiveStatus(u)
        );
    }

    public UserDtos.SelfUser toSelfUser(UserEntity u) {
        UserDtos.PublicUser p = toPublicUser(u);
        return new UserDtos.SelfUser(
            p.id(), p.username(), p.displayName(), p.discriminator(),
            p.avatarColor(), p.avatarUrl(), p.bio(),
            u.getStatus(),
            u.getEmail()
        );
    }

    private String effectiveStatus(UserEntity u) {
        if ("offline".equals(u.getStatus())) return "offline";
        return presence.isOnline(u.getId()) ? u.getStatus() : "offline";
    }
}
