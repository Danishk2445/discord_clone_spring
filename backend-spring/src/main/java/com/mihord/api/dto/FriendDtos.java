package com.mihord.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

public final class FriendDtos {

    /** "all" | "pending" | "blocked" relation. pendingDirection is "incoming" or "outgoing"
     * (omitted via NON_ABSENT when null). */
    public record Friend(
        UserDtos.PublicUser user,
        String relation,
        @JsonInclude(JsonInclude.Include.NON_NULL) String pendingDirection
    ) {}

    private FriendDtos() {}
}
