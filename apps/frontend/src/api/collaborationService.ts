import { io, Socket } from "socket.io-client";
import api from "./axiosInstance";

const COLLAB_URL = import.meta.env.VITE_COLLABORATION_SERVICE_URL as string;

let socket: Socket | null = null;

function getToken(): string {
    const stored = localStorage.getItem("login");
    return stored ? JSON.parse(stored).token : "";
}

export function connectSocket(): Socket {
    if (socket?.connected) return socket;

    socket = io("https://peerprep16.duckdns.org", {
        path: "/api/collaboration/socket.io",
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
    try {
        const res = await api.get(`${COLLAB_URL}/sessions/${sessionId}`);
        return res.data;
    } catch (err: any) {
        if (err.response?.status === 401) throw new Error("UNAUTHORIZED");
        if (err.response?.status === 403) throw new Error("FORBIDDEN");
        if (err.response?.status === 404) throw new Error("NOT_FOUND");
        throw new Error("Failed to fetch session");
    }
}

export async function endSession(sessionId: string) {
    try {
        const res = await api.post(`${COLLAB_URL}/sessions/${sessionId}/end`);
        return res.data;
    } catch (err: any) {
        if (err.response?.status === 401) throw new Error("UNAUTHORIZED");
        if (err.response?.status === 403) throw new Error("FORBIDDEN");
        throw new Error("Failed to end session");
    }
}

export async function getActiveSession(): Promise<{
    sessionId: string;
    otherUserId: string;
    questionId?: string;
    language: string;
    remainingMs: number;
    startedAt: string;
} | null> {
    try {
        const res = await api.get(`${COLLAB_URL}/sessions/active`);
        return res.data;
    } catch {
        return null;
    }
}

export async function rejoinSession(sessionId: string): Promise<{ sessionId: string; token: string; wsUrl: string }> {
    const res = await api.post(`${COLLAB_URL}/sessions/${sessionId}/rejoin`);
    return res.data;
}