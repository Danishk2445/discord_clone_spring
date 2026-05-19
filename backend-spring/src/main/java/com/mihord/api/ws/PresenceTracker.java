package com.mihord.api.ws;

import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/** Refcounted online-presence tracker. Mirrors backend/src/ws/presence.ts. */
@Component
public class PresenceTracker {

    private final ConcurrentHashMap<String, AtomicInteger> connections = new ConcurrentHashMap<>();

    public void addConnection(String userId) {
        connections.computeIfAbsent(userId, k -> new AtomicInteger(0)).incrementAndGet();
    }

    public void removeConnection(String userId) {
        connections.computeIfPresent(userId, (k, c) -> {
            int n = c.decrementAndGet();
            return n <= 0 ? null : c;
        });
    }

    public boolean isOnline(String userId) {
        AtomicInteger c = connections.get(userId);
        return c != null && c.get() > 0;
    }
}
