package com.mihord.api.server;

import com.mihord.api.auth.CurrentUser;
import com.mihord.api.dto.ChannelDtos;
import com.mihord.api.dto.RoleDtos;
import com.mihord.api.dto.ServerDtos;
import com.mihord.api.error.ApiException;
import com.mihord.api.perm.Permissions;
import com.mihord.api.server.entity.CategoryEntity;
import com.mihord.api.server.entity.ChannelEntity;
import com.mihord.api.server.entity.MemberRoleEntity;
import com.mihord.api.server.entity.RoleEntity;
import com.mihord.api.server.entity.ServerBanEntity;
import com.mihord.api.server.entity.ServerBanId;
import com.mihord.api.server.entity.ServerEntity;
import com.mihord.api.server.entity.ServerMemberEntity;
import com.mihord.api.user.UserEntity;
import com.mihord.api.user.UserRepository;
import com.mihord.api.user.UserShaper;
import com.mihord.api.util.IdGen;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/servers")
public class ServerController {

    private static final Pattern HEX_COLOR = Pattern.compile("^#[0-9a-fA-F]{6}$");
    private static final Pattern CHANNEL_NAME = Pattern.compile("^[a-z0-9-]{2,32}$");

    private final ServerRepository servers;
    private final ServerMemberRepository members;
    private final CategoryRepository categories;
    private final ChannelRepository channels;
    private final RoleRepository roles;
    private final MemberRoleRepository memberRoles;
    private final ServerBanRepository bans;
    private final UserRepository users;
    private final UserShaper userShaper;
    private final ServerShaper shaper;
    private final Permissions perms;

    public ServerController(ServerRepository servers, ServerMemberRepository members,
                            CategoryRepository categories, ChannelRepository channels,
                            RoleRepository roles, MemberRoleRepository memberRoles,
                            ServerBanRepository bans, UserRepository users,
                            UserShaper userShaper, ServerShaper shaper, Permissions perms) {
        this.servers = servers;
        this.members = members;
        this.categories = categories;
        this.channels = channels;
        this.roles = roles;
        this.memberRoles = memberRoles;
        this.bans = bans;
        this.users = users;
        this.userShaper = userShaper;
        this.shaper = shaper;
        this.perms = perms;
    }

    private ServerEntity load(String serverId) {
        return servers.findById(serverId).orElseThrow(() -> ApiException.notFound("not_found"));
    }

    private static String shortFromName(String name) {
        String trimmed = name.trim();
        String[] words = trimmed.split("\\s+");
        StringBuilder initials = new StringBuilder();
        for (String w : words) {
            if (w.isEmpty()) continue;
            initials.append(w.charAt(0));
            if (initials.length() >= 2) break;
        }
        String result = initials.toString().toUpperCase();
        if (!result.isEmpty()) return result;
        return trimmed.substring(0, Math.min(2, trimmed.length())).toUpperCase();
    }

    // ---- Server CRUD ------------------------------------------------------

    @GetMapping
    public Map<String, Object> list(@CurrentUser UserEntity me) {
        List<ServerDtos.Server> out = servers.findForMember(me.getId()).stream()
            .map(shaper::toServer).toList();
        return Map.of("servers", out);
    }

    public record CreateServerBody(String name, String accent) {}

