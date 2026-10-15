import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/base/badges/badges";
import type { BadgeColors } from "@/components/base/badges/badge-types";
import { Button } from "@/components/base/buttons/button";
import { fetchAlerts, fetchEvents, updateAlertStatus, usingDemoMode } from "@/data/source";
import type { AlertItem, EventItem } from "@/types/argos";

export function ActividadView() {
    const [alerts, setAlerts] = useState<AlertItem[]>([]);
    const [events, setEvents] = useState<EventItem[]>([]);
    const demo = usingDemoMode();

    const refresh = useCallback(async () => {
        const [a, e] = await Promise.all([fetchAlerts(), fetchEvents()]);
        setAlerts(a);
        setEvents(e);
    }, []);

    useEffect(() => {
        void refresh();
        const id = window.setInterval(() => void refresh(), 15_000);
        return () => window.clearInterval(id);
    }, [refresh]);

    async function patch(id: number, status: "acked" | "false_positive") {
        if (demo) {
            setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
            return;
        }
        await updateAlertStatus(id, status);
        await refresh();
    }

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-1">
                <h1 className="text-display-sm font-semibold text-primary">Actividad</h1>
                <p className="text-md text-tertiary">Alertas y eventos · polling cada 15s</p>
            </div>

            <div className="overflow-hidden rounded-xl bg-primary shadow-xs ring-1 ring-secondary">
                <div className="border-b border-secondary px-5 py-4">
                    <div className="flex items-center gap-2">
                        <h2 className="text-md font-semibold text-primary">Alertas</h2>
                        <Badge color="gray" size="sm" type="modern">
                            {alerts.filter((a) => a.status === "open").length} open
                        </Badge>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-secondary">
                            <tr>
                                {["Cuando", "Regla", "Severidad", "Src → Dst", "Estado", ""].map((h) => (
                                    <th key={h || "actions"} className="px-5 py-2.5 text-left text-xs font-semibold text-quaternary">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {alerts.map((a) => (
                                <tr key={a.id} className="border-t border-secondary hover:bg-secondary">
                                    <td className="px-5 py-3.5 text-sm text-tertiary">{new Date(a.occurredAt).toLocaleString()}</td>
                                    <td className="px-5 py-3.5 text-sm font-medium text-primary">{a.rule}</td>
                                    <td className="px-5 py-3.5">
                                        <Badge color={sevColor(a.severity)} size="sm">
                                            {a.severity}
                                        </Badge>
                                    </td>
                                    <td className="px-5 py-3.5 text-sm text-tertiary">
                                        {a.srcIp ?? "—"} → {a.dstIp ?? "—"}
                                    </td>
                                    <td className="px-5 py-3.5 text-sm text-tertiary">{a.status}</td>
                                    <td className="px-5 py-3.5">
                                        {a.status === "open" ? (
                                            <div className="flex gap-2">
                                                <Button size="sm" color="secondary" onClick={() => void patch(a.id, "acked")}>
                                                    Acusar
                                                </Button>
                                                <Button size="sm" color="tertiary" onClick={() => void patch(a.id, "false_positive")}>
                                                    FP
                                                </Button>
                                            </div>
                                        ) : null}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="overflow-hidden rounded-xl bg-primary shadow-xs ring-1 ring-secondary">
                <div className="border-b border-secondary px-5 py-4">
                    <h2 className="text-md font-semibold text-primary">Eventos</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-secondary">
                            <tr>
                                {["Cuando", "Tipo", "Detalle"].map((h) => (
                                    <th key={h} className="px-5 py-2.5 text-left text-xs font-semibold text-quaternary">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {events.map((e) => (
                                <tr key={e.id} className="border-t border-secondary hover:bg-secondary">
                                    <td className="px-5 py-3.5 text-sm text-tertiary">{new Date(e.occurredAt).toLocaleString()}</td>
                                    <td className="px-5 py-3.5 text-sm font-medium text-primary">{e.type}</td>
                                    <td className="px-5 py-3.5 font-mono text-xs text-tertiary">{JSON.stringify(e.detail)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function sevColor(s: string): BadgeColors {
    if (s === "critical") return "error";
    if (s === "high") return "orange";
    if (s === "medium") return "warning";
    if (s === "low") return "success";
    return "gray";
}
