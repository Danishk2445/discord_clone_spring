package com.mihord.api.invite;

import com.mihord.api.auth.CurrentUser;
import com.mihord.api.error.ApiException;
import com.mihord.api.perm.Permissions;
import com.mihord.api.server.ServerRepository;
import com.mihord.api.server.entity.ServerEntity;
import com.mihord.api.user.UserEntity;
import com.mihord.api.util.IdGen;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/servers/{serverId}/invites")
public class ServerInviteController {

    private final InviteRepository invites;
    private final ServerRepository servers;
    private final Permissions perms;

    public ServerInviteController(InviteRepository invites, ServerRepository servers, Permissions perms) {
        this.invites = invites;
        this.servers = servers;
        this.perms = perms;
    }

    public record CreateInviteBody(Long expiresInMs, Integer maxUses) {}

    @PostMapping
    @Transactional
    public ResponseEntity<Map<String, Object>> create(@CurrentUser UserEntity me,
                                                      @PathVariable String serverId,
                                                      @RequestBody(required = false) CreateInviteBody body) {
        ServerEntity s = servers.findById(serverId).orElseThrow(() -> ApiException.notFound("not_found"));
        if (!perms.hasPerm(serverId, me.getId(), Permissions.CREATE_INVITES)
            && !s.getOwnerId().equals(me.getId())) {
            throw ApiException.forbidden("forbidden");
        }
        long now = IdGen.now();
        Long expiresAt = body != null && body.expiresInMs != null && body.expiresInMs > 0
            ? now + body.expiresInMs : null;
        Integer maxUses = body != null && body.maxUses != null && body.maxUses > 0
            ? body.maxUses : null;
        String code = IdGen.inviteCode();
        InviteEntity inv = new InviteEntity();
        inv.setCode(code); inv.setServerId(serverId); inv.setInviterId(me.getId());
        inv.setCreatedAt(now); inv.setExpiresAt(expiresAt); inv.setUses(0); inv.setMaxUses(maxUses);
        invites.save(inv);

        Map<String, Object> invitePayload = new HashMap<>();
        invitePayload.put("code", code);
        invitePayload.put("serverId", serverId);
        invitePayload.put("inviterId", me.getId());
        invitePayload.put("createdAt", now);
        invitePayload.put("expiresAt", expiresAt);
        invitePayload.put("uses", 0);
        invitePayload.put("maxUses", maxUses);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("invite", invitePayload));
    }
}
