import { useEffect, useMemo, useState } from "react";
import { MetricCard } from "@/components/metric-card";
import { Badge } from "@/components/base/badges/badges";
import type { BadgeColors } from "@/components/base/badges/badge-types";
import { Tabs } from "@/components/application/tabs/tabs";
import { fetchDevices, fetchServices } from "@/data/source";
import type { Device, Service, Severity } from "@/types/argos";

type HostScan = Device & {
    services: Service[];
    openPorts: number;
    cveCount: number;
    maxSeverity: Severity;
};

export function ExposicionView() {
    const [services, setServices] = useState<Service[]>([]);
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedKey, setSelectedKey] = useState<string>("hosts");

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                const [svc, devs] = await Promise.all([fetchServices(), fetchDevices()]);
                if (cancelled) return;
                setServices(svc);
                setDevices(devs);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const hosts = useMemo<HostScan[]>(() => {
        const byDevice = new Map<number, Service[]>();
        for (const s of services) {
            const list = byDevice.get(s.deviceId) ?? [];
            list.push(s);
            byDevice.set(s.deviceId, list);
        }
        return devices
            .map((d) => {
                const hostServices = (byDevice.get(d.id) ?? []).slice().sort((a, b) => a.port - b.port);
                return {
                    ...d,
                    services: hostServices,
                    openPorts: hostServices.length,
                    cveCount: hostServices.reduce((n, s) => n + (s.cveIds?.length ?? 0), 0),
                    maxSeverity: maxSeverity(hostServices.map((s) => s.severity)),
                };
            })
            .sort((a, b) => b.openPorts - a.openPorts || a.ip.localeCompare(b.ip));
    }, [devices, services]);

    const stats = useMemo(() => {
        const withOs = hosts.filter((h) => Boolean(h.osGuess)).length;
        const withPorts = hosts.filter((h) => h.openPorts > 0).length;
        const highSev = services.filter((s) => s.severity === "high" || s.severity === "critical").length;
        const cves = new Set(services.flatMap((s) => s.cveIds ?? [])).size;
        return {
            hosts: hosts.length,
            withPorts,
            openPorts: services.length,
            withOs,
            highSev,
            cves,
        };
    }, [hosts, services]);

    const portRows = useMemo(
        () =>
            services
                .slice()
                .sort((a, b) => a.port - b.port || a.protocol.localeCompare(b.protocol))
                .map((s) => {
                    const device = devices.find((d) => d.id === s.deviceId);
                    return { service: s, device };
                }),
        [services, devices],
    );

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-1">
                <h1 className="text-display-sm font-semibold text-primary">Exposición</h1>
                <p className="text-md text-tertiary">
                    Informe de escaneo: hosts, sistema operativo, puertos abiertos, servicios y CVE
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <MetricCard label="Hosts" value={stats.hosts} hint={`${stats.withPorts} con puertos`} />
                <MetricCard label="Puertos abiertos" value={stats.openPorts} hint="Tras deep scan (nmap -sV)" />
                <MetricCard label="SO detectado" value={stats.withOs} hint="Fingerprint o inferido" />
                <MetricCard label="Severidad alta+" value={stats.highSev} hint="high / critical" accent={stats.highSev > 0} />
                <MetricCard label="CVE únicos" value={stats.cves} hint="Desde scripts vulners" accent={stats.cves > 0} />
            </div>

            <Tabs selectedKey={selectedKey} onSelectionChange={(key) => setSelectedKey(String(key))} className="w-full">
                <Tabs.List type="underline" size="md" items={tabItems(stats)} className="w-full">
                    {(item) => <Tabs.Item {...item} />}
                </Tabs.List>

                <Tabs.Panel id="hosts" className="mt-6 outline-hidden">
                    {loading ? (
                        <p className="text-sm text-tertiary">Cargando…</p>
                    ) : !hosts.length ? (
                        <EmptyScanHint />
                    ) : (
                        <div className="flex flex-col gap-4">
                            {hosts.map((host) => (
                                <HostScanCard
                                    key={host.id}
                                    host={host}
                                    networkHasServices={stats.openPorts > 0}
                                />
                            ))}
                        </div>
                    )}
                </Tabs.Panel>

                <Tabs.Panel id="ports" className="mt-6 outline-hidden">
                    <SectionCard title="Escaneo de puertos" badge={String(portRows.length)} description="Puertos TCP/UDP abiertos por host">
                        <table className="w-full">
                            <thead className="bg-secondary">
                                <tr>
                                    {["Host", "IP", "Puerto", "Proto", "Estado", "Servicio", "Banner / versión"].map((h) => (
                                        <th key={h} className="px-5 py-2.5 text-left text-xs font-semibold text-quaternary">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {portRows.map(({ service: s, device }) => (
                                    <tr key={s.id} className="border-t border-secondary hover:bg-secondary">
                                        <td className="px-5 py-3.5 text-sm font-medium text-primary">
                                            {device?.hostname || device?.mac || "—"}
                                        </td>
                                        <td className="px-5 py-3.5 font-mono text-sm text-tertiary">{device?.ip ?? "—"}</td>
                                        <td className="px-5 py-3.5 text-sm font-medium text-primary">{s.port}</td>
                                        <td className="px-5 py-3.5 text-sm uppercase text-tertiary">{s.protocol}</td>
                                        <td className="px-5 py-3.5">
                                            <Badge color="success" size="sm">
                                                open
                                            </Badge>
                                        </td>
                                        <td className="px-5 py-3.5 text-sm text-tertiary">{s.name ?? "unknown"}</td>
                                        <td className="px-5 py-3.5 text-sm text-tertiary">{s.version ?? "—"}</td>
                                    </tr>
                                ))}
                                {!loading && !portRows.length ? (
                                    <tr>
                                        <td colSpan={7} className="px-5 py-8 text-center text-sm text-tertiary">
                                            Sin puertos. Ejecuta <code className="rounded bg-secondary px-1.5 py-0.5 text-primary">make scan</code>.
                                        </td>
                                    </tr>
                                ) : null}
                            </tbody>
                        </table>
                    </SectionCard>
                </Tabs.Panel>

                <Tabs.Panel id="services" className="mt-6 outline-hidden">
                    <SectionCard title="Servicios y vulnerabilidades" badge={String(services.length)} description="Identificación -sV, CVE y severidad">
                        <table className="w-full">
                            <thead className="bg-secondary">
                                <tr>
                                    {["Host", "MAC", "Puerto", "Proto", "Servicio", "Versión", "CVE", "Severidad", "Visto"].map((h) => (
                                        <th key={h} className="px-5 py-2.5 text-left text-xs font-semibold text-quaternary">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {services.map((s) => {
                                    const device = devices.find((d) => d.id === s.deviceId);
                                    return (
                                        <tr key={s.id} className="border-t border-secondary hover:bg-secondary">
                                            <td className="px-5 py-3.5 text-sm font-medium text-primary">
                                                {device?.hostname || device?.ip || "—"}
                                            </td>
                                            <td className="px-5 py-3.5 font-mono text-sm text-tertiary">
                                                {s.deviceMac ?? device?.mac ?? "—"}
                                            </td>
                                            <td className="px-5 py-3.5 text-sm font-medium text-primary">{s.port}</td>
                                            <td className="px-5 py-3.5 text-sm text-tertiary">{s.protocol}</td>
                                            <td className="px-5 py-3.5 text-sm text-tertiary">{s.name ?? "—"}</td>
                                            <td className="px-5 py-3.5 text-sm text-tertiary">{s.version ?? "—"}</td>
                                            <td className="px-5 py-3.5 text-sm text-tertiary">
                                                {s.cveIds?.length ? s.cveIds.join(", ") : "—"}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <Badge color={sevColor(s.severity)} size="sm">
                                                    {s.severity}
                                                </Badge>
                                            </td>
                                            <td className="px-5 py-3.5 text-sm text-tertiary">{formatWhen(s.lastSeen)}</td>
                                        </tr>
                                    );
                                })}
                                {!loading && !services.length ? (
                                    <tr>
                                        <td colSpan={9} className="px-5 py-8 text-center text-sm text-tertiary">
                                            Sin servicios detectados todavía.
                                        </td>
                                    </tr>
                                ) : null}
                            </tbody>
                        </table>
                    </SectionCard>
                </Tabs.Panel>
            </Tabs>
        </div>
    );
}

function HostScanCard({ host, networkHasServices }: { host: HostScan; networkHasServices: boolean }) {
    return (
        <div className="overflow-hidden rounded-xl bg-primary shadow-xs ring-1 ring-secondary">
            <div className="flex flex-col gap-4 border-b border-secondary px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-md font-semibold text-primary">{host.hostname || host.ip}</h2>
                        <Badge color={host.authorized ? "success" : "error"} size="sm">
                            {host.authorized ? "Autorizado" : "No autorizado"}
                        </Badge>
                        <Badge color={sevColor(host.risk)} size="sm">
                            riesgo {host.risk}
                        </Badge>
                        {host.openPorts > 0 ? (
                            <Badge color={sevColor(host.maxSeverity)} size="sm">
                                {host.openPorts} puerto{host.openPorts === 1 ? "" : "s"}
                            </Badge>
                        ) : (
                            <Badge color="gray" size="sm">
                                0 puertos
                            </Badge>
                        )}
                    </div>
                    <p className="font-mono text-sm text-tertiary">
                        {host.ip} · {host.mac}
                    </p>
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
                    <Info label="Sistema operativo" value={host.osGuess || "Sin fingerprint"} />
                    <Info label="Vendor" value={host.vendor || "—"} />
                    <Info label="CVE" value={host.cveCount ? String(host.cveCount) : "Ninguno"} />
                    <Info label="Último visto" value={formatWhen(host.lastSeen)} />
                </dl>
            </div>

            <div className="px-5 py-4">
                {host.services.length ? (
                    <div className="flex flex-col gap-3">
                        <p className="text-xs font-semibold tracking-wide text-quaternary uppercase">Puertos abiertos</p>
                        <div className="flex flex-wrap gap-2">
                            {host.services.map((s) => (
                                <span
                                    key={s.id}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1.5 text-sm ring-1 ring-secondary"
                                    title={s.version ?? undefined}
                                >
                                    <span className="font-mono font-medium text-primary">
                                        {s.port}/{s.protocol}
                                    </span>
                                    <span className="text-tertiary">{s.name ?? "unknown"}</span>
                                    <Badge color={sevColor(s.severity)} size="sm">
                                        {s.severity}
                                    </Badge>
                                </span>
                            ))}
                        </div>
                        {host.services.some((s) => s.version || s.cveIds?.length) ? (
                            <div className="mt-1 overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr>
                                            {["Puerto", "Servicio", "Versión / banner", "CVE"].map((h) => (
                                                <th key={h} className="py-2 pr-4 text-left text-xs font-semibold text-quaternary">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {host.services.map((s) => (
                                            <tr key={`d-${s.id}`} className="border-t border-secondary">
                                                <td className="py-2.5 pr-4 font-mono text-sm text-primary">
                                                    {s.port}/{s.protocol}
                                                </td>
                                                <td className="py-2.5 pr-4 text-sm text-tertiary">{s.name ?? "—"}</td>
                                                <td className="py-2.5 pr-4 text-sm text-tertiary">{s.version ?? "—"}</td>
                                                <td className="py-2.5 text-sm text-tertiary">
                                                    {s.cveIds?.length ? s.cveIds.join(", ") : "—"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <p className="text-sm text-tertiary">
                        {networkHasServices ? (
                            <>
                                Sin puertos abiertos en el deep scan (nmap <code className="rounded bg-secondary px-1 py-0.5">--top-ports 100</code>
                                ). Suele pasar con móviles o hosts que filtran; no implica que falte ejecutar{" "}
                                <code className="rounded bg-secondary px-1 py-0.5">make scan</code>.
                            </>
                        ) : (
                            <>
                                Host visto en discovery, sin deep scan de puertos aún. Ejecuta{" "}
                                <code className="rounded bg-secondary px-1.5 py-0.5 text-primary">make scan</code>.
                            </>
                        )}
                    </p>
                )}
            </div>
        </div>
    );
}

function SectionCard({
    title,
    description,
    badge,
    children,
}: {
    title: string;
    description?: string;
    badge?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="overflow-hidden rounded-xl bg-primary shadow-xs ring-1 ring-secondary">
            <div className="border-b border-secondary px-5 py-4">
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
            <div className="overflow-x-auto">{children}</div>
        </div>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-xs text-quaternary">{label}</dt>
            <dd className="font-medium text-secondary">{value}</dd>
        </div>
    );
}

function EmptyScanHint() {
    return (
        <div className="rounded-xl bg-primary px-5 py-10 text-center shadow-xs ring-1 ring-secondary">
            <p className="text-sm text-tertiary">
                Sin hosts todavía. Arranca el scanner y luego{" "}
                <code className="rounded bg-secondary px-1.5 py-0.5 text-primary">make scan</code> para obtener SO, puertos y
                servicios.
            </p>
        </div>
    );
}

function tabItems(stats: { hosts: number; openPorts: number }) {
    return [
        { id: "hosts", label: "Hosts / SO" },
        { id: "ports", label: "Puertos", badge: stats.openPorts },
        { id: "services", label: "Servicios", badge: stats.openPorts },
    ];
}

function formatWhen(iso: string): string {
    try {
        return new Date(iso).toLocaleString();
    } catch {
        return iso;
    }
}

function sevColor(s: string): BadgeColors {
    if (s === "critical") return "error";
    if (s === "high") return "orange";
    if (s === "medium") return "warning";
    if (s === "low") return "success";
    return "gray";
}

function maxSeverity(list: Severity[]): Severity {
    const order: Severity[] = ["unknown", "low", "medium", "high", "critical"];
    let best: Severity = "unknown";
    for (const s of list) {
        if (order.indexOf(s) > order.indexOf(best)) best = s;
    }
    return best;
}
