import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useEffect, useRef } from "react";
import { Socket } from "socket.io-client";

export default function Whiteboard({
    sessionId,
    userId,
    socket,
}: {
    sessionId: string;
    userId: string;
    socket: Socket | null;
}) {
    const excalidrawAPI = useRef<any>(null);

    useEffect(() => {
        if (!socket) return;

        // listen for other user's whiteboard changes
        socket.on("whiteboardUpdate", (payload: { elements: any[]; userId: string }) => {
            if (payload.userId === userId) return; // ignore own echoes
            excalidrawAPI.current?.updateScene({ elements: payload.elements });
        });

        // get initial whiteboard state on join
        socket.on("whiteboardState", (payload: { elements: any[] }) => {
            excalidrawAPI.current?.updateScene({ elements: payload.elements });
        });

        return () => {
            socket.off("whiteboardUpdate");
            socket.off("whiteboardState");
        };
    }, [socket, userId]);

    return (
        <div style={{ width: "100%", height: "100%", zIndex: 1 }}>
            <Excalidraw
                excalidrawAPI={(api) => { excalidrawAPI.current = api; }}
                onChange={(elements) => {
                    if (!socket) return;
                    socket.emit("whiteboardUpdate", { sessionId, userId, elements });
                }}
                initialData={{
                    elements: [],
                    appState: { viewBackgroundColor: "#ffffff" },
                }}
            />
        </div>
    );
}