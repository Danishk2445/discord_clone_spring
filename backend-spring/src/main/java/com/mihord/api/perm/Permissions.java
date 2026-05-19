package com.mihord.api.perm;

import com.mihord.api.error.ApiException;
import com.mihord.api.server.MemberRoleRepository;
import com.mihord.api.server.RoleRepository;
import com.mihord.api.server.ServerMemberRepository;
import com.mihord.api.server.ServerRepository;
import com.mihord.api.server.entity.RoleEntity;
import com.mihord.api.server.entity.ServerEntity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

/** Mirrors backend/src/lib/permissions.ts — 8-bit bitmask + helpers. */
@Component
public class Permissions {

    public static final int MANAGE_SERVER    = 1;
    public static final int MANAGE_CHANNELS  = 1 << 1;
    public static final int MANAGE_ROLES     = 1 << 2;
    public static final int MANAGE_MESSAGES  = 1 << 3;
    public static final int KICK_MEMBERS     = 1 << 4;
    public static final int CREATE_INVITES   = 1 << 5;
    public static final int MENTION_EVERYONE = 1 << 6;
    public static final int BAN_MEMBERS      = 1 << 7;

    public static final int ALL_BITS =
        MANAGE_SERVER | MANAGE_CHANNELS | MANAGE_ROLES | MANAGE_MESSAGES
        | KICK_MEMBERS | CREATE_INVITES | MENTION_EVERYONE | BAN_MEMBERS;

    private final ServerRepository servers;
    private final ServerMemberRepository members;
    private final RoleRepository roles;
    private final MemberRoleRepository memberRoles;

    @Autowired
    public Permissions(ServerRepository servers, ServerMemberRepository members,
                       RoleRepository roles, MemberRoleRepository memberRoles) {
        this.servers = servers;
        this.members = members;
        this.roles = roles;
        this.memberRoles = memberRoles;
    }

    public boolean isServerMember(String serverId, String userId) {
        return members.isMember(serverId, userId);
    }

    public int userPermissions(String serverId, String userId) {
        Optional<ServerEntity> serverOpt = servers.findById(serverId);
        if (serverOpt.isEmpty()) return 0;
        ServerEntity s = serverOpt.get();
        if (s.getOwnerId().equals(userId)) return ALL_BITS;
        if (!isServerMember(serverId, userId)) return 0;
        List<String> myRoleIds = memberRoles.findRoleIdsFor(serverId, userId);
        int acc = 0;
        for (RoleEntity r : roles.findByServerIdOrderByPositionDescNameAsc(serverId)) {
            if (r.isEveryone() || myRoleIds.contains(r.getId())) {
                acc |= r.getPermissions();
            }
        }
        return acc;
    }

    public boolean hasPerm(String serverId, String userId, int bit) {
        return (userPermissions(serverId, userId) & bit) != 0;
    }

    public boolean isOwner(String serverId, String userId) {
        return servers.findById(serverId).map(s -> s.getOwnerId().equals(userId)).orElse(false);
    }

    /** Throws if user is not a member of the given server. */
    public void requireMember(String serverId, String userId) {
        if (!isServerMember(serverId, userId)) throw ApiException.forbidden("forbidden");
    }

    /** Throws if user does not have a given perm bit on the given server. */
    public void requirePerm(String serverId, String userId, int bit) {
        if (!hasPerm(serverId, userId, bit)) throw ApiException.forbidden("forbidden");
    }
}
