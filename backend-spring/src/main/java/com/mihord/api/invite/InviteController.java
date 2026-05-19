package com.mihord.api.invite;

import com.mihord.api.auth.CurrentUser;
import com.mihord.api.error.ApiException;
import com.mihord.api.perm.Permissions;
import com.mihord.api.server.ServerMemberRepository;
import com.mihord.api.server.ServerRepository;
import com.mihord.api.server.ServerShaper;
import com.mihord.api.server.entity.ServerEntity;
import com.mihord.api.server.entity.ServerMemberEntity;
import com.mihord.api.server.ServerBanRepository;
import com.mihord.api.user.UserEntity;
import com.mihord.api.util.IdGen;
import com.mihord.api.ws.PresenceTracker;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/invites")
public class InviteController {

    private final InviteRepository invites;
    private final ServerRepository servers;
    private final ServerMemberRepository members;
    private final ServerBanRepository bans;
    private final ServerShaper shaper;
    private final PresenceTracker presence;

    public InviteController(InviteRepository invites, ServerRepository servers,
                            ServerMemberRepository members, ServerBanRepository bans,
                            ServerShaper shaper, PresenceTracker presence) {
        this.invites = invites;
        this.servers = servers;
        this.members = members;
        this.bans = bans;
        this.shaper = shaper;
        this.presence = presence;
    }

    @GetMapping("/{code}")
    public Map<String, Object> preview(@CurrentUser UserEntity me, @PathVariable String code) {
        InviteEntity invite = invites.findById(code).orElseThrow(() -> ApiException.notFound("not_found"));
        if (invite.getExpiresAt() != null && invite.getExpiresAt() < IdGen.now()) {
            throw ApiException.gone("expired");
        }
        if (invite.getMaxUses() != null && invite.getUses() >= invite.getMaxUses()) {
            throw ApiException.gone("exhausted");
        }
        ServerEntity s = servers.findById(invite.getServerId())
            .orElseThrow(() -> ApiException.notFound("not_found"));
        List<String> memberIds = members.findUserIdsByServer(s.getId());
        int online = 0;
        for (String id : memberIds) if (presence.isOnline(id)) online++;

        Map<String, Object> out = new HashMap<>();
        out.put("server", shaper.toServer(s));
        out.put("alreadyMember", members.isMember(s.getId(), me.getId()));
        out.put("code", invite.getCode());
        out.put("memberCount", memberIds.size());
        out.put("onlineCount", online);
        out.put("serverCreatedAt", s.getCreatedAt());
        return out;
    }

    @PostMapping("/{code}/accept")
    @Transactional
    public Map<String, Object> accept(@CurrentUser UserEntity me, @PathVariable String code) {
        InviteEntity invite = invites.findById(code).orElseThrow(() -> ApiException.notFound("not_found"));
        if (invite.getExpiresAt() != null && invite.getExpiresAt() < IdGen.now()) {
            throw ApiException.gone("expired");
        }
        if (invite.getMaxUses() != null && invite.getUses() >= invite.getMaxUses()) {
            throw ApiException.gone("exhausted");
        }
        ServerEntity s = servers.findById(invite.getServerId())
            .orElseThrow(() -> ApiException.notFound("not_found"));
        boolean already = members.isMember(s.getId(), me.getId());
        if (!already) {
            if (bans.isBanned(s.getId(), me.getId())) {
                throw ApiException.forbidden("banned");
            }
            members.save(new ServerMemberEntity(s.getId(), me.getId(), IdGen.now()));
            invites.incrementUses(invite.getCode());
        }
        return Map.of("server", shaper.toServer(s), "alreadyMember", already);
    }
}
