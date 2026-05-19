package com.mihord.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

public final class UserDtos {

    /** Public view of a user (no email). null fields are SERIALIZED as JSON null
     * to match the Express server's response shape (avatarUrl, bio). */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record PublicUser(
        String id,
        String username,
        String displayName,
        String discriminator,
        String avatarColor,
        String avatarUrl,
        String bio,
        String status
    ) {}

    /** Self user (includes email). */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record SelfUser(
        String id,
        String username,
        String displayName,
        String discriminator,
        String avatarColor,
        String avatarUrl,
        String bio,
        String status,
        String email
    ) {}

    private UserDtos() {}
}
