package com.mihord.api.dm.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class DmParticipantId implements Serializable {
    @Column(name = "dm_id", length = 40, nullable = false)
    private String dmId;

    @Column(name = "user_id", length = 40, nullable = false)
    private String userId;

    public DmParticipantId() {}
    public DmParticipantId(String dmId, String userId) {
        this.dmId = dmId;
        this.userId = userId;
    }
    public String getDmId() { return dmId; }
    public void setDmId(String dmId) { this.dmId = dmId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    @Override public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof DmParticipantId i)) return false;
        return Objects.equals(dmId, i.dmId) && Objects.equals(userId, i.userId);
    }
    @Override public int hashCode() { return Objects.hash(dmId, userId); }
}
