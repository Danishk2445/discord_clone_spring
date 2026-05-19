package com.mihord.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public final class ServerDtos {

    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record Server(
        String id,
        String name,
        @JsonProperty("short") String shortName,
        String accent,
        String iconUrl,
        String bannerUrl,
        String ownerId
    ) {}

    public record Category(
        String id,
        String serverId,
        String name
    ) {}

    public record Member(
        UserDtos.PublicUser user,
        List<String> roleIds,
        boolean isOwner
    ) {}

    public record Ban(
        UserDtos.PublicUser user,
        String bannedBy,
        @JsonInclude(JsonInclude.Include.ALWAYS) String reason,
        long createdAt
    ) {}

    private ServerDtos() {}
}
