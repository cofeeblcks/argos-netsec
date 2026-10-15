import { storage } from "@/lib/storage";

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

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
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

    let json: {
        status?: string;
        message?: string;
        data?: T;
        errors?: Record<string, string[]>;
    } = {};

    try {
        json = await res.json();
    } catch {
        // empty body
    }

    if (!res.ok) {
        throw new ApiError(json.message || `Error HTTP ${res.status}`, res.status, json.errors);
    }

    return (json.data ?? json) as T;
}
