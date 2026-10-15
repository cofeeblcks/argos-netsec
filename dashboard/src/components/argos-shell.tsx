import { Outlet, NavLink, useLocation, useNavigate } from "react-router";
import { Bell01, LogOut01 } from "@untitledui/icons";
import { useAuth } from "@/auth/AuthProvider";
import { MobileNavigationHeader } from "@/components/application/app-navigation/base-components/mobile-header";
import { NavItemBase } from "@/components/application/app-navigation/base-components/nav-item";
import { NavList } from "@/components/application/app-navigation/base-components/nav-list";
import { ArgosLogo } from "@/components/argos-logo";
import { BadgeWithDot } from "@/components/base/badges/badges";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { usingDemoMode } from "@/data/source";
import { cx } from "@/utils/cx";

const navItems = [
    { label: "Resumen", href: "/" },
    { label: "Mapa", href: "/mapa" },
    { label: "Exposición", href: "/exposicion" },
    { label: "Actividad", href: "/actividad" },
];

export function ArgosShell() {
    const navigate = useNavigate();
    const location = useLocation();
    const demo = usingDemoMode();
    const { user, logout } = useAuth();

    async function onLogout() {
        await logout();
        navigate("/login", { replace: true });
    }

    return (
        <div className="flex min-h-dvh flex-col bg-secondary">
            <MobileNavigationHeader>
                <aside className="flex h-full max-w-full flex-col justify-between overflow-auto bg-primary pt-4">
                    <div className="flex flex-col gap-5 px-4">
                        <ArgosLogo
                            onClick={(e) => {
                                e.preventDefault();
                                navigate("/");
                            }}
                        />
                    </div>
                    <NavList items={navItems} activeUrl={location.pathname} />
                    <div className="mt-auto flex flex-col gap-3 p-4">
                        <NavItemBase type="link" href="/actividad" icon={Bell01}>
                            Alertas
                        </NavItemBase>
                        <button
                            type="button"
                            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-secondary hover:bg-primary_hover"
                            onClick={() => void onLogout()}
                        >
                            <LogOut01 className="size-5 text-fg-quaternary" />
                            Cerrar sesión
                        </button>
                    </div>
                </aside>
            </MobileNavigationHeader>

            {/* Desktop header — Untitled UI Dashboards 02 / Dashboard 04 pattern */}
            <header className="max-lg:hidden">
                <section className="flex h-16 w-full items-center justify-center border-b border-secondary bg-primary">
                    <div className="flex w-full max-w-container items-center gap-8 pr-3 pl-4 md:px-8">
                        <ArgosLogo
                            onClick={(e) => {
                                e.preventDefault();
                                navigate("/");
                            }}
                        />

                        <nav>
                            <ul className="flex items-center gap-0.5">
                                {navItems.map((item) => (
                                    <li key={item.href}>
                                        <NavLink
                                            to={item.href}
                                            end={item.href === "/"}
                                            className={({ isActive }) =>
                                                cx(
                                                    "flex items-center rounded-md px-2.5 py-1.5 text-sm font-semibold text-quaternary transition duration-100 hover:bg-primary_hover hover:text-secondary_hover",
                                                    isActive && "bg-secondary text-secondary_hover",
                                                )
                                            }
                                        >
                                            {item.label}
                                        </NavLink>
                                    </li>
                                ))}
                            </ul>
                        </nav>

                        <div className="ml-auto flex items-center gap-2">
                            {demo ? (
                                <BadgeWithDot color="brand" type="modern" size="sm">
                                    Demo
                                </BadgeWithDot>
                            ) : (
                                <BadgeWithDot color="success" type="modern" size="sm">
                                    Live
                                </BadgeWithDot>
                            )}
                            {user ? <span className="hidden text-sm text-tertiary xl:inline">{user.email}</span> : null}
                            <ButtonUtility size="sm" color="tertiary" tooltip="Cerrar sesión" icon={LogOut01} onClick={() => void onLogout()} />
                        </div>
                    </div>
                </section>
            </header>

            <main className="mx-auto w-full flex-1 px-4 py-8 md:px-8">
                <Outlet />
            </main>
        </div>
    );
}
