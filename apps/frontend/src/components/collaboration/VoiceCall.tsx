import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Socket } from "socket.io-client";

type CallState = "idle" | "calling" | "incoming" | "active";

interface VoiceCallProps {
    socket: Socket | null;
    sessionId: string;
}

const ICE_SERVERS = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function VoiceCall({ socket, sessionId }: VoiceCallProps) {
    const [callState, setCallState] = useState<CallState>("idle");
    const [isMuted, setIsMuted] = useState(false);

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
    const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);

    useEffect(() => {
        if (!socket) return;

        console.log("[VoiceCall] Registering socket listeners on", socket.id);

        const handleOffer = ({ offer }: { offer: RTCSessionDescriptionInit }) => {
            console.log("[VoiceCall] Received voice:offer");
            pendingOfferRef.current = offer;
            setCallState("incoming");
        };

        const handleAnswer = async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
            console.log("[VoiceCall] Received voice:answer");
            const pc = pcRef.current;
            if (!pc) return;
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            setCallState("active");
        };

        const handleIceCandidate = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
            const pc = pcRef.current;
            if (!pc) return;
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
                console.error("[VoiceCall] Error adding ICE candidate:", err);
            }
        };

        const handleEnd = () => {
            console.log("[VoiceCall] Received voice:end");
            cleanup();
            setCallState("idle");
        };

        socket.on("voice:offer", handleOffer);
        socket.on("voice:answer", handleAnswer);
        socket.on("voice:ice-candidate", handleIceCandidate);
        socket.on("voice:end", handleEnd);

        return () => {
            socket.off("voice:offer", handleOffer);
            socket.off("voice:answer", handleAnswer);
            socket.off("voice:ice-candidate", handleIceCandidate);
            socket.off("voice:end", handleEnd);
        };
    }, [socket]);

    function cleanup() {
        pcRef.current?.close();
        pcRef.current = null;
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
        if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = null;
        }
        setIsMuted(false);
    }

    async function createPeerConnection(): Promise<RTCPeerConnection> {
        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
            if (!remoteAudioRef.current) {
                remoteAudioRef.current = new Audio();
                remoteAudioRef.current.autoplay = true;
            }
            remoteAudioRef.current.srcObject = event.streams[0];
        };

        pc.onicecandidate = (event) => {
            if (event.candidate && socket) {
                socket.emit("voice:ice-candidate", {
                    sessionId,
                    candidate: event.candidate,
                });
            }
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
                cleanup();
                setCallState("idle");
            }
        };

        return pc;
    }

    async function startCall() {
        if (!socket) return;
        setCallState("calling");
        try {
            const pc = await createPeerConnection();
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            console.log("[VoiceCall] Emitting voice:offer to session", sessionId);
            socket.emit("voice:offer", { sessionId, offer });
        } catch (err) {
            console.error("[VoiceCall] Failed to start call:", err);
            cleanup();
            setCallState("idle");
        }
    }

    async function acceptCall() {
        if (!socket) return;
        const pendingOffer = pendingOfferRef.current;
        if (!pendingOffer) return;
        pendingOfferRef.current = null;

        try {
            const pc = await createPeerConnection();
            await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("voice:answer", { sessionId, answer });
            setCallState("active");
        } catch (err) {
            console.error("Failed to accept call:", err);
            cleanup();
            setCallState("idle");
        }
    }

    function declineCall() {
        pendingOfferRef.current = null;
        socket?.emit("voice:end", { sessionId });
        setCallState("idle");
    }

    function endCall() {
        socket?.emit("voice:end", { sessionId });
        cleanup();
        setCallState("idle");
    }

    function toggleMute() {
        const stream = localStreamRef.current;
        if (!stream) return;
        stream.getAudioTracks().forEach((t) => {
            t.enabled = !t.enabled;
        });
        setIsMuted((prev) => !prev);
    }

    if (callState === "idle") {
        return (
            <button onClick={startCall} style={styles.callBtn} title="Start voice call">
                Call
            </button>
        );
    }

    if (callState === "calling") {
        return (
            <div style={styles.callBar}>
                <span style={styles.callText}>Calling...</span>
                <button onClick={endCall} style={styles.endBtn}>End</button>
            </div>
        );
    }

    if (callState === "incoming") {
        return (
            <div style={styles.callBar}>
                <span style={styles.callText}>Incoming call</span>
                <button onClick={acceptCall} style={styles.acceptBtn}>Accept</button>
                <button onClick={declineCall} style={styles.endBtn}>Decline</button>
            </div>
        );
    }

    // active
    return (
        <div style={styles.callBar}>
            <span style={styles.callText}>On call</span>
            <button onClick={toggleMute} style={isMuted ? styles.mutedBtn : styles.muteBtn}>
                {isMuted ? "Unmute" : "Mute"}
            </button>
            <button onClick={endCall} style={styles.endBtn}>End</button>
        </div>
    );
}

const styles: Record<string, CSSProperties> = {
    callBtn: {
        padding: "5px 14px",
        background: "#2a9d8f",
        color: "#fff",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "12px",
        fontWeight: 600,
    },
    callBar: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "4px 10px",
        background: "#2a2a4e",
        borderRadius: "8px",
    },
    callText: {
        color: "#a9b1d6",
        fontSize: "12px",
    },
    acceptBtn: {
        padding: "4px 10px",
        background: "#2a9d8f",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        fontSize: "12px",
        fontWeight: 600,
    },
    muteBtn: {
        padding: "4px 10px",
        background: "#6a4c93",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        fontSize: "12px",
        fontWeight: 600,
    },
    mutedBtn: {
        padding: "4px 10px",
        background: "#dd842b",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        fontSize: "12px",
        fontWeight: 600,
    },
    endBtn: {
        padding: "4px 10px",
        background: "#e63946",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        fontSize: "12px",
        fontWeight: 600,
    },
};
