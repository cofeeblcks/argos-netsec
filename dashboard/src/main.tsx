import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { AuthProvider } from "@/auth/AuthProvider";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { ArgosShell } from "@/components/argos-shell";
import { LoginPage } from "@/pages/login-page";
import { NotFound } from "@/pages/not-found";
import { RouteProvider } from "@/providers/router-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { ActividadView } from "@/views/Actividad";
import { ExposicionView } from "@/views/Exposicion";
import { MapaRedView } from "@/views/MapaRed";
import { ResumenView } from "@/views/Resumen";
import "@/styles/globals.css";
import "@/styles/argos.css";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ThemeProvider defaultTheme="dark">
            <BrowserRouter>
                <RouteProvider>
                    <AuthProvider>
                        <Routes>
                            <Route path="/login" element={<LoginPage />} />

                            <Route element={<ProtectedRoute />}>
                                <Route element={<ArgosShell />}>
                                    <Route path="/" element={<ResumenView />} />
                                    <Route path="/mapa" element={<MapaRedView />} />
                                    <Route path="/exposicion" element={<ExposicionView />} />
                                    <Route path="/actividad" element={<ActividadView />} />
                                </Route>
                            </Route>

                            <Route path="/home" element={<Navigate to="/" replace />} />
                            <Route path="*" element={<NotFound />} />
                        </Routes>
                    </AuthProvider>
                </RouteProvider>
            </BrowserRouter>
        </ThemeProvider>
    </StrictMode>,
);
