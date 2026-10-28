import { useEffect, useMemo, useState } from "react";
import { MetricCard } from "@/components/metric-card";
import { Badge } from "@/components/base/badges/badges";
import type { BadgeColors } from "@/components/base/badges/badge-types";
import { Button } from "@/components/base/buttons/button";
import { NativeSelect } from "@/components/base/select/select-native";
import { Tabs } from "@/components/application/tabs/tabs";
import { fetchDevicesPage, fetchServicesPage, fetchSummary } from "@/data/source";
import type { Device, PaginationMeta, Service, Severity, Summary } from "@/types/argos";
import { cx } from "@/utils/cx";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

type HostScan = Device & {
    services: Service[];
    openPorts: number;
    cveCount: number;
    maxSeverity: Severity;
};

export function ExposicionView() {
    const [services, setServices] = useState<Service[]>([]);
    const [hostServices, setHostServices] = useState<Service[]>([]);
    const [devices, setDevices] = useState<Device[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [devicesMeta, setDevicesMeta] = useState<PaginationMeta | null>(null);
    const [servicesMeta, setServicesMeta] = useState<PaginationMeta | null>(null);
    const [devicePage, setDevicePage] = useState(1);
    const [devicePerPage, setDevicePerPage] = useState(50);
    const [servicePage, setServicePage] = useState(1);
    const [servicePerPage, setServicePerPage] = useState(50);
    const [loadingHosts, setLoadingHosts] = useState(true);
    const [loadingServices, setLoadingServices] = useState(true);
    const [selectedKey, setSelectedKey] = useState<string>("hosts");

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                const s = await fetchSummary();
                if (!cancelled) setSummary(s);
            } catch {
                if (!cancelled) setSummary(null);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            setLoadingHosts(true);
            try {
                const devicesResult = await fetchDevicesPage({ page: devicePage, perPage: devicePerPage });
                if (cancelled) return;
                setDevices(devicesResult.data);
                setDevicesMeta(devicesResult.pagination);

                const ids = devicesResult.data.map((d) => d.id);
                if (!ids.length) {
                    setHostServices([]);
                    return;
                }
                const enrichment = await fetchServicesPage({
                    page: 1,
                    perPage: Math.max(200, ids.length * 20),
                    deviceIds: ids,
                });
                if (!cancelled) setHostServices(enrichment.data);
            } finally {
                if (!cancelled) setLoadingHosts(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [devicePage, devicePerPage]);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            setLoadingServices(true);
            try {
                const servicesResult = await fetchServicesPage({ page: servicePage, perPage: servicePerPage });
                if (cancelled) return;
                setServices(servicesResult.data);
                setServicesMeta(servicesResult.pagination);
            } finally {
                if (!cancelled) setLoadingServices(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [servicePage, servicePerPage]);

    const hosts = useMemo<HostScan[]>(() => {
        const byDevice = new Map<number, Service[]>();
        for (const s of hostServices) {
            const list = byDevice.get(s.deviceId) ?? [];
            list.push(s);
            byDevice.set(s.deviceId, list);
        }
        return devices
            .map((d) => {
                const list = (byDevice.get(d.id) ?? []).slice().sort((a, b) => a.port - b.port);
                return {
                    ...d,
                    services: list,
                    openPorts: list.length,
                    cveCount: list.reduce((n, s) => n + (s.cveIds?.length ?? 0), 0),
                    maxSeverity: maxSeverity(list.map((s) => s.severity)),
                };
            })
            .sort((a, b) => b.openPorts - a.openPorts || a.ip.localeCompare(b.ip));
    }, [devices, hostServices]);

    const stats = useMemo(() => {
        const withOs = hosts.filter((h) => Boolean(h.osGuess)).length;
        const withPorts = hosts.filter((h) => h.openPorts > 0).length;
        const highSev = services.filter((s) => s.severity === "high" || s.severity === "critical").length;
        const cves = new Set(services.flatMap((s) => s.cveIds ?? [])).size;
        return {
            hostsTotal: devicesMeta?.total ?? summary?.devicesTotal ?? hosts.length,
            hostsPage: hosts.length,
            withPorts,
            openPortsTotal: servicesMeta?.total ?? summary?.openPorts ?? services.length,
            openPortsPage: services.length,
            withOs,
            highSev,
            cves,
        };
    }, [hosts, services, devicesMeta, servicesMeta, summary]);

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

    const networkHasServices = (servicesMeta?.total ?? summary?.openPorts ?? 0) > 0 || hostServices.length > 0;

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-1">
                <h1 className="text-display-sm font-semibold text-primary">Exposición</h1>
                <p className="text-md text-tertiary">
                    Informe de escaneo: hosts, sistema operativo, puertos abiertos, servicios y CVE
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <MetricCard
                    label="Hosts"
                    value={stats.hostsTotal}
                    hint={`Pág. ${devicePage}: ${stats.withPorts} con puertos`}
                />
                <MetricCard
                    label="Puertos abiertos"
                    value={stats.openPortsTotal}
                    hint="Tras deep scan (nmap -sV)"
                />
                <MetricCard label="SO detectado" value={stats.withOs} hint="En esta página" />
                <MetricCard label="Severidad alta+" value={stats.highSev} hint="En página de servicios" accent={stats.highSev > 0} />
                <MetricCard label="CVE únicos" value={stats.cves} hint="En página de servicios" accent={stats.cves > 0} />
            </div>

            <Tabs selectedKey={selectedKey} onSelectionChange={(key) => setSelectedKey(String(key))} className="w-full">
                <Tabs.List type="underline" size="md" items={tabItems(stats)} className="w-full">
                    {(item) => <Tabs.Item {...item} />}
                </Tabs.List>

                <Tabs.Panel id="hosts" className="mt-6 outline-hidden">
                    {loadingHosts ? (
                        <p className="text-sm text-tertiary">Cargando…</p>
                    ) : !hosts.length ? (
                        <EmptyScanHint />
                    ) : (
                        <div className="flex flex-col gap-4">
                            {devicesMeta ? (
                                <div className="overflow-hidden rounded-xl bg-primary shadow-xs ring-1 ring-secondary">
                                    <ListPagination
                                        label="hosts"
                                        placement="header"
                                        page={devicesMeta.current_page}
                                        totalPages={devicesMeta.total_pages}
                                        totalItems={devicesMeta.total}
                                        pageSize={devicePerPage}
                                        onPageChange={setDevicePage}
                                        onPageSizeChange={(size) => {
                                            setDevicePerPage(size);
                                            setDevicePage(1);
                                        }}
                                    />
                                </div>
                            ) : null}
                            {hosts.map((host) => (
                                <HostScanCard key={host.id} host={host} networkHasServices={networkHasServices} />
                            ))}
                            {devicesMeta ? (
                                <div className="overflow-hidden rounded-xl bg-primary shadow-xs ring-1 ring-secondary">
                                    <ListPagination
                                        label="hosts"
                                        placement="footer"
                                        page={devicesMeta.current_page}
                                        totalPages={devicesMeta.total_pages}
                                        totalItems={devicesMeta.total}
                                        pageSize={devicePerPage}
                                        onPageChange={setDevicePage}
                                        onPageSizeChange={(size) => {
                                            setDevicePerPage(size);
                                            setDevicePage(1);
                                        }}
                                    />
                                </div>
                            ) : null}
                        </div>
                    )}
                </Tabs.Panel>

                <Tabs.Panel id="ports" className="mt-6 outline-hidden">
                    <SectionCard
                        title="Escaneo de puertos"
                        badge={String(stats.openPortsTotal)}
                        description="Puertos TCP/UDP abiertos por host"
                    >
                        {loadingServices ? (
                            <p className="px-5 py-8 text-sm text-tertiary">Cargando…</p>
                        ) : (
                            <>
                                {servicesMeta && servicesMeta.total > 0 ? (
                                    <ListPagination
                                        label="puertos"
                                        placement="header"
                                        page={servicesMeta.current_page}
                                        totalPages={servicesMeta.total_pages}
                                        totalItems={servicesMeta.total}
                                        pageSize={servicePerPage}
                                        onPageChange={setServicePage}
                                        onPageSizeChange={(size) => {
                                            setServicePerPage(size);
                                            setServicePage(1);
                                        }}
                                    />
                                ) : null}
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
                                                    {device?.hostname || device?.mac || s.deviceMac || "—"}
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
                                        {!portRows.length ? (
                                            <tr>
                                                <td colSpan={7} className="px-5 py-8 text-center text-sm text-tertiary">
                                                    Sin puertos. Ejecuta{" "}
                                                    <code className="rounded bg-secondary px-1.5 py-0.5 text-primary">make scan</code>.
                                                </td>
                                            </tr>
                                        ) : null}
                                    </tbody>
                                </table>
                                {servicesMeta && servicesMeta.total > 0 ? (
                                    <ListPagination
                                        label="puertos"
                                        placement="footer"
                                        page={servicesMeta.current_page}
                                        totalPages={servicesMeta.total_pages}
                                        totalItems={servicesMeta.total}
                                        pageSize={servicePerPage}
                                        onPageChange={setServicePage}
                                        onPageSizeChange={(size) => {
                                            setServicePerPage(size);
                                            setServicePage(1);
                                        }}
                                    />
                                ) : null}
                            </>
                        )}
                    </SectionCard>
                </Tabs.Panel>

                <Tabs.Panel id="services" className="mt-6 outline-hidden">
                    <SectionCard
                        title="Servicios y vulnerabilidades"
                        badge={String(stats.openPortsTotal)}
                        description="Identificación -sV, CVE y severidad"
                    >
                        {loadingServices ? (
                            <p className="px-5 py-8 text-sm text-tertiary">Cargando…</p>
                        ) : (
                            <>
                                {servicesMeta && servicesMeta.total > 0 ? (
                                    <ListPagination
                                        label="servicios"
                                        placement="header"
                                        page={servicesMeta.current_page}
                                        totalPages={servicesMeta.total_pages}
                                        totalItems={servicesMeta.total}
                                        pageSize={servicePerPage}
                                        onPageChange={setServicePage}
                                        onPageSizeChange={(size) => {
                                            setServicePerPage(size);
                                            setServicePage(1);
                                        }}
                                    />
                                ) : null}
                                <table className="w-full">
                                    <thead className="bg-secondary">
                                        <tr>
                                            {["Host", "MAC", "Puerto", "Proto", "Servicio", "Versión", "CVE", "Severidad", "Visto"].map(
                                                (h) => (
                                                    <th key={h} className="px-5 py-2.5 text-left text-xs font-semibold text-quaternary">
                                                        {h}
                                                    </th>
                                                ),
                                            )}
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
                                        {!services.length ? (
                                            <tr>
                                                <td colSpan={9} className="px-5 py-8 text-center text-sm text-tertiary">
                                                    Sin servicios detectados todavía.
                                                </td>
                                            </tr>
                                        ) : null}
                                    </tbody>
                                </table>
                                {servicesMeta && servicesMeta.total > 0 ? (
                                    <ListPagination
                                        label="servicios"
                                        placement="footer"
                                        page={servicesMeta.current_page}
                                        totalPages={servicesMeta.total_pages}
                                        totalItems={servicesMeta.total}
                                        pageSize={servicePerPage}
                                        onPageChange={setServicePage}
                                        onPageSizeChange={(size) => {
                                            setServicePerPage(size);
                                            setServicePage(1);
                                        }}
                                    />
                                ) : null}
                            </>
                        )}
                    </SectionCard>
                </Tabs.Panel>
            </Tabs>
        </div>
    );
}

function ListPagination({
    label,
    page,
    totalPages,
    totalItems,
    pageSize,
    placement = "footer",
    onPageChange,
    onPageSizeChange,
}: {
    label: string;
    page: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    placement?: "header" | "footer";
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
}) {
    const pages = Math.max(1, totalPages);
    const current = Math.min(Math.max(1, page), pages);

    return (
        <div
            className={cx(
                "px-4 py-3 md:px-5",
                placement === "header" ? "border-b border-secondary" : "border-t border-secondary",
            )}
        >
            <nav
                aria-label={`Paginación de ${label} (${placement === "header" ? "arriba" : "abajo"})`}
                className={cx("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between")}
            >
                <p className="text-sm text-tertiary">
                    {totalItems} {label} · página {current} de {pages}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                    <NativeSelect
                        aria-label={`Registros por página (${label})`}
                        className="w-auto"
                        size="sm"
                        value={String(pageSize)}
                        onChange={(e) => onPageSizeChange(Number(e.target.value))}
                        options={PAGE_SIZE_OPTIONS.map((n) => ({
                            label: `${n} / página`,
                            value: String(n),
                        }))}
                        selectClassName="min-w-32"
                    />
                    <Button
                        color="secondary"
                        size="sm"
                        isDisabled={current <= 1}
                        onClick={() => onPageChange(current - 1)}
                    >
                        Anterior
                    </Button>
                    <Button
                        color="secondary"
                        size="sm"
                        isDisabled={current >= pages}
                        onClick={() => onPageChange(current + 1)}
                    >
                        Siguiente
                    </Button>
                </div>
            </nav>
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

function tabItems(stats: { hostsTotal: number; openPortsTotal: number }) {
    return [
        { id: "hosts", label: "Hosts / SO", badge: stats.hostsTotal },
        { id: "ports", label: "Puertos", badge: stats.openPortsTotal },
        { id: "services", label: "Servicios", badge: stats.openPortsTotal },
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
