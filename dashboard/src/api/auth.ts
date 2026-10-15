import { apiRequest } from "@/api/client";

export type AuthUser = {
    id: number;
    name: string;
    email: string;
};

export type LoginPayload = {
    email: string;
    password: string;
};

export type LoginData = {
    tokenType: string;
    accessToken: string;
    user: AuthUser;
};

export const authApi = {
    login(payload: LoginPayload) {
        return apiRequest<LoginData>("/api/v1/auth/login", {
            method: "POST",
            body: payload,
            auth: false,
        });
    },
    me() {
        return apiRequest<AuthUser>("/api/v1/auth/me");
    },
    logout() {
        return apiRequest<unknown>("/api/v1/auth/logout", { method: "POST" });
    },
};
