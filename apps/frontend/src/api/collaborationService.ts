import { io, Socket } from "socket.io-client";

const COLLAB_URL = "http://localhost:3003";

let socket: Socket | null = null;

function getToken(): string {
    const stored = localStorage.getItem("login");
    return stored ? JSON.parse(stored).token : "";
}

export function connectSocket(): Socket {
    if (socket?.connected) return socket;

    socket = io(COLLAB_URL, {
        auth: { token: getToken() },
    });

    return socket;
}

export function disconnectSocket() {
    socket?.disconnect();
    socket = null;
}

export function getSocket(): Socket | null {
    return socket;
}

export async function fetchSession(sessionId: string) {
    const token = getToken();
    const res = await fetch(`${COLLAB_URL}/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) throw new Error("UNAUTHORIZED");
    if (res.status === 403) throw new Error("FORBIDDEN");
    if (res.status === 404) throw new Error("NOT_FOUND");
    if (!res.ok) throw new Error("Failed to fetch session");

    return res.json();
}

export async function endSession(sessionId: string) {
    const token = getToken();
    const res = await fetch(`${COLLAB_URL}/sessions/${sessionId}/end`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to end session");
    return res.json();
}