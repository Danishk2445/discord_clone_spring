package com.mihord.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

public final class InviteDtos {

    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record Invite(
        String code,
        String serverId,
        String inviterId,
        long createdAt,
        Long expiresAt,
        int uses,
        Integer maxUses
    ) {}

    private InviteDtos() {}
}
