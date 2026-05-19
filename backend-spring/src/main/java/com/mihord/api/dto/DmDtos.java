package com.mihord.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

public final class DmDtos {

    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record Dm(
        String id,
        boolean isGroup,
        String groupName,
        List<String> participantIds
    ) {}

    private DmDtos() {}
}
