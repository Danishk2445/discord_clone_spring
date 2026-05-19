package com.mihord.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

public final class ChannelDtos {

    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record Channel(
        String id,
        String serverId,
        String categoryId,
        String name,
        String kind,
        String topic
    ) {}

    private ChannelDtos() {}
}
