package com.mihord.api.dm;

import com.mihord.api.dm.entity.DmEntity;
import com.mihord.api.dto.DmDtos;
import org.springframework.stereotype.Component;

@Component
public class DmShaper {

    private final DmParticipantRepository participants;

    public DmShaper(DmParticipantRepository participants) {
        this.participants = participants;
    }

    public DmDtos.Dm toDm(DmEntity d) {
        return new DmDtos.Dm(d.getId(), d.isGroup(), d.getGroupName(),
            participants.findUserIdsByDm(d.getId()));
    }
}
