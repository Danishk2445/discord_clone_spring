package com.mihord.api.dm.entity;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "dm_participants")
public class DmParticipantEntity {
    @EmbeddedId
    private DmParticipantId id;

    public DmParticipantEntity() {}
    public DmParticipantEntity(String dmId, String userId) {
        this.id = new DmParticipantId(dmId, userId);
    }

    public DmParticipantId getId() { return id; }
    public void setId(DmParticipantId id) { this.id = id; }
}
