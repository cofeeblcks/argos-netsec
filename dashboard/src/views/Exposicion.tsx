import { useEffect, useState } from "react";
import { Badge } from "@/components/base/badges/badges";
import type { BadgeColors } from "@/components/base/badges/badge-types";
import { fetchDevices, fetchServices } from "@/data/source";
import type { Device, Service } from "@/types/argos";

export function ExposicionView() {
    const [services, setServices] = useState<Service[]>([]);
    const [devicesById, setDevicesById] = useState<Record<number, Device>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                const [svc, devices] = await Promise.all([fetchServices(), fetchDevices()]);
                if (cancelled) return;
                setServices(svc);
                setDevicesById(Object.fromEntries(devices.map((d) => [d.id, d])));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-1">
                <h1 className="text-display-sm font-semibold text-primary">Exposición</h1>
                <p className="text-md text-tertiary">Puertos y servicios detectados en la red</p>
            </div>

            <div className="overflow-hidden rounded-xl bg-primary shadow-xs ring-1 ring-secondary">
                <div className="border-b border-secondary px-5 py-4">
                    <div className="flex items-center gap-2">
                        <h2 className="text-md font-semibold text-primary">Servicios</h2>
                        <Badge color="gray" size="sm" type="modern">
                            {services.length}
                        </Badge>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-secondary">
                            <tr>
                                {["Host", "MAC", "Puerto", "Proto", "Servicio", "Versión", "CVE", "Severidad"].map((h) => (
                                    <th key={h} className="px-5 py-2.5 text-left text-xs font-semibold text-quaternary">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {services.map((s) => {
                                const device = devicesById[s.deviceId];
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
                                    </tr>
                                );
                            })}
                            {!loading && !services.length ? (
                                <tr>
                                    <td colSpan={8} className="px-5 py-8 text-center text-sm text-tertiary">
                                        Sin servicios aún. El descubrimiento solo lista hosts; para puertos ejecuta{" "}
                                        <code className="rounded bg-secondary px-1.5 py-0.5 text-primary">make scan</code>{" "}
                                        (deep scan con nmap -sV).
                                    </td>
                                </tr>
                            ) : null}
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-5 py-8 text-center text-sm text-tertiary">
                                        Cargando…
                                    </td>
                                </tr>
                            ) : null}
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
