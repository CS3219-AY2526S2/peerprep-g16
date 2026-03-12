import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useEffect, useRef } from "react";

export default function Whiteboard({ sessionId, userId }: { sessionId: string, userId: string }) {
    const excalidrawAPI = useRef<any>(null)
    console.log(sessionId, userId)
    //TODO
    //BACKEND: set up WebSocket connection
    //Replace this with actual socket instance (e.g. from context/props)
    //const socket = useSocket();
    useEffect(() => {
        // ── BACKEND: listen for changes from other users ──────────────────
        // socket.on("whiteboard:update", (payload) => {
        //     if (payload.userId === userId) return; // ignore own echoes
        //     excalidrawAPI.current?.updateScene({ elements: payload.elements });
        // });
        //
        // return () => socket.off("whiteboard:update");
        // ─────────────────────────────────────────────────────────────────
    }, []);
    return (
        <div style={{ width: "100%", height: "100%", zIndex: 1 }}>
            <Excalidraw
                excalidrawAPI={(api) => { excalidrawAPI.current = api; }}
                // onChange={(elements, appState) => {
                //     // ── BACKEND: emit changes to other users ──────────────
                //     // Fires on every change — backend should broadcast to
                //     // everyone else in the session room, NOT echo to sender.
                //     //
                //     // socket.emit("whiteboard:update", {
                //     //     sessionId,
                //     //     userId,
                //     //     elements,
                //     // });
                // }}
                initialData={{
                    // ── BACKEND: on session join, fetch saved elements ────
                    // GET /sessions/:sessionId/whiteboard
                    // → { elements: ExcalidrawElement[] }
                    // Then pass as: elements: fetchedElements
                    // ─────────────────────────────────────────────────────
                    elements: [],
                    appState: { viewBackgroundColor: "#ffffff" },
                }}
            />
        </div>
    );
}