import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MetricCard } from "@/components/metric-card";
import { Badge } from "@/components/base/badges/badges";
import type { BadgeColors } from "@/components/base/badges/badge-types";
import { fetchAlerts, fetchDevices, fetchEvents, fetchServices, fetchSummary } from "@/data/source";
import type { AlertItem, Device, EventItem, Service, Summary } from "@/types/argos";

const SEV_COLORS = {
    low: "#2A9D8F",
    medium: "#E9C46A",
    high: "#F4A261",
    critical: "#ED1C24",
    unknown: "#6B7280",
};

export function ResumenView() {
    const [summary, setSummary] = useState<Summary | null>(null);
    const [alerts, setAlerts] = useState<AlertItem[]>([]);
    const [devices, setDevices] = useState<Device[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [events, setEvents] = useState<EventItem[]>([]);

    useEffect(() => {
        void (async () => {
            const [s, a, d, svc, ev] = await Promise.all([
                fetchSummary(),
                fetchAlerts(),
                fetchDevices(),
                fetchServices(),
                fetchEvents(),
            ]);
            setSummary(s);
            setAlerts(a);
            setDevices(d);
            setServices(svc);
            setEvents(ev);
        })();
    }, []);

    const alertChart = useMemo(() => {
        const bySev = summary?.alertsBySeverity;
        const counts = {
            low: bySev?.low ?? 0,
            medium: bySev?.medium ?? 0,
            high: bySev?.high ?? 0,
            critical: bySev?.critical ?? 0,
        };
        if (!bySev) {
            for (const a of alerts.filter((x) => x.status === "open")) {
                counts[a.severity] += 1;
            }
        }
        return [
            { name: "Low", key: "low", value: counts.low },
            { name: "Medium", key: "medium", value: counts.medium },
            { name: "High", key: "high", value: counts.high },
            { name: "Critical", key: "critical", value: counts.critical },
        ];
    }, [alerts, summary]);

    const riskChart = useMemo(() => {
        const breakdown = summary?.riskBreakdown;
        if (breakdown) {
            return (["low", "medium", "high", "critical", "unknown"] as const).map((key) => ({
                name: key,
                value: breakdown[key] ?? 0,
            }));
        }
        const counts: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0, unknown: 0 };
        for (const d of devices) {
            counts[d.risk] = (counts[d.risk] ?? 0) + 1;
        }
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [devices, summary]);

    const openHigh =
        summary?.alertsHighCritical ??
        alerts.filter((a) => a.status === "open" && (a.severity === "high" || a.severity === "critical")).length;

    const recentAlerts = useMemo(
        () =>
            alerts
                .slice()
                .sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt))
                .slice(0, 6),
        [alerts],
    );

    const recentEvents = useMemo(
        () =>
            events
                .slice()
                .sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt))
                .slice(0, 6),
        [events],
    );

    const riskyServices = useMemo(
        () =>
            services
                .filter((s) => s.severity === "high" || s.severity === "critical" || (s.cveIds?.length ?? 0) > 0)
                .slice()
                .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
                .slice(0, 6),
        [services],
    );

    if (!summary) {
        return <p className="text-md text-tertiary">Cargando resumen…</p>;
    }

    const openPorts = summary.openPorts ?? services.length;
    const cveUnique = summary.cveUnique ?? new Set(services.flatMap((s) => s.cveIds ?? [])).size;
    const devicesWithOs = summary.devicesWithOs ?? devices.filter((d) => Boolean(d.osGuess)).length;
    const devicesAuthorized = summary.devicesAuthorized ?? devices.filter((d) => d.authorized).length;
    const events24h = summary.events24h ?? events.length;
    const sensorsOnline = summary.sensorsOnline ?? summary.sensors?.filter((s) => s.online).length ?? 0;
    const sensorsTotal = summary.sensorsTotal ?? summary.sensors?.length ?? 0;
    const servicesHigh = summary.servicesHighSeverity ?? services.filter((s) => s.severity === "high" || s.severity === "critical").length;

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-1">
                <h1 className="text-display-sm font-semibold text-primary">Resumen</h1>
                <p className="text-md text-tertiary">Inventario, exposición, alertas y salud de sensores</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Dispositivos" value={summary.devicesTotal} hint={`${devicesAuthorized} autorizados`} />
                <MetricCard
                    label="No autorizados"
                    value={summary.devicesUnauthorized}
                    hint="Requieren revisión"
                    accent={summary.devicesUnauthorized > 0}
                />
                <MetricCard
                    label="Alertas abiertas"
                    value={summary.alertsOpen}
                    hint={`${openHigh} high/critical`}
                    accent={openHigh > 0}
                />
                <MetricCard label="Riesgo promedio" value={summary.riskAverage} hint="Media del inventario" />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Puertos abiertos" value={openPorts} hint={`${servicesHigh} sev. alta+`} accent={servicesHigh > 0} />
                <MetricCard label="CVE únicos" value={cveUnique} hint="En servicios escaneados" accent={cveUnique > 0} />
                <MetricCard label="SO detectado" value={devicesWithOs} hint={`de ${summary.devicesTotal} hosts`} />
                <MetricCard
                    label="Eventos 24h"
                    value={events24h}
                    hint={`${summary.devicesSeen24h ?? "—"} hosts vistos`}
                />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    label="Sensores online"
                    value={`${sensorsOnline}/${sensorsTotal || "—"}`}
                    hint="Latido < 15 min"
                    accent={sensorsTotal > 0 && sensorsOnline < sensorsTotal}
                />
                <MetricCard
                    label="Hosts con puertos"
                    value={devices.filter((d) => services.some((s) => s.deviceId === d.id)).length}
                    hint="Tras deep scan"
                />
                <MetricCard
                    label="Riesgo alto+"
                    value={
                        summary.riskBreakdown
                            ? (summary.riskBreakdown.high ?? 0) + (summary.riskBreakdown.critical ?? 0)
                            : devices.filter((d) => d.risk === "high" || d.risk === "critical").length
                    }
                    hint="Dispositivos"
                    accent={
                        (summary.riskBreakdown
                            ? (summary.riskBreakdown.high ?? 0) + (summary.riskBreakdown.critical ?? 0)
                            : devices.filter((d) => d.risk === "high" || d.risk === "critical").length) > 0
                    }
                />
                <MetricCard
                    label="Servicios con CVE"
                    value={services.filter((s) => (s.cveIds?.length ?? 0) > 0).length}
                    hint="Requieren parcheo"
                    accent={services.some((s) => (s.cveIds?.length ?? 0) > 0)}
                />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div className="rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary">
                    <h2 className="text-lg font-semibold text-primary">Alertas abiertas por severidad</h2>
                    <p className="mt-1 text-sm text-tertiary">Estado open</p>
                    <div className="mt-6 h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={alertChart} barSize={28}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border-secondary" />
                                <XAxis dataKey="name" tickLine={false} axisLine={false} className="text-xs" />
                                <YAxis allowDecimals={false} tickLine={false} axisLine={false} className="text-xs" />
                                <Tooltip cursor={{ fill: "var(--color-bg-secondary, #f5f5f5)" }} />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                    {alertChart.map((entry) => (
                                        <Cell key={entry.key} fill={SEV_COLORS[entry.key as keyof typeof SEV_COLORS]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary">
                    <h2 className="text-lg font-semibold text-primary">Dispositivos por riesgo</h2>
                    <p className="mt-1 text-sm text-tertiary">Distribución del inventario</p>
                    <div className="mt-6 h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={riskChart} barSize={28}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border-secondary" />
                                <XAxis dataKey="name" tickLine={false} axisLine={false} className="text-xs" />
                                <YAxis allowDecimals={false} tickLine={false} axisLine={false} className="text-xs" />
                                <Tooltip cursor={{ fill: "var(--color-bg-secondary, #f5f5f5)" }} />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                    {riskChart.map((entry) => (
                                        <Cell key={entry.name} fill={SEV_COLORS[entry.name as keyof typeof SEV_COLORS] ?? SEV_COLORS.unknown} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
                <DataCard title="Dispositivos recientes" badge={String(devices.length)} className="xl:col-span-3">
                    <SimpleTable
                        headers={["Host", "IP", "SO", "Puertos", "Estado", "Riesgo"]}
                        rows={devices.slice(0, 8).map((d) => {
                            const ports = services.filter((s) => s.deviceId === d.id).length;
                            return [
                                <div key="h" className="flex flex-col">
                                    <span className="font-medium text-primary">{d.hostname ?? d.mac}</span>
                                    <span className="text-xs text-tertiary">{d.vendor ?? "—"}</span>
                                </div>,
                                d.ip,
                                d.osGuess ?? "—",
                                String(ports),
                                <Badge key="a" color={d.authorized ? "success" : "error"} size="sm">
                                    {d.authorized ? "Autorizado" : "Desconocido"}
                                </Badge>,
                                <Badge key="r" color={riskColor(d.risk)} size="sm">
                                    {d.risk}
                                </Badge>,
                            ];
                        })}
                    />
                </DataCard>

                <DataCard
                    title="Puertos más frecuentes"
                    description="Top exposición en la LAN"
                    badge={String(summary.topPorts?.length ?? 0)}
                    className="xl:col-span-2"
                >
                    <SimpleTable
                        headers={["Puerto", "Servicio", "Hosts"]}
                        rows={(summary.topPorts ?? aggregateTopPorts(services)).map((p) => [
                            <span key="p" className="font-mono font-medium text-primary">
                                {p.port}/{p.protocol}
                            </span>,
                            p.name ?? "—",
                            String(p.count),
                        ])}
                    />
                </DataCard>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <DataCard title="Alertas recientes" badge={String(recentAlerts.length)}>
                    <SimpleTable
                        headers={["Regla", "Sev.", "Cuándo"]}
                        rows={recentAlerts.map((a) => [
                            <div key="r" className="flex flex-col">
                                <span className="font-medium text-primary">{a.rule}</span>
                                <span className="text-xs text-tertiary">
                                    {a.srcIp ?? "—"} → {a.dstIp ?? "—"}
                                </span>
                            </div>,
                            <Badge key="s" color={riskColor(a.severity)} size="sm">
                                {a.severity}
                            </Badge>,
                            formatWhen(a.occurredAt),
                        ])}
                    />
                </DataCard>

                <DataCard title="Eventos recientes" badge={String(recentEvents.length)}>
                    <SimpleTable
                        headers={["Tipo", "Host", "Cuándo"]}
                        rows={recentEvents.map((e) => [
                            e.type,
                            e.deviceMac ?? (e.deviceId != null ? `#${e.deviceId}` : "—"),
                            formatWhen(e.occurredAt),
                        ])}
                    />
                </DataCard>

                <DataCard title="Servicios en riesgo" badge={String(riskyServices.length)} description="Alta severidad o con CVE">
                    <SimpleTable
                        headers={["Puerto", "Servicio", "Sev."]}
                        rows={riskyServices.map((s) => {
                            const device = devices.find((d) => d.id === s.deviceId);
                            return [
                                <div key="p" className="flex flex-col">
                                    <span className="font-mono font-medium text-primary">
                                        {s.port}/{s.protocol}
                                    </span>
                                    <span className="text-xs text-tertiary">{device?.ip ?? s.deviceMac ?? "—"}</span>
                                </div>,
                                <div key="n" className="flex flex-col">
                                    <span>{s.name ?? "—"}</span>
                                    <span className="text-xs text-tertiary">
                                        {s.cveIds?.length ? s.cveIds.slice(0, 2).join(", ") : s.version ?? "—"}
                                    </span>
                                </div>,
                                <Badge key="s" color={riskColor(s.severity)} size="sm">
                                    {s.severity}
                                </Badge>,
                            ];
                        })}
                    />
                </DataCard>
            </div>

            {summary.sensors?.length ? (
                <DataCard title="Sensores" description="Último latido (online si < 15 min)">
                    <SimpleTable
                        headers={["Nombre", "Tipo", "Estado", "Último latido"]}
                        rows={summary.sensors.map((s) => [
                            s.name,
                            s.kind,
                            <Badge key="o" color={s.online ? "success" : "warning"} size="sm">
                                {s.online ? "Online" : "Sin latido"}
                            </Badge>,
                            s.lastSeenAt ? new Date(s.lastSeenAt).toLocaleString() : "Nunca",
                        ])}
                    />
                </DataCard>
            ) : null}
        </div>
    );
}

function aggregateTopPorts(services: Service[]) {
    const map = new Map<string, { port: number; protocol: string; count: number; name: string | null }>();
    for (const s of services) {
        const key = `${s.port}/${s.protocol}`;
        const cur = map.get(key);
        if (cur) {
            cur.count += 1;
        } else {
            map.set(key, { port: s.port, protocol: s.protocol, count: 1, name: s.name });
        }
    }
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 5);
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

function formatWhen(iso: string): string {
    try {
        return new Date(iso).toLocaleString();
    } catch {
        return iso;
    }
}

function severityRank(s: string): number {
    switch (s) {
        case "critical":
            return 4;
        case "high":
            return 3;
        case "medium":
            return 2;
        case "low":
            return 1;
        default:
            return 0;
    }
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
