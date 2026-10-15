import { useEffect, useState } from "react";
import { Badge } from "@/components/base/badges/badges";
import { fetchDevices } from "@/data/source";
import type { Device } from "@/types/argos";

export function MapaRedView() {
    const [devices, setDevices] = useState<Device[]>([]);

    useEffect(() => {
        void fetchDevices().then(setDevices);
    }, []);

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-1">
                <h1 className="text-display-sm font-semibold text-primary">Mapa de red</h1>
                <p className="text-md text-tertiary">Dispositivos por autorización (nodos planos; Cytoscape después)</p>
            </div>

            <div className="flex min-h-80 flex-wrap content-center justify-center gap-4 rounded-xl bg-primary p-8 shadow-xs ring-1 ring-secondary">
                {devices.map((d) => (
                    <div
                        key={d.id}
                        className="flex w-36 flex-col items-center gap-2 rounded-xl bg-secondary p-4 ring-1 ring-secondary"
                        style={{
                            boxShadow: d.authorized ? "inset 0 0 0 2px #2A9D8F" : "inset 0 0 0 2px #ED1C24",
                        }}
                    >
                        <span className="text-center text-sm font-semibold text-primary">{d.hostname ?? d.mac.slice(-8)}</span>
                        <span className="text-xs text-tertiary">{d.ip}</span>
                        <Badge color={d.authorized ? "success" : "error"} size="sm">
                            {d.authorized ? "OK" : "Nuevo"}
                        </Badge>
                    </div>
                ))}
                {!devices.length ? <p className="text-sm text-tertiary">Sin dispositivos</p> : null}
            </div>
        </div>
    );
}
