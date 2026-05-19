package com.mihord.api.user;

import com.mihord.api.auth.CurrentUser;
import com.mihord.api.error.ApiException;
import com.mihord.api.friend.FriendService;
import com.mihord.api.ws.RealtimeRegistry;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private static final Set<String> VALID_STATUS = Set.of("online", "idle", "dnd", "offline");

    private final UserRepository users;
    private final UserShaper shaper;
    private final FriendService friendService;
    private final RealtimeRegistry realtime;

    public UserController(UserRepository users, UserShaper shaper,
                          FriendService friendService, RealtimeRegistry realtime) {
        this.users = users;
        this.shaper = shaper;
        this.friendService = friendService;
        this.realtime = realtime;
    }

    @GetMapping("/me")
    public Map<String, Object> me(@CurrentUser UserEntity me) {
        Map<String, Object> out = new HashMap<>();
        out.put("user", shaper.toSelfUser(me));
        out.put("blockedUserIds", friendService.blockedUserIds(me.getId()));
        return out;
    }

    @PatchMapping("/me")
    @Transactional
    public Map<String, Object> patchMe(@CurrentUser UserEntity me,
                                       @RequestBody(required = false) Map<String, Object> body) {
        if (body == null) body = Map.of();

        if (body.get("displayName") instanceof String dnRaw) {
            String dn = dnRaw.trim();
            if (dn.isEmpty()) throw ApiException.badRequest("display_name_empty");
            me.setDisplayName(dn.length() > 32 ? dn.substring(0, 32) : dn);
        }
        if (body.get("bio") instanceof String b) {
            me.setBio(b.length() > 190 ? b.substring(0, 190) : b);
        }
        if (body.containsKey("avatarUrl")) {
            Object v = body.get("avatarUrl");
            if (v == null) {
                me.setAvatarUrl(null);
            } else if (v instanceof String s) {
                me.setAvatarUrl(s.length() > 200_000 ? s.substring(0, 200_000) : s);
            }
        }

        String newStatus = null;
        if (body.get("status") instanceof String statusRaw) {
            if (!VALID_STATUS.contains(statusRaw)) {
                throw ApiException.badRequest("invalid_status");
            }
            newStatus = statusRaw;
            me.setStatus(newStatus);
        }
        users.save(me);
        if (newStatus != null) {
            realtime.broadcastPresence(me.getId(), shaper.toPublicUser(me).status());
        }
        return Map.of("user", shaper.toSelfUser(me));
    }

    @GetMapping("/{userId}")
    public Map<String, Object> getUser(@CurrentUser UserEntity me, @PathVariable String userId) {
        UserEntity u = users.findById(userId).orElseThrow(() -> ApiException.notFound("not_found"));
        return Map.of("user", shaper.toPublicUser(u));
    }
}