    @PostMapping
    @Transactional
    public ResponseEntity<Map<String, Object>> create(@CurrentUser UserEntity me,
                                                      @RequestBody(required = false) CreateServerBody body) {
        String name = body != null && body.name != null ? body.name.trim() : "";
        if (name.length() < 2 || name.length() > 50) throw ApiException.badRequest("invalid_name");
        String accent = body.accent != null && HEX_COLOR.matcher(body.accent).matches()
            ? body.accent : "#80cfc4";
        String shortName = shortFromName(name);

        String id = IdGen.newId("s");
        long now = IdGen.now();

        ServerEntity s = new ServerEntity();
        s.setId(id); s.setName(name); s.setShortName(shortName); s.setAccent(accent);
        s.setOwnerId(me.getId()); s.setCreatedAt(now);
        servers.save(s);

        members.save(new ServerMemberEntity(id, me.getId(), now));

        CategoryEntity textCat = new CategoryEntity();
        textCat.setId(IdGen.newId("c")); textCat.setServerId(id); textCat.setName("Text Channels"); textCat.setPosition(0);
        categories.save(textCat);
        ChannelEntity textChan = new ChannelEntity();
        textChan.setId(IdGen.newId("ch")); textChan.setServerId(id); textChan.setCategoryId(textCat.getId());
        textChan.setName("general"); textChan.setKind("text"); textChan.setTopic(null); textChan.setPosition(0);
        channels.save(textChan);

        CategoryEntity voiceCat = new CategoryEntity();
        voiceCat.setId(IdGen.newId("c")); voiceCat.setServerId(id); voiceCat.setName("Voice Channels"); voiceCat.setPosition(1);
        categories.save(voiceCat);
        ChannelEntity voiceChan = new ChannelEntity();
        voiceChan.setId(IdGen.newId("ch")); voiceChan.setServerId(id); voiceChan.setCategoryId(voiceCat.getId());
        voiceChan.setName("General"); voiceChan.setKind("voice"); voiceChan.setTopic(null); voiceChan.setPosition(0);
        channels.save(voiceChan);

        RoleEntity everyone = new RoleEntity();
        everyone.setId("role-everyone-" + id); everyone.setServerId(id);
        everyone.setName("@everyone"); everyone.setColor("#9aa3a1");
        everyone.setPermissions(0); everyone.setPosition(0); everyone.setEveryone(true);
        roles.save(everyone);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("server", shaper.toServer(s)));
    }

    @GetMapping("/{serverId}")
    public Map<String, Object> get(@CurrentUser UserEntity me, @PathVariable String serverId) {
        ServerEntity s = load(serverId);
        perms.requireMember(serverId, me.getId());
        List<ServerDtos.Category> cats = categories.findByServerIdOrderByPositionAsc(serverId)
            .stream().map(shaper::toCategory).toList();
        List<ChannelDtos.Channel> chs = channels.findByServerIdOrderByPositionAsc(serverId)
            .stream().map(shaper::toChannel).toList();
        Map<String, Object> out = new HashMap<>();
        out.put("server", shaper.toServer(s));
        out.put("categories", cats);
        out.put("channels", chs);
        out.put("isOwner", s.getOwnerId().equals(me.getId()));
        return out;
    }

    @DeleteMapping("/{serverId}/members/me")
    @Transactional
    public Map<String, Object> leave(@CurrentUser UserEntity me, @PathVariable String serverId) {
        ServerEntity s = load(serverId);
        if (s.getOwnerId().equals(me.getId())) throw ApiException.badRequest("owner_cannot_leave");
        members.deleteOne(serverId, me.getId());
        return Map.of("ok", true);
    }

    @DeleteMapping("/{serverId}")
    @Transactional
    public Map<String, Object> delete(@CurrentUser UserEntity me, @PathVariable String serverId) {
        ServerEntity s = load(serverId);
        if (!s.getOwnerId().equals(me.getId())) throw ApiException.forbidden("forbidden");
        servers.delete(s);
        return Map.of("ok", true);
    }

    @PatchMapping("/{serverId}")
    @Transactional
    public Map<String, Object> patch(@CurrentUser UserEntity me, @PathVariable String serverId,
                                     @RequestBody(required = false) Map<String, Object> body) {
        ServerEntity s = load(serverId);
        perms.requirePerm(serverId, me.getId(), Permissions.MANAGE_SERVER);
        if (body == null) body = Map.of();

        if (body.get("name") instanceof String nameRaw) {
            String next = nameRaw.trim();
            if (next.length() < 2 || next.length() > 50) throw ApiException.badRequest("invalid_name");
            s.setName(next);
            s.setShortName(shortFromName(next));
        }
        if (body.get("accent") instanceof String accent) {
            if (!HEX_COLOR.matcher(accent).matches()) throw ApiException.badRequest("invalid_accent");
            s.setAccent(accent);
        }
        if (body.containsKey("iconUrl")) {
            Object v = body.get("iconUrl");
            if (v == null || (v instanceof String vs && vs.isEmpty())) {
                s.setIconUrl(null);
            } else if (v instanceof String vs && vs.length() <= 500) {
                s.setIconUrl(vs);
            } else {
                throw ApiException.badRequest("invalid_icon_url");
            }
        }
        if (body.containsKey("bannerUrl")) {
            Object v = body.get("bannerUrl");
            if (v == null || (v instanceof String vs && vs.isEmpty())) {
                s.setBannerUrl(null);
            } else if (v instanceof String vs && vs.length() <= 500) {
                s.setBannerUrl(vs);
            } else {
                throw ApiException.badRequest("invalid_banner_url");
            }
        }
        servers.save(s);
        return Map.of("server", shaper.toServer(s));
    }

    // ---- Members & bans ---------------------------------------------------

    @GetMapping("/{serverId}/me")
    public Map<String, Object> myMembership(@CurrentUser UserEntity me, @PathVariable String serverId) {
        ServerEntity s = load(serverId);
        perms.requireMember(serverId, me.getId());
        List<String> roleIds = memberRoles.findRoleIdsFor(serverId, me.getId());
        return Map.of(
            "isOwner", s.getOwnerId().equals(me.getId()),
            "roleIds", roleIds
        );
    }

    @GetMapping("/{serverId}/members")
    public Map<String, Object> listMembers(@CurrentUser UserEntity me, @PathVariable String serverId) {
        ServerEntity s = load(serverId);
        perms.requireMember(serverId, me.getId());
        List<String> memberIds = members.findUserIdsByServer(serverId);
        List<UserEntity> userList = users.findAllById(memberIds);
        userList.sort((a, b) -> a.getUsername().compareToIgnoreCase(b.getUsername()));
        List<ServerDtos.Member> out = userList.stream().map(u -> new ServerDtos.Member(
            userShaper.toPublicUser(u),
            memberRoles.findRoleIdsFor(serverId, u.getId()),
            s.getOwnerId().equals(u.getId())
        )).toList();
        return Map.of("members", out);
    }

    @DeleteMapping("/{serverId}/members/{userId}")
    @Transactional
    public Map<String, Object> kick(@CurrentUser UserEntity me, @PathVariable String serverId,
                                    @PathVariable String userId) {
        ServerEntity s = load(serverId);
        perms.requirePerm(serverId, me.getId(), Permissions.KICK_MEMBERS);
        if (userId.equals(s.getOwnerId())) throw ApiException.badRequest("cannot_kick_owner");
        members.deleteOne(serverId, userId);
        return Map.of("ok", true);
    }

    @GetMapping("/{serverId}/bans")
    public Map<String, Object> listBans(@CurrentUser UserEntity me, @PathVariable String serverId) {
        ServerEntity s = load(serverId);
        perms.requirePerm(serverId, me.getId(), Permissions.BAN_MEMBERS);
        List<ServerBanEntity> rows = bans.findByIdServerIdOrderByCreatedAtDesc(serverId);
        List<ServerDtos.Ban> out = new ArrayList<>(rows.size());
        for (ServerBanEntity b : rows) {
            UserEntity u = users.findById(b.getId().getUserId()).orElse(null);
            if (u == null) continue;
            out.add(new ServerDtos.Ban(userShaper.toPublicUser(u), b.getBannedBy(), b.getReason(), b.getCreatedAt()));
        }
        return Map.of("bans", out);
    }

    public record BanBody(String reason) {}

    @PostMapping("/{serverId}/bans/{userId}")
    @Transactional
    public Map<String, Object> ban(@CurrentUser UserEntity me, @PathVariable String serverId,
                                   @PathVariable String userId,
                                   @RequestBody(required = false) BanBody body) {
        ServerEntity s = load(serverId);
        perms.requirePerm(serverId, me.getId(), Permissions.BAN_MEMBERS);
        if (userId.equals(s.getOwnerId())) throw ApiException.badRequest("cannot_ban_owner");
        if (userId.equals(me.getId())) throw ApiException.badRequest("cannot_ban_self");
        UserEntity target = users.findById(userId).orElseThrow(() -> ApiException.notFound("user_not_found"));
        String reason = null;
        if (body != null && body.reason != null) {
            String r = body.reason.trim();
            if (r.length() > 200) r = r.substring(0, 200);
            reason = r.isEmpty() ? null : r;
        }
        bans.save(new ServerBanEntity(serverId, target.getId(), me.getId(), reason, IdGen.now()));
        members.deleteOne(serverId, target.getId());
        return Map.of("ok", true);
    }

    @DeleteMapping("/{serverId}/bans/{userId}")
    @Transactional
    public Map<String, Object> unban(@CurrentUser UserEntity me, @PathVariable String serverId,
                                     @PathVariable String userId) {
        ServerEntity s = load(serverId);
        perms.requirePerm(serverId, me.getId(), Permissions.BAN_MEMBERS);
        bans.deleteOne(serverId, userId);
        return Map.of("ok", true);
    }

    // ---- Categories -------------------------------------------------------

    public record CategoryBody(String name) {}

    @PostMapping("/{serverId}/categories")
    @Transactional
    public ResponseEntity<Map<String, Object>> createCategory(
        @CurrentUser UserEntity me, @PathVariable String serverId,
        @RequestBody(required = false) CategoryBody body) {
        ServerEntity s = load(serverId);
        perms.requirePerm(serverId, me.getId(), Permissions.MANAGE_CHANNELS);
        String name = body != null && body.name != null ? body.name.trim() : "";
        if (name.isEmpty() || name.length() > 32) throw ApiException.badRequest("invalid_name");
        List<CategoryEntity> existing = categories.findByServerIdOrderByPositionAsc(serverId);
        CategoryEntity c = new CategoryEntity();
        c.setId(IdGen.newId("c")); c.setServerId(serverId); c.setName(name); c.setPosition(existing.size());
        categories.save(c);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("category", shaper.toCategory(c)));
    }

    @PatchMapping("/{serverId}/categories/{categoryId}")
    @Transactional
    public Map<String, Object> patchCategory(@CurrentUser UserEntity me, @PathVariable String serverId,
                                             @PathVariable String categoryId,
                                             @RequestBody(required = false) CategoryBody body) {
        ServerEntity s = load(serverId);
        perms.requirePerm(serverId, me.getId(), Permissions.MANAGE_CHANNELS);
        CategoryEntity c = categories.findById(categoryId)
            .filter(x -> x.getServerId().equals(serverId))
            .orElseThrow(() -> ApiException.notFound("not_found"));
        String name = body != null && body.name != null ? body.name.trim() : c.getName();
        if (name.isEmpty() || name.length() > 32) throw ApiException.badRequest("invalid_name");
        c.setName(name);
        categories.save(c);
        return Map.of("category", shaper.toCategory(c));
    }

    @DeleteMapping("/{serverId}/categories/{categoryId}")
    @Transactional
    public Map<String, Object> deleteCategory(@CurrentUser UserEntity me, @PathVariable String serverId,
                                              @PathVariable String categoryId) {
        ServerEntity s = load(serverId);
        perms.requirePerm(serverId, me.getId(), Permissions.MANAGE_CHANNELS);
        CategoryEntity c = categories.findById(categoryId)
            .filter(x -> x.getServerId().equals(serverId))
            .orElseThrow(() -> ApiException.notFound("not_found"));
        List<CategoryEntity> all = categories.findByServerIdOrderByPositionAsc(serverId);
        if (all.size() <= 1) throw ApiException.badRequest("last_category");
        categories.delete(c);
        return Map.of("ok", true);
    }

    // ---- Channels (create only; channel-scoped CRUD is in ChannelController) --

    public record CreateChannelBody(String name, String kind, String categoryId) {}

    @PostMapping("/{serverId}/channels")
    @Transactional
    public ResponseEntity<Map<String, Object>> createChannel(
        @CurrentUser UserEntity me, @PathVariable String serverId,
        @RequestBody(required = false) CreateChannelBody body) {
        ServerEntity s = load(serverId);
        perms.requirePerm(serverId, me.getId(), Permissions.MANAGE_CHANNELS);
        String rawName = body != null && body.name != null ? body.name.trim().toLowerCase() : "";
        if (!CHANNEL_NAME.matcher(rawName).matches()) throw ApiException.badRequest("invalid_name");
        String kind = body != null && "voice".equals(body.kind) ? "voice" : "text";
        String categoryId = body != null ? body.categoryId : null;
        List<CategoryEntity> cats = categories.findByServerIdOrderByPositionAsc(serverId);
        if (categoryId == null || categoryId.isEmpty()) {
            if (cats.isEmpty()) throw ApiException.badRequest("invalid_category");
            categoryId = cats.get(0).getId();
        }
        final String catIdFinal = categoryId;
        boolean valid = cats.stream().anyMatch(c -> c.getId().equals(catIdFinal));
        if (!valid) throw ApiException.badRequest("invalid_category");
        int existingInCat = channels.findByCategoryId(categoryId).size();
        ChannelEntity ch = new ChannelEntity();
        ch.setId(IdGen.newId("ch")); ch.setServerId(serverId); ch.setCategoryId(categoryId);
        ch.setName(rawName); ch.setKind(kind); ch.setTopic(null); ch.setPosition(existingInCat);
        channels.save(ch);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("channel", shaper.toChannel(ch)));
    }

    // ---- Roles ------------------------------------------------------------

    @GetMapping("/{serverId}/roles")
    public Map<String, Object> listRoles(@CurrentUser UserEntity me, @PathVariable String serverId) {
        ServerEntity s = load(serverId);
        perms.requireMember(serverId, me.getId());
        List<RoleDtos.Role> out = roles.findByServerIdOrderByPositionDescNameAsc(serverId)
            .stream().map(shaper::toRole).toList();
        return Map.of("roles", out);
    }

    public record CreateRoleBody(String name, String color, Integer permissions) {}

    @PostMapping("/{serverId}/roles")
    @Transactional
    public ResponseEntity<Map<String, Object>> createRole(
        @CurrentUser UserEntity me, @PathVariable String serverId,
        @RequestBody(required = false) CreateRoleBody body) {
        ServerEntity s = load(serverId);
        perms.requirePerm(serverId, me.getId(), Permissions.MANAGE_ROLES);
        String name = body != null && body.name != null ? body.name.trim() : "";
        if (name.length() < 1 || name.length() > 32) throw ApiException.badRequest("invalid_name");
        String color = body != null && body.color != null && HEX_COLOR.matcher(body.color).matches()
            ? body.color : "#9aa3a1";
        int permsBits = body != null && body.permissions != null && body.permissions >= 0
            ? body.permissions : 0;
        List<RoleEntity> existing = roles.findByServerIdOrderByPositionDescNameAsc(serverId);
        RoleEntity r = new RoleEntity();
        r.setId(IdGen.newId("role")); r.setServerId(serverId); r.setName(name);
        r.setColor(color); r.setPermissions(permsBits); r.setPosition(existing.size()); r.setEveryone(false);
        roles.save(r);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("role", shaper.toRole(r)));
    }

    @PatchMapping("/{serverId}/roles/{roleId}")
    @Transactional
    public Map<String, Object> patchRole(@CurrentUser UserEntity me, @PathVariable String serverId,
                                         @PathVariable String roleId,
                                         @RequestBody(required = false) CreateRoleBody body) {
        ServerEntity s = load(serverId);
        perms.requirePerm(serverId, me.getId(), Permissions.MANAGE_ROLES);
        RoleEntity r = roles.findById(roleId)
            .filter(x -> x.getServerId().equals(serverId))
            .orElseThrow(() -> ApiException.notFound("not_found"));
        if (body != null) {
            if (body.name != null) r.setName(body.name.trim());
            if (body.color != null && HEX_COLOR.matcher(body.color).matches()) r.setColor(body.color);
            if (body.permissions != null && body.permissions >= 0) r.setPermissions(body.permissions);
        }
        roles.save(r);
        return Map.of("role", shaper.toRole(r));
    }

    @DeleteMapping("/{serverId}/roles/{roleId}")
    @Transactional
    public Map<String, Object> deleteRole(@CurrentUser UserEntity me, @PathVariable String serverId,
                                          @PathVariable String roleId) {
        ServerEntity s = load(serverId);
        perms.requirePerm(serverId, me.getId(), Permissions.MANAGE_ROLES);
        RoleEntity r = roles.findById(roleId)
            .filter(x -> x.getServerId().equals(serverId))
            .orElseThrow(() -> ApiException.notFound("not_found"));
        if (r.isEveryone()) throw ApiException.badRequest("cannot_delete_everyone");
        roles.delete(r);
        return Map.of("ok", true);
    }

    public record AssignRoleBody(String roleId) {}

    @PostMapping("/{serverId}/members/{userId}/roles")
    @Transactional
    public Map<String, Object> assignRole(@CurrentUser UserEntity me, @PathVariable String serverId,
                                          @PathVariable String userId,
                                          @RequestBody(required = false) AssignRoleBody body) {
        ServerEntity s = load(serverId);
        perms.requirePerm(serverId, me.getId(), Permissions.MANAGE_ROLES);
        if (!members.isMember(serverId, userId)) throw ApiException.notFound("user_not_member");
        String roleId = body != null && body.roleId != null ? body.roleId : "";
        RoleEntity r = roles.findById(roleId).orElse(null);
        if (r == null || !r.getServerId().equals(serverId) || r.isEveryone()) {
            throw ApiException.badRequest("invalid_role");
        }
        memberRoles.save(new MemberRoleEntity(serverId, userId, roleId));
        return Map.of("ok", true);
    }

    @DeleteMapping("/{serverId}/members/{userId}/roles/{roleId}")
    @Transactional
    public Map<String, Object> unassignRole(@CurrentUser UserEntity me, @PathVariable String serverId,
                                            @PathVariable String userId, @PathVariable String roleId) {
        ServerEntity s = load(serverId);
        perms.requirePerm(serverId, me.getId(), Permissions.MANAGE_ROLES);
        memberRoles.deleteOne(serverId, userId, roleId);
        return Map.of("ok", true);
    }
}
