import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MetricCard } from "@/components/metric-card";
import { Badge } from "@/components/base/badges/badges";
import type { BadgeColors } from "@/components/base/badges/badge-types";
import { fetchAlerts, fetchDevices, fetchSummary } from "@/data/source";
import type { AlertItem, Device, Summary } from "@/types/argos";

export function ResumenView() {
    const [summary, setSummary] = useState<Summary | null>(null);
    const [alerts, setAlerts] = useState<AlertItem[]>([]);
    const [devices, setDevices] = useState<Device[]>([]);

    useEffect(() => {
        void (async () => {
            const [s, a, d] = await Promise.all([fetchSummary(), fetchAlerts(), fetchDevices()]);
            setSummary(s);
            setAlerts(a);
            setDevices(d);
        })();
    }, []);

    const chartData = useMemo(() => {
        const counts = { low: 0, medium: 0, high: 0, critical: 0 };
        for (const a of alerts.filter((x) => x.status === "open")) {
            counts[a.severity] += 1;
        }
        return [
            { name: "Low", value: counts.low },
            { name: "Medium", value: counts.medium },
            { name: "High", value: counts.high },
            { name: "Critical", value: counts.critical },
        ];
    }, [alerts]);

    if (!summary) {
        return <p className="text-md text-tertiary">Cargando resumen…</p>;
    }

    const openHigh = alerts.filter((a) => a.status === "open" && (a.severity === "high" || a.severity === "critical")).length;

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-1">
                <h1 className="text-display-sm font-semibold text-primary">Resumen</h1>
                <p className="text-md text-tertiary">Inventario y alertas de la red local</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Dispositivos" value={summary.devicesTotal} hint="Vistos en la red" />
                <MetricCard
                    label="No autorizados"
                    value={summary.devicesUnauthorized}
                    hint="Requieren revisión"
                    accent={summary.devicesUnauthorized > 0}
                />
                <MetricCard label="Alertas abiertas" value={summary.alertsOpen} hint={`${openHigh} high/critical`} />
                <MetricCard label="Riesgo promedio" value={summary.riskAverage} />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
                <div className="rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary xl:col-span-2">
                    <h2 className="text-lg font-semibold text-primary">Alertas por severidad</h2>
                    <p className="mt-1 text-sm text-tertiary">Solo estado open</p>
                    <div className="mt-6 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} barSize={28}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border-secondary" />
                                <XAxis dataKey="name" tickLine={false} axisLine={false} className="text-xs" />
                                <YAxis allowDecimals={false} tickLine={false} axisLine={false} className="text-xs" />
                                <Tooltip cursor={{ fill: "var(--color-bg-secondary, #f5f5f5)" }} />
                                <Bar dataKey="value" fill="#ED1C24" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <DataCard title="Dispositivos recientes" badge={String(devices.length)} className="xl:col-span-3">
                    <SimpleTable
                        headers={["Host", "IP", "Estado", "Riesgo"]}
                        rows={devices.map((d) => [
                            <div key="h" className="flex flex-col">
                                <span className="font-medium text-primary">{d.hostname ?? d.mac}</span>
                                <span className="text-xs text-tertiary">{d.vendor ?? "—"}</span>
                            </div>,
                            d.ip,
                            <Badge key="a" color={d.authorized ? "success" : "error"} size="sm">
                                {d.authorized ? "Autorizado" : "Desconocido"}
                            </Badge>,
                            <Badge key="r" color={riskColor(d.risk)} size="sm">
                                {d.risk}
                            </Badge>,
                        ])}
                    />
                </DataCard>
            </div>

            {summary.sensors?.length ? (
                <DataCard title="Sensores" description="Último latido reportado">
                    <SimpleTable
                        headers={["Nombre", "Tipo", "Último latido"]}
                        rows={summary.sensors.map((s) => [
                            s.name,
                            s.kind,
                            s.lastSeenAt ? new Date(s.lastSeenAt).toLocaleString() : "Sin latido",
                        ])}
                    />
                </DataCard>
            ) : null}
        </div>
    );
}

function DataCard({
    title,
    description,
    badge,
    children,
    className = "",
}: {
    title: string;
    description?: string;
    badge?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={`overflow-hidden rounded-xl bg-primary shadow-xs ring-1 ring-secondary ${className}`}>
            <div className="flex items-start justify-between gap-4 border-b border-secondary px-5 py-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-md font-semibold text-primary">{title}</h2>
                        {badge ? (
                            <Badge color="gray" size="sm" type="modern">
                                {badge}
                            </Badge>
                        ) : null}
                    </div>
                    {description ? <p className="mt-0.5 text-sm text-tertiary">{description}</p> : null}
                </div>
            </div>
            {children}
        </div>
    );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead className="bg-secondary">
                    <tr>
                        {headers.map((h) => (
                            <th key={h} className="px-5 py-2.5 text-left text-xs font-semibold text-quaternary">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((cells, i) => (
                        <tr key={i} className="border-t border-secondary hover:bg-secondary">
                            {cells.map((cell, j) => (
                                <td key={j} className="px-5 py-3.5 text-sm text-tertiary">
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                    {!rows.length ? (
                        <tr>
                            <td colSpan={headers.length} className="px-5 py-8 text-center text-sm text-tertiary">
                                Sin datos
                            </td>
                        </tr>
                    ) : null}
                </tbody>
            </table>
        </div>
    );
}

function riskColor(risk: string): BadgeColors {
    switch (risk) {
        case "low":
            return "success";
        case "medium":
            return "warning";
        case "high":
            return "orange";
        case "critical":
            return "error";
        default:
            return "gray";
    }
}
