package com.mihord.api.auth;

import com.mihord.api.error.ApiException;
import com.mihord.api.user.UserEntity;
import com.mihord.api.user.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.MethodParameter;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

@Component
public class CurrentUserArgumentResolver implements HandlerMethodArgumentResolver {

    private final SessionService sessions;
    private final UserRepository users;

    public CurrentUserArgumentResolver(SessionService sessions, UserRepository users) {
        this.sessions = sessions;
        this.users = users;
    }

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(CurrentUser.class)
            && parameter.getParameterType().equals(UserEntity.class);
    }

    @Override
    public Object resolveArgument(MethodParameter parameter,
                                  ModelAndViewContainer mavContainer,
                                  NativeWebRequest webRequest,
                                  WebDataBinderFactory binderFactory) {
        HttpServletRequest req = webRequest.getNativeRequest(HttpServletRequest.class);
        if (req == null) throw ApiException.unauthorized("not_authenticated");
        String userId = sessions.getUserId(req);
        if (userId == null) throw ApiException.unauthorized("not_authenticated");
        return users.findById(userId).orElseThrow(() -> ApiException.unauthorized("session_expired"));
    }
}
