import { apiRequest } from "@/api/client";
import type { AlertItem, AlertStatus, DemoFixture, Device, EventItem, Service, Summary } from "@/types/argos";

const isDemo = import.meta.env.VITE_DEMO === "true";

async function loadFixture(): Promise<DemoFixture> {
    const res = await fetch("/demo-data.json");
    if (!res.ok) {
        return {
            devices: [],
            services: [],
            events: [],
            alerts: [],
            summary: { devicesTotal: 0, devicesUnauthorized: 0, alertsOpen: 0, riskAverage: "unknown" },
        };
    }
    return res.json();
}

export async function fetchSummary(): Promise<Summary> {
    if (isDemo) {
        return (await loadFixture()).summary;
    }
    return apiRequest<Summary>("/api/v1/summary");
}

export async function fetchDevices(): Promise<Device[]> {
    if (isDemo) return (await loadFixture()).devices;
    const data = await apiRequest<Device[]>("/api/v1/devices");
    return Array.isArray(data) ? data : [];
}

export async function fetchServices(): Promise<Service[]> {
    if (isDemo) return (await loadFixture()).services;
    const data = await apiRequest<Service[]>("/api/v1/services");
    return Array.isArray(data) ? data : [];
}

export async function fetchEvents(): Promise<EventItem[]> {
    if (isDemo) return (await loadFixture()).events;
    const data = await apiRequest<EventItem[]>("/api/v1/events");
    return Array.isArray(data) ? data : [];
}

export async function fetchAlerts(): Promise<AlertItem[]> {
    if (isDemo) return (await loadFixture()).alerts;
    const data = await apiRequest<AlertItem[]>("/api/v1/alerts");
    return Array.isArray(data) ? data : [];
}

export async function updateAlertStatus(id: number, status: AlertStatus): Promise<AlertItem | null> {
    if (isDemo) return null;
    return apiRequest<AlertItem>(`/api/v1/alerts/${id}`, {
        method: "PATCH",
        body: { status },
    });
}

export function usingDemoMode(): boolean {
    return isDemo;
}
