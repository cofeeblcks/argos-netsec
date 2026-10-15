import Echo from "laravel-echo";
import Pusher from "pusher-js";

declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo?: Echo<"reverb">;
    }
}

window.Pusher = Pusher;

export function createEcho(token: string): Echo<"reverb"> | null {
    const key = import.meta.env.VITE_REVERB_APP_KEY;
    const host = import.meta.env.VITE_REVERB_HOST;
    const port = Number(import.meta.env.VITE_REVERB_PORT ?? 8080);
    const scheme = import.meta.env.VITE_REVERB_SCHEME ?? "http";
    const apiUrl = import.meta.env.VITE_API_URL;

    if (!key || !host || !apiUrl) {
        console.warn("[argos] Reverb env incompleto; usando solo REST/polling");
        return null;
    }

    const forceTLS = scheme === "https";

    return new Echo({
        broadcaster: "reverb",
        key,
        wsHost: host,
        wsPort: port,
        wssPort: port,
        forceTLS,
        enabledTransports: forceTLS ? ["wss"] : ["ws"],
        authEndpoint: `${apiUrl.replace(/\/$/, "")}/api/broadcasting/auth`,
        auth: {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
    });
}
