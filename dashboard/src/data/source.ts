import { apiRequest, apiRequestPaginated } from "@/api/client";
import type {
    AlertItem,
    AlertStatus,
    DemoFixture,
    Device,
    EventItem,
    PaginatedResult,
    PaginationMeta,
    Service,
    Summary,
} from "@/types/argos";

const isDemo = import.meta.env.VITE_DEMO === "true";

export type ListQuery = {
    page?: number;
    perPage?: number;
};

function emptyPagination(perPage = 50): PaginationMeta {
    return {
        total: 0,
        count: 0,
        per_page: perPage,
        current_page: 1,
        total_pages: 1,
    };
}

function demoSlice<T>(items: T[], query: ListQuery = {}): PaginatedResult<T> {
    const page = Math.max(1, query.page ?? 1);
    const perPage = Math.max(1, query.perPage ?? 50);
    const start = (page - 1) * perPage;
    const data = items.slice(start, start + perPage);
    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    return {
        data,
        pagination: {
            total,
            count: data.length,
            per_page: perPage,
            current_page: Math.min(page, totalPages),
            total_pages: totalPages,
        },
    };
}

function withQuery(path: string, query: ListQuery & Record<string, string | number | undefined> = {}): string {
    const params = new URLSearchParams();
    if (query.page != null) params.set("page", String(query.page));
    if (query.perPage != null) params.set("per_page", String(query.perPage));
    for (const [key, value] of Object.entries(query)) {
        if (key === "page" || key === "perPage" || value == null || value === "") continue;
        params.set(key, String(value));
    }
    const qs = params.toString();
    return qs ? `${path}?${qs}` : path;
}

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

export async function fetchDevicesPage(query: ListQuery = {}): Promise<PaginatedResult<Device>> {
    if (isDemo) return demoSlice((await loadFixture()).devices, query);
    const { data, pagination } = await apiRequestPaginated<Device[]>(withQuery("/api/v1/devices", query));
    const items = Array.isArray(data) ? data : [];
    return {
        data: items,
        pagination: pagination ?? emptyPagination(query.perPage ?? 50),
    };
}

export async function fetchDevices(): Promise<Device[]> {
    const { data } = await fetchDevicesPage({ page: 1, perPage: 50 });
    return data;
}

export async function fetchServicesPage(
    query: ListQuery & { deviceIds?: number[] } = {},
): Promise<PaginatedResult<Service>> {
    if (isDemo) {
        const all = (await loadFixture()).services;
        const filtered = query.deviceIds?.length ? all.filter((s) => query.deviceIds!.includes(s.deviceId)) : all;
        return demoSlice(filtered, query);
    }
    const { data, pagination } = await apiRequestPaginated<Service[]>(
        withQuery("/api/v1/services", {
            page: query.page,
            perPage: query.perPage,
            device_ids: query.deviceIds?.length ? query.deviceIds.join(",") : undefined,
        }),
    );
    const items = Array.isArray(data) ? data : [];
    return {
        data: items,
        pagination: pagination ?? emptyPagination(query.perPage ?? 50),
    };
}

export async function fetchServices(): Promise<Service[]> {
    const { data } = await fetchServicesPage({ page: 1, perPage: 50 });
    return data;
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
