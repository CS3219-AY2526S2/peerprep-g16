import { Excalidraw, exportToBlob, reconcileElements } from "@excalidraw/excalidraw";
import type { RemoteExcalidrawElement } from "@excalidraw/excalidraw/data/reconcile";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import "@excalidraw/excalidraw/index.css";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Socket } from "socket.io-client";

export interface WhiteboardHandle {
    captureScreenshot: () => Promise<string>;
}

const Whiteboard = forwardRef<WhiteboardHandle, {
    sessionId: string;
    userId: string;
    socket: Socket | null;
}>(function Whiteboard({ sessionId, userId, socket }, ref) {
    const excalidrawAPI = useRef<ExcalidrawImperativeAPI | null>(null);
    const throttleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useImperativeHandle(ref, () => ({
        async captureScreenshot(): Promise<string> {
            const elements = excalidrawAPI.current?.getSceneElements() ?? [];
            const appState = excalidrawAPI.current?.getAppState?.() ?? {};
            const files = excalidrawAPI.current?.getFiles?.() ?? {};
            const blob = await exportToBlob({
                elements,
                appState: { ...appState, exportScale: 0.5 },
                files,
                mimeType: "image/png",
                exportPadding: 16,
            });
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        },
    }));

    useEffect(() => {
        if (!socket) return;

        socket.on("whiteboardUpdate", (payload: { elements: readonly ExcalidrawElement[]; userId: string }) => {
            if (payload.userId === userId) return;

            if (!excalidrawAPI.current) {
                console.warn("No excalidrawAPI available yet");
                return;
            }

            const currentElements = excalidrawAPI.current.getSceneElements() || [];
            const reconciled = reconcileElements(
                currentElements,
                payload.elements as readonly RemoteExcalidrawElement[],
                excalidrawAPI.current.getAppState?.() || {}
            );

            const sceneUpdate = {
                elements: reconciled,
                commitToHistory: false,
            } as Parameters<ExcalidrawImperativeAPI["updateScene"]>[0] & { commitToHistory: boolean };

            excalidrawAPI.current.updateScene(sceneUpdate);
        });

        socket.on("whiteboardState", (payload: { elements: readonly ExcalidrawElement[] }) => {
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

                    if (throttleTimer.current) return;

                    throttleTimer.current = setTimeout(() => {
                        throttleTimer.current = null;
                    }, 50);

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
});

export default Whiteboard;
