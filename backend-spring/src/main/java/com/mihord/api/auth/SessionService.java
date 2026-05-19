package com.mihord.api.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Service;

@Service
public class SessionService {

    public static final String USER_ID_ATTR = "USER_ID";

    public void setUserId(HttpServletRequest request, String userId) {
        HttpSession session = request.getSession(true);
        session.setAttribute(USER_ID_ATTR, userId);
    }

    public String getUserId(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) return null;
        Object v = session.getAttribute(USER_ID_ATTR);
        return v instanceof String ? (String) v : null;
    }

    public void invalidate(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) session.invalidate();
    }
}
