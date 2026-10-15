export type Severity = "unknown" | "low" | "medium" | "high" | "critical";
export type AlertStatus = "open" | "acked" | "false_positive";

export interface Device {
    id: number;
    mac: string;
    ip: string;
    hostname: string | null;
    vendor: string | null;
    osGuess: string | null;
    authorized: boolean;
    firstSeen: string;
    lastSeen: string;
    risk: Severity;
}

export interface Service {
    id: number;
    deviceId: number;
    deviceMac?: string;
    port: number;
    protocol: string;
    name: string | null;
    version: string | null;
    cveIds: string[];
    severity: Severity;
    lastSeen: string;
}

export interface EventItem {
    id: number;
    occurredAt: string;
    type: string;
    deviceId: number | null;
    deviceMac?: string | null;
    detail: Record<string, unknown>;
}

export interface AlertItem {
    id: number;
    occurredAt: string;
    rule: string;
    severity: Exclude<Severity, "unknown">;
    srcIp: string | null;
    dstIp: string | null;
    deviceId: number | null;
    raw: Record<string, unknown>;
    status: AlertStatus;
}

export interface Summary {
    devicesTotal: number;
    devicesAuthorized?: number;
    devicesUnauthorized: number;
    devicesWithOs?: number;
    devicesSeen24h?: number;
    openPorts?: number;
    servicesHighSeverity?: number;
    cveUnique?: number;
    alertsOpen: number;
    alertsHighCritical?: number;
    alertsBySeverity?: Record<string, number>;
    events24h?: number;
    riskAverage: string;
    riskBreakdown?: Record<string, number>;
    sensorsOnline?: number;
    sensorsTotal?: number;
    sensors?: Array<{ name: string; kind: string; lastSeenAt: string | null; online?: boolean }>;
    topPorts?: Array<{ port: number; protocol: string; count: number; name: string | null }>;
}

export interface DemoFixture {
    devices: Device[];
    services: Service[];
    events: EventItem[];
    alerts: AlertItem[];
    summary: Summary;
}
