import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { ApiError } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { ArgosLogo } from "@/components/argos-logo";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { usingDemoMode } from "@/data/source";

/**
 * Split-screen login patterned after Untitled UI
 * https://www.untitledui.com/react/components/log-in-pages/login-split-quote-image-01
 * Auth flow mirrors Unipaz SAGA (AuthProvider + redirect from).
 */
export function LoginPage() {
    const { login, isAuthenticated, isLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const demo = usingDemoMode();

    if (!isLoading && isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    async function onSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            await login({ email, password });
            const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
            navigate(from && from !== "/login" ? from : "/", { replace: true });
        } catch (err) {
            setError(err instanceof ApiError || err instanceof Error ? err.message : "No se pudo iniciar sesión");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="flex min-h-dvh w-full bg-primary">
            {/* Form column */}
            <div className="flex w-full flex-col justify-center px-4 py-12 lg:w-1/2 lg:px-12 xl:px-24">
                <div className="mx-auto w-full max-w-md">
                    <div className="mb-8 lg:hidden">
                        <ArgosLogo />
                    </div>

                    <div className="mb-8 flex flex-col gap-2">
                        <h1 className="text-display-sm font-semibold text-primary">Iniciar sesión</h1>
                        <p className="text-md text-tertiary">
                            Accede al panel de Argos NetSec para ver inventario, exposición y alertas.
                        </p>
                    </div>

                    <form onSubmit={onSubmit} className="flex flex-col gap-5">
                        <Input
                            label="Correo"
                            type="email"
                            name="email"
                            placeholder="admin@argos.local"
                            value={email}
                            onChange={setEmail}
                            isRequired
                            autoComplete="username"
                            size="md"
                        />

                        <Input
                            label="Contraseña"
                            type="password"
                            name="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={setPassword}
                            isRequired
                            autoComplete="current-password"
                            size="md"
                        />

                        {error ? <p className="text-sm text-error-primary">{error}</p> : null}

                        {demo ? (
                            <p className="rounded-lg bg-secondary px-3 py-2 text-sm text-tertiary ring-1 ring-secondary">
                                Modo demo: usa <span className="font-medium text-primary">admin@argos.local</span> /{" "}
                                <span className="font-medium text-primary">password</span>
                            </p>
                        ) : null}

                        <Button type="submit" size="lg" color="primary" isLoading={submitting} isDisabled={submitting} className="w-full">
                            Entrar
                        </Button>
                    </form>
                </div>
            </div>

            {/* Quote / brand panel */}
            <div className="relative hidden overflow-hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:p-12">
                <img
                    src="/bg-login.jpg"
                    alt=""
                    className="absolute inset-0 size-full object-cover"
                />
                <div className="absolute inset-0 bg-black/45" />

                <div className="relative z-10">
                    <ArgosLogo className="[&>span]:text-white [&>span>span]:text-white/70" />
                </div>

                <div className="relative z-10 flex flex-1 flex-col justify-center gap-8 py-16">
                    <blockquote className="max-w-lg text-display-xs font-medium text-white">
                        “Vigilancia local de la red: inventario, cambios y alertas en un solo panel.”
                    </blockquote>
                    <div>
                        <p className="text-md font-semibold text-white">Argos NetSec</p>
                        <p className="text-md text-white/70">Lab / red doméstica · Linux</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
