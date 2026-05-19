package com.mihord.api.friend;

import com.mihord.api.auth.CurrentUser;
import com.mihord.api.dto.FriendDtos;
import com.mihord.api.error.ApiException;
import com.mihord.api.user.UserEntity;
import com.mihord.api.user.UserRepository;
import com.mihord.api.user.UserShaper;
import com.mihord.api.util.IdGen;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/friends")
public class FriendController {

    private static final Set<String> ONLINE_STATUSES = Set.of("online", "idle", "dnd");
    private static final Pattern USERNAME_TAG = Pattern.compile("^(.+?)#(\\d{4})$");

    private final FriendshipRepository friendships;
    private final UserRepository users;
    private final FriendService friendService;
    private final UserShaper shaper;

    public FriendController(FriendshipRepository friendships, UserRepository users,
                            FriendService friendService, UserShaper shaper) {
        this.friendships = friendships;
        this.users = users;
        this.friendService = friendService;
        this.shaper = shaper;
    }

    @GetMapping
    public Map<String, Object> list(@CurrentUser UserEntity me,
                                    @RequestParam(value = "filter", required = false, defaultValue = "all") String filter) {
        List<FriendshipEntity> rows = friendships.findAllForUser(me.getId());
        List<FriendDtos.Friend> all = new ArrayList<>(rows.size());
        for (FriendshipEntity f : rows) {
            Optional<UserEntity> u = users.findById(f.getFriendId());
            if (u.isEmpty()) continue;
            String rawStatus = f.getStatus();
            String relation;
            String pendingDirection = null;
            switch (rawStatus) {
                case "accepted" -> relation = "all";
                case "pending_incoming" -> { relation = "pending"; pendingDirection = "incoming"; }
                case "pending_outgoing" -> { relation = "pending"; pendingDirection = "outgoing"; }
                case "blocked" -> relation = "blocked";
                default -> { continue; }
            }
            all.add(new FriendDtos.Friend(shaper.toPublicUser(u.get()), relation, pendingDirection));
        }
        List<FriendDtos.Friend> filtered = switch (filter) {
            case "online" -> all.stream()
                .filter(f -> "all".equals(f.relation()) && ONLINE_STATUSES.contains(f.user().status()))
                .toList();
            case "pending" -> all.stream().filter(f -> "pending".equals(f.relation())).toList();
            case "blocked" -> all.stream().filter(f -> "blocked".equals(f.relation())).toList();
            case "all" -> all.stream().filter(f -> "all".equals(f.relation())).toList();
            default -> all.stream().filter(f -> "all".equals(f.relation())).toList();
        };
        return Map.of("friends", filtered);
    }

    public record RequestBody_(String username) {}

    @PostMapping("/request")
    @Transactional
    public ResponseEntity<Map<String, Object>> request(@CurrentUser UserEntity me,
                                                       @RequestBody(required = false) RequestBody_ body) {
        String raw = body != null && body.username != null ? body.username.trim() : "";
        if (raw.isEmpty()) throw ApiException.badRequest("username_required");

        Optional<UserEntity> targetOpt;
        Matcher m = USERNAME_TAG.matcher(raw);
        if (m.matches()) {
            targetOpt = users.findByUsernameAndDiscriminator(m.group(1), m.group(2));
        } else {
            targetOpt = users.findFirstByUsername(raw);
        }
        UserEntity target = targetOpt.orElseThrow(() -> ApiException.notFound("user_not_found"));
        if (target.getId().equals(me.getId())) throw ApiException.badRequest("cannot_friend_self");
        if (friendService.isBlockedBetween(me.getId(), target.getId())) {
            throw ApiException.notFound("user_not_found");
        }

        Optional<FriendshipEntity> existing = friendships.findOne(me.getId(), target.getId());
        if (existing.isPresent()) {
            String s = existing.get().getStatus();
            if ("accepted".equals(s)) throw ApiException.conflict("already_friends");
            if ("pending_outgoing".equals(s)) throw ApiException.conflict("already_requested");
            if ("pending_incoming".equals(s)) {
                long now = IdGen.now();
                FriendshipEntity a = existing.get();
                a.setStatus("accepted");
                friendships.save(a);
                friendships.findOne(target.getId(), me.getId()).ifPresent(rev -> {
                    rev.setStatus("accepted");
                    friendships.save(rev);
                });
                Map<String, Object> resp = new HashMap<>();
                resp.put("ok", true);
                resp.put("accepted", true);
                resp.put("userId", target.getId());
                resp.put("createdAt", now);
                return ResponseEntity.ok(resp);
            }
        }

        long now = IdGen.now();
        friendships.save(new FriendshipEntity(me.getId(), target.getId(), "pending_outgoing", now));
        friendships.save(new FriendshipEntity(target.getId(), me.getId(), "pending_incoming", now));

        Map<String, Object> resp = new HashMap<>();
        resp.put("ok", true);
        resp.put("accepted", false);
        resp.put("user", shaper.toPublicUser(target));
        return ResponseEntity.status(HttpStatus.CREATED).body(resp);
    }

    @PostMapping("/{userId}/accept")
    @Transactional
    public Map<String, Object> accept(@CurrentUser UserEntity me, @PathVariable String userId) {
        FriendshipEntity f = friendships.findOne(me.getId(), userId).orElse(null);
        if (f == null || !"pending_incoming".equals(f.getStatus())) {
            throw ApiException.notFound("no_pending_request");
        }
        f.setStatus("accepted");
        friendships.save(f);
        friendships.findOne(userId, me.getId()).ifPresent(rev -> {
            rev.setStatus("accepted");
            friendships.save(rev);
        });
        return Map.of("ok", true);
    }

    @DeleteMapping("/{userId}")
    @Transactional
    public Map<String, Object> remove(@CurrentUser UserEntity me, @PathVariable String userId) {
        if (friendService.hasBlocked(me.getId(), userId)) {
            throw ApiException.conflict("user_blocked");
        }
        friendships.deleteOne(me.getId(), userId);
        friendships.deleteOne(userId, me.getId());
        return Map.of("ok", true);
    }

    @PostMapping("/{userId}/block")
    @Transactional
    public Map<String, Object> block(@CurrentUser UserEntity me, @PathVariable String userId) {
        if (userId.equals(me.getId())) throw ApiException.badRequest("cannot_block_self");
        users.findById(userId).orElseThrow(() -> ApiException.notFound("user_not_found"));
        long now = IdGen.now();
        friendships.deleteOne(me.getId(), userId);
        friendships.deleteOne(userId, me.getId());
        friendships.save(new FriendshipEntity(me.getId(), userId, "blocked", now));
        return Map.of("ok", true);
    }

    @DeleteMapping("/{userId}/block")
    @Transactional
    public Map<String, Object> unblock(@CurrentUser UserEntity me, @PathVariable String userId) {
        if (!friendService.hasBlocked(me.getId(), userId)) {
            throw ApiException.notFound("not_blocked");
        }
        friendships.deleteOne(me.getId(), userId);
        return Map.of("ok", true);
    }
}
