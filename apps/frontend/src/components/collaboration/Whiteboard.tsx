import { Excalidraw, reconcileElements } from "@excalidraw/excalidraw";
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
    const throttleTimer = useRef<any>(null);
    

    useEffect(() => {
        if (!socket) return;

        socket.on("whiteboardUpdate", (payload: { elements: any[]; userId: string }) => {
            if (payload.userId === userId) return;
            
            if (!excalidrawAPI.current) {
                console.warn("No excalidrawAPI available yet");
                return;
            }
            
            // Get current elements and reconcile with incoming
            const currentElements = excalidrawAPI.current.getSceneElements() || [];
            
            // CRITICAL: Use reconcileElements to properly merge
            // reconcileElements(sceneElements, remoteElements, appState)
            const reconciled = reconcileElements(
                currentElements,
                payload.elements,
                excalidrawAPI.current.getAppState?.() || {}
            );
            
            excalidrawAPI.current.updateScene({
                elements: reconciled,
                commitToHistory: false,
            });
        });

        socket.on("whiteboardState", (payload: { elements: any[] }) => {
            excalidrawAPI.current?.updateScene({ elements: payload.elements });
        });

        return () => {
            socket.off("whiteboardUpdate");
            socket.off("whiteboardState");
            if (throttleTimer.current) clearTimeout(throttleTimer.current);
        };
    }, [socket, userId, sessionId]);


    return (
        <div style={{ width: "100%", height: "100%", zIndex: 1 }}>
            <Excalidraw
                excalidrawAPI={(api) => { excalidrawAPI.current = api; }}
                onChange={(elements) => {
                    if (!socket) return;
                    
                    // Throttle updates - only emit once every 50ms
                    if (throttleTimer.current) return;
                    
                    throttleTimer.current = setTimeout(() => {
                        throttleTimer.current = null;
                    }, 50);
                    
                    // Also save locally so it persists on refresh
                    localStorage.setItem(`whiteboard_${sessionId}`, JSON.stringify(elements));
                    
                    socket.emit("whiteboardUpdate", { sessionId, userId, elements });
                }}
                initialData={{
                    elements: JSON.parse(localStorage.getItem(`whiteboard_${sessionId}`) || "[]"),
                    appState: { viewBackgroundColor: "#ffffff" },
                }}
            />
        </div>
    );
}