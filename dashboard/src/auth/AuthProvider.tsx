import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi, type AuthUser, type LoginPayload } from "@/api/auth";
import { storage } from "@/lib/storage";
import { usingDemoMode } from "@/data/source";

type AuthContextValue = {
    user: AuthUser | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (payload: LoginPayload) => Promise<void>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(() => storage.getToken());
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(Boolean(storage.getToken()));

    const clearSession = useCallback(() => {
        storage.clearToken();
        setToken(null);
        setUser(null);
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function boot() {
            const existing = storage.getToken();
            if (!existing) {
                setIsLoading(false);
                return;
            }

            if (usingDemoMode() && existing === "demo-token") {
                if (!cancelled) {
                    setToken(existing);
                    setUser({ id: 1, name: "Argos Admin", email: "admin@argos.local" });
                    setIsLoading(false);
                }
                return;
            }

            try {
                const me = await authApi.me();
                if (!cancelled) {
                    setToken(existing);
                    setUser(me);
                }
            } catch {
                if (!cancelled) {
                    clearSession();
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }

        void boot();
        return () => {
            cancelled = true;
        };
    }, [clearSession]);

    const login = useCallback(async (payload: LoginPayload) => {
        if (usingDemoMode()) {
            // Demo portfolio: accept seed credentials without hitting API
            if (payload.email === "admin@argos.local" && payload.password === "password") {
                storage.setToken("demo-token");
                setToken("demo-token");
                setUser({ id: 1, name: "Argos Admin", email: "admin@argos.local" });
                return;
            }
            throw new Error("Credenciales inválidas (demo: admin@argos.local / password)");
        }

        const res = await authApi.login(payload);
        storage.setToken(res.accessToken);
        setToken(res.accessToken);
        setUser(res.user);
    }, []);

    const logout = useCallback(async () => {
        try {
            if (storage.getToken() && storage.getToken() !== "demo-token") {
                await authApi.logout();
            }
        } catch {
            // ignore network errors on logout
        } finally {
            clearSession();
        }
    }, [clearSession]);

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            token,
            isLoading,
            isAuthenticated: Boolean(token && user),
            login,
            logout,
        }),
        [user, token, isLoading, login, logout],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return ctx;
}
