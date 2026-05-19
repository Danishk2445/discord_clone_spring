package com.mihord.api.ws;

import com.mihord.api.auth.SessionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

/** Resolves the Spring Session via the SessionRepositoryFilter and pulls USER_ID into
 * the WebSocket session attributes. Rejects the upgrade if no authenticated session. */
@Component
public class RealtimeHandshakeInterceptor implements HandshakeInterceptor {

    public static final String USER_ID_KEY = "userId";

    @Override
    public boolean beforeHandshake(ServerHttpRequest request,
                                   ServerHttpResponse response,
                                   WebSocketHandler wsHandler,
                                   Map<String, Object> attributes) {
        if (!(request instanceof ServletServerHttpRequest servletRequest)) {
            return false;
        }
        HttpServletRequest req = servletRequest.getServletRequest();
        HttpSession session = req.getSession(false);
        if (session == null) {
            return false;
        }
        Object userId = session.getAttribute(SessionService.USER_ID_ATTR);
        if (!(userId instanceof String uid) || uid.isEmpty()) {
            return false;
        }
        attributes.put(USER_ID_KEY, uid);
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request,
                               ServerHttpResponse response,
                               WebSocketHandler wsHandler,
                               Exception exception) {
    }
}
