package com.mihord.api.server;

import com.mihord.api.dto.ChannelDtos;
import com.mihord.api.dto.InviteDtos;
import com.mihord.api.dto.RoleDtos;
import com.mihord.api.dto.ServerDtos;
import com.mihord.api.invite.InviteEntity;
import com.mihord.api.server.entity.CategoryEntity;
import com.mihord.api.server.entity.ChannelEntity;
import com.mihord.api.server.entity.RoleEntity;
import com.mihord.api.server.entity.ServerEntity;
import org.springframework.stereotype.Component;

@Component
public class ServerShaper {

    public ServerDtos.Server toServer(ServerEntity s) {
        return new ServerDtos.Server(
            s.getId(), s.getName(), s.getShortName(), s.getAccent(),
            s.getIconUrl(), s.getBannerUrl(), s.getOwnerId()
        );
    }

    public ServerDtos.Category toCategory(CategoryEntity c) {
        return new ServerDtos.Category(c.getId(), c.getServerId(), c.getName());
    }

    public ChannelDtos.Channel toChannel(ChannelEntity c) {
        return new ChannelDtos.Channel(
            c.getId(), c.getServerId(), c.getCategoryId(),
            c.getName(), c.getKind(), c.getTopic()
        );
    }

    public RoleDtos.Role toRole(RoleEntity r) {
        return new RoleDtos.Role(
            r.getId(), r.getServerId(), r.getName(), r.getColor(),
            r.getPermissions(), r.getPosition(), r.isEveryone()
        );
    }

    public InviteDtos.Invite toInvite(InviteEntity i) {
        return new InviteDtos.Invite(
            i.getCode(), i.getServerId(), i.getInviterId(),
            i.getCreatedAt(), i.getExpiresAt(), i.getUses(), i.getMaxUses()
        );
    }
}
