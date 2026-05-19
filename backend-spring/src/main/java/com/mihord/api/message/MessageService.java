package com.mihord.api.message;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mihord.api.dm.DmParticipantRepository;
import com.mihord.api.dto.MessageDtos;
import com.mihord.api.perm.Permissions;
import com.mihord.api.server.ServerMemberRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Shared message-parsing logic used by both channel and DM controllers.
 * Mirrors backend/src/lib/messages.ts and the filter logic in
 * backend/src/routes/channels.ts / dms.ts. */
@Service
public class MessageService {

    private static final Set<String> EVERYONE_MENTIONS = Set.of("@everyone", "@here");

    private final ObjectMapper mapper;
    private final ServerMemberRepository members;
    private final DmParticipantRepository dmParticipants;

    public MessageService(ObjectMapper mapper, ServerMemberRepository members,
                          DmParticipantRepository dmParticipants) {
        this.mapper = mapper;
        this.members = members;
        this.dmParticipants = dmParticipants;
    }

    public List<MessageDtos.Attachment> parseAttachments(Object input) {
        if (!(input instanceof List<?> list)) return List.of();
        List<MessageDtos.Attachment> out = new ArrayList<>();
        for (Object raw : list) {
            if (!(raw instanceof Map<?, ?> m)) continue;
            Object urlObj = m.get("url");
            if (!(urlObj instanceof String url)) continue;
            if (url.length() > 1000) continue;
            boolean isHttp = url.toLowerCase().startsWith("http://") || url.toLowerCase().startsWith("https://");
            boolean isLocalUpload = url.startsWith("/uploads/") && !url.contains("..");
            if (!isHttp && !isLocalUpload) continue;
            Object nameObj = m.get("name");
            Object contentTypeObj = m.get("contentType");
            Object sizeObj = m.get("size");
            String name = nameObj instanceof String s && !s.isEmpty()
                ? (s.length() > 200 ? s.substring(0, 200) : s)
                : decodeFileName(url);
            String contentType = contentTypeObj instanceof String s
                ? (s.length() > 100 ? s.substring(0, 100) : s)
                : null;
            Long size = sizeObj instanceof Number n ? n.longValue() : null;
            out.add(new MessageDtos.Attachment(url, name, contentType, size));
            if (out.size() >= 10) break;
        }
        return out;
    }

    private String decodeFileName(String url) {
        try {
            String path = url.startsWith("/") ? url : new java.net.URI(url).getPath();
            String[] parts = path.split("/");
            String tail = "";
            for (String p : parts) if (!p.isEmpty()) tail = p;
            if (tail.isEmpty()) tail = url;
            String decoded = java.net.URLDecoder.decode(tail, java.nio.charset.StandardCharsets.UTF_8);
            return decoded.length() > 200 ? decoded.substring(0, 200) : decoded;
        } catch (Exception e) {
            return url.length() > 200 ? url.substring(0, 200) : url;
        }
    }

    public List<String> parseMentions(Object input) {
        if (!(input instanceof List<?> list)) return List.of();
        LinkedHashSet<String> seen = new LinkedHashSet<>();
        for (Object o : list) {
            if (!(o instanceof String id)) continue;
            if (id.isEmpty() || id.length() > 64) continue;
            seen.add(id);
            if (seen.size() >= 20) break;
        }
        return new ArrayList<>(seen);
    }

    public List<String> filterMentionsForServer(String serverId, List<String> raw, boolean canMentionEveryone) {
        List<String> out = new ArrayList<>();
        for (String id : raw) {
            if (EVERYONE_MENTIONS.contains(id)) {
                if (canMentionEveryone) out.add(id);
                continue;
            }
            if (members.isMember(serverId, id)) out.add(id);
        }
        return out;
    }

    public List<String> filterMentionsForDm(String dmId, List<String> raw) {
        List<String> out = new ArrayList<>();
        for (String id : raw) {
            if (dmParticipants.isParticipant(dmId, id)) out.add(id);
        }
        return out;
    }

    public String toJson(Object obj) {
        if (obj == null) return null;
        try {
            return mapper.writeValueAsString(obj);
        } catch (Exception e) {
            return null;
        }
    }
}
