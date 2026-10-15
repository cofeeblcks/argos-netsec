import { Navigate, Outlet, useLocation } from "react-router";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { useAuth } from "@/auth/AuthProvider";

export function ProtectedRoute() {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="flex min-h-dvh items-center justify-center bg-primary">
                <LoadingIndicator type="line-spinner" size="md" label="Cargando sesión…" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    return <Outlet />;
}
