package com.mihord.api.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class JsonUtil {

    private static ObjectMapper mapper;

    @Autowired
    public JsonUtil(ObjectMapper mapper) {
        JsonUtil.mapper = mapper;
    }

    public static String toJson(Object obj) {
        try {
            return mapper.writeValueAsString(obj);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public static <T> List<T> parseList(String raw, Class<T> clazz) {
        if (raw == null || raw.isEmpty()) return List.of();
        try {
            return mapper.readValue(raw, mapper.getTypeFactory().constructCollectionType(List.class, clazz));
        } catch (Exception e) {
            return List.of();
        }
    }

    public static List<String> parseStringList(String raw) {
        if (raw == null || raw.isEmpty()) return List.of();
        try {
            return mapper.readValue(raw, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }
}
