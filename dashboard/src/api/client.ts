import { storage } from "@/lib/storage";
import type { PaginationMeta } from "@/types/argos";

export class ApiError extends Error {
    status: number;
    errors?: Record<string, string[]>;

    constructor(message: string, status: number, errors?: Record<string, string[]>) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.errors = errors;
    }
}

type RequestOptions = {
    method?: string;
    body?: unknown;
    auth?: boolean;
};

type ApiEnvelope<T> = {
    status?: string;
    message?: string;
    data?: T;
    errors?: Record<string, string[]>;
    meta?: {
        pagination?: PaginationMeta;
    };
};

async function requestEnvelope<T>(path: string, options: RequestOptions = {}): Promise<ApiEnvelope<T>> {
    const base = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";
    const { method = "GET", body, auth = true } = options;

    const headers: Record<string, string> = {
        Accept: "application/json",
    };

    if (body !== undefined) {
        headers["Content-Type"] = "application/json";
    }

    if (auth) {
        const token = storage.getToken();
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
    }

    const res = await fetch(`${base}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    let json: ApiEnvelope<T> = {};

    try {
        json = await res.json();
    } catch {
        // empty body
    }

    if (!res.ok) {
        throw new ApiError(json.message || `Error HTTP ${res.status}`, res.status, json.errors);
    }

    return json;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const json = await requestEnvelope<T>(path, options);
    return (json.data ?? json) as T;
}

export async function apiRequestPaginated<T>(
    path: string,
    options: RequestOptions = {},
): Promise<{ data: T; pagination: PaginationMeta | null }> {
    const json = await requestEnvelope<T>(path, options);
    return {
        data: (json.data ?? []) as T,
        pagination: json.meta?.pagination ?? null,
    };
}
