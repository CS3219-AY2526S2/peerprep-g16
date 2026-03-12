import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";

export default function Whiteboard() {
    return (
        <div style={{ width: "100%", height: "100%" }}>
            <Excalidraw />
        </div>
    );
}