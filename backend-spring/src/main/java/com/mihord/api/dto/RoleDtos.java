package com.mihord.api.dto;

public final class RoleDtos {

    public record Role(
        String id,
        String serverId,
        String name,
        String color,
        int permissions,
        int position,
        boolean isEveryone
    ) {}

    private RoleDtos() {}
}
