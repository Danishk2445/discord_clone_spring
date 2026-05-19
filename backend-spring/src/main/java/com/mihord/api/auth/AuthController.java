package com.mihord.api.auth;

import com.mihord.api.dto.UserDtos;
import com.mihord.api.error.ApiException;
import com.mihord.api.user.UserEntity;
import com.mihord.api.user.UserRepository;
import com.mihord.api.user.UserShaper;
import com.mihord.api.util.IdGen;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.SecureRandom;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String[] PALETTE = {
        "#80cfc4", "#f6a5d3", "#a5b4fc", "#fcd34d", "#86efac",
        "#fca5a5", "#c4b5fd", "#fdba74", "#67e8f9", "#f0abfc"
    };
    private static final SecureRandom RNG = new SecureRandom();

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final SessionService sessions;
    private final UserShaper shaper;

    public AuthController(UserRepository users, PasswordEncoder encoder,
                          SessionService sessions, UserShaper shaper) {
        this.users = users;
        this.encoder = encoder;
        this.sessions = sessions;
        this.shaper = shaper;
    }

    public record RegisterBody(String email, String password, String username) {}
    public record LoginBody(String email, String password) {}

    @PostMapping("/register")
    @Transactional
    public ResponseEntity<Map<String, Object>> register(@RequestBody(required = false) RegisterBody body,
                                                        HttpServletRequest request) {
        if (body == null || body.email == null || body.password == null || body.username == null
            || !body.email.contains("@") || body.password.length() < 6
            || body.username.length() < 2 || body.username.length() > 32) {
            throw ApiException.badRequest("invalid_input");
        }
        String emailLower = body.email.toLowerCase();
        if (users.findByEmailIgnoreCase(emailLower).isPresent()) {
            throw ApiException.conflict("email_taken");
        }

        String discriminator = IdGen.randomDiscriminator();
        for (int i = 0; i < 5; i++) {
            if (users.findByUsernameAndDiscriminator(body.username, discriminator).isEmpty()) break;
            discriminator = IdGen.randomDiscriminator();
        }

        UserEntity u = new UserEntity();
        u.setId(IdGen.newId("u"));
        u.setEmail(emailLower);
        u.setPasswordHash(encoder.encode(body.password));
        u.setUsername(body.username);
        u.setDisplayName(null);
        u.setDiscriminator(discriminator);
        u.setAvatarColor(PALETTE[RNG.nextInt(PALETTE.length)]);
        u.setAvatarUrl(null);
        u.setBio(null);
        u.setStatus("online");
        u.setCreatedAt(IdGen.now());

        try {
            users.save(u);
        } catch (DataIntegrityViolationException ex) {
            throw ApiException.conflict("email_taken");
        }

        sessions.setUserId(request, u.getId());

        Map<String, Object> resp = new HashMap<>();
        resp.put("user", shaper.toSelfUser(u));
        return ResponseEntity.status(HttpStatus.CREATED).body(resp);
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody(required = false) LoginBody body,
                                                     HttpServletRequest request) {
        if (body == null || body.email == null || body.password == null) {
            throw ApiException.badRequest("invalid_input");
        }
        UserEntity u = users.findByEmailIgnoreCase(body.email.toLowerCase())
            .orElseThrow(() -> ApiException.unauthorized("invalid_credentials"));
        if (!encoder.matches(body.password, u.getPasswordHash())) {
            throw ApiException.unauthorized("invalid_credentials");
        }
        sessions.setUserId(request, u.getId());
        return ResponseEntity.ok(Map.of("user", shaper.toSelfUser(u)));
    }

    @PostMapping("/logout")
    public Map<String, Object> logout(HttpServletRequest request) {
        sessions.invalidate(request);
        return Map.of("ok", true);
    }

    @GetMapping("/me")
    public Map<String, Object> me(@CurrentUser UserEntity me) {
        return Map.of("user", shaper.toSelfUser(me));
    }
}
