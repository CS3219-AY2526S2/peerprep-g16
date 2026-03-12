import './App.css'
import React from "react"
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import { FaUser } from "react-icons/fa"
import Register from "./pages/register"
import Homepage from "./pages/homepage"
import Profile from "./pages/profile"
import Collaboration from './pages/collaboration'

function Appcontent() {
    const location = useLocation();
    const isLoginOrRegister = location.pathname === "/" || location.pathname === "/register";;
    const [showPassword, setShowPassword] = React.useState(false);

    return (
        <div style={{ overflow: "hidden" }}>
            {isLoginOrRegister ? <DefaultNavbar /> : <HomepageNavbar />}
            <Routes>
                <Route path="/" element={
                    <div style={styles.container}>
                        <label style={styles.label}>
                            Email/Username:
                            <input
                                type="text"
                                style={styles.input}
                            />
                        </label>
                        <label style={styles.label}>
                            Password:
                            <input
                                type={showPassword ? "text" : "password"}
                                style={styles.input}
                            />
                        </label>
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={styles.button}>
                            {showPassword ? "Hide Password" : "Show Password"}
                        </button>
                        <br />
                        <button style={styles.button} type="submit">
                            Login
                        </button>
                        <p>
                            Don't have an account? <Link to="/register" style={styles.link}>Register</Link>.
                        </p>
                    </div>
                } />
                <Route path="/register" element={<Register />} />
                <Route path="/homepage" element={<Homepage />} />
                <Route path="/profile" element={<Profile />}></Route>
                <Route path="/collaboration" element={<Collaboration />}></Route>
                <Route path="*" element={<Navigate to="/" replace />} /> {/*for unknown URL, it will redirect to login page*/}
            </Routes>
        </div>
    )
}

function App() {
    return (
        <BrowserRouter>
            <Appcontent />
        </BrowserRouter>
    )
}

function HomepageNavbar() {
    return (
        <div style={navbarHomepageStyle}>
            <Link to="/homepage" style={styles.link}>
                <h2 style={headingStyle}>PeerPrep</h2>
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: "15px", marginLeft: "auto", marginRight: "20px" }}>
                <Link to="/history" style={{ textDecoration: "none", fontWeight: "bold", fontSize: "24px", color: "#333" }}>History</Link>
                <Link to="/profile" style={{ color: "#333" }}>
                    <FaUser size={30} />
                </Link>
            </div>
        </div>
    )
}

function DefaultNavbar() {
    return (
        <div style={styles.navbarContainer}>
            <h2 style={headingStyle}>PeerPrep</h2>
        </div>
    )
}
const navbarHomepageStyle = {
    border: "1px solid #ccc",
    padding: "5px",
    width: "100%",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    boxShadow: "0px 0px 10px rgba(0, 0, 0, 0.2)",
    position: "fixed" as const,
    top: 0,
    left: 0,
    display: "flex",
    gap: "15px",
    marginLeft: "auto",
    marginRight: "20px",
    alignItems: "center",                 // ← add this
    boxSizing: "border-box" as const,     // ← add this
    zIndex: 9999
};


const headingStyle = {
    fontSize: "24px",
    textAlign: "left" as const,
    margin: "20px 20px",
    color: "#333",
    frontWeight: "bold",
};

const styles = {
    container: {
        marginTop: "100px",
        textAlign: "center" as const,
        maxWidth: "280px",     // ← ADD (limits form width)
        marginLeft: "auto",    // ← ADD
        marginRight: "auto",   // ← ADD
    },
    navbarContainer: {
        border: "1px solid #ccc",
        padding: "5px",
        width: "100%",
        borderRadius: "8px",
        backgroundColor: "#ffffff",
        boxShadow: "0px 0px 10px rgba(0, 0, 0, 0.2)",
        position: "fixed" as const,
        top: 0,
        left: 0,
    },
        heading: {
        fontSize: "24px",
        color: "#333",
    },
    error: {
        color: "red",
    },
    input: {
        marginBottom: "5px",
        borderRadius: "10px",
        width: "250px",       // Fixed width (aligned boxes)
        padding: "12px",
    },
    label: {
        marginBottom: "5px",
        textAlign: "left" as const,
        display: "block",
        width: "250px",       // ← ADD (matches input width)
    },
    form: {
        maxWidth: "300px",  // Container width limit
        margin: "0 auto",   // Center form
    },

    button: {
        width: "auto",
        padding: "10px",
        backgroundColor: "#007BFF",
        color: "white",
        border: "none",
        cursor: "pointer",
        marginBottom: "10px",
    },
    link: {
        textDecoration: "none",
        color: "#007BFF",
    },
};

export default App;