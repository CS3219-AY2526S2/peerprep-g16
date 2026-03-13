import './App.css'
import React, { useState } from "react"
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom'
import { FaUser } from "react-icons/fa"
import Register from "./pages/register"
import Homepage from "./pages/homepage"
import Profile from "./pages/profile"
import axios from "axios";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const stored = localStorage.getItem("login");
    if (!stored) return <Navigate to="/" replace />;

    const { userLogin } = JSON.parse(stored);
    if (!userLogin) return <Navigate to="/" replace />;

    return children;
}

function Appcontent() {
    const location = useLocation();
    const isLoginOrRegister = location.pathname === "/" || location.pathname === "/register" || location.pathname.startsWith("/collaboration");
    const [showPassword, setShowPassword] = React.useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const navigate = useNavigate();

    React.useEffect(() => {
        if (location.pathname === "/") {
            setError("");
            setSuccess("");
            setEmail("");
            setPassword("");
        }
    }, [location.pathname]);

    const login = async (event: any) => {
        event.preventDefault();
        try {
            const response = await axios.post("http://localhost:3001/auth/login", {
                email,
                password,
            });

            console.log("response", response);
            localStorage.setItem(
                "login",
                JSON.stringify({
                    userLogin: true,
                    token: response.data.data.accessToken,
                    id: response.data.data.id,
                    username: response.data.data.username,
                    email: response.data.data.email,
                })
            );
            setSuccess("Login successful! Directing to homepage...")
            setError("")
            setTimeout(() => {
                setSuccess("")
                navigate('/homepage')
            }, 1000)
        } catch (error: any) {
            setEmail("")
            setPassword("")
            if (error.response !== undefined) {
                setError(error.response.data.message);
            }
            console.log(error);
        }
    };

    return (
        <div style={{ overflow: "hidden" }}>
            {isLoginOrRegister ? <DefaultNavbar /> : <HomepageNavbar />}
            <Routes>
                <Route path="/" element={
                    <div style={styles.container}>
                        <label style={styles.label}>
                            Email:
                            <input
                                type="text"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                style={styles.input}
                            />
                        </label>
                        <label style={styles.label}>
                            Password:
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
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
                        <button onClick={login} style={styles.button}>
                            Login
                        </button>
                        {success && <p style={{ color: "green" }}>{success}</p>}
                        {error && <p style={{ color: "red" }}>{error}</p>}
                        <p>
                            Don't have an account? <Link to="/register" style={styles.link}>Register</Link>.
                        </p>
                    </div>
                } />
                <Route path="/register" element={<Register />} />
                <Route path="/homepage" element={
                    <ProtectedRoute>
                        <Homepage />
                    </ProtectedRoute>
                } />
                <Route path="/profile" element={
                    <ProtectedRoute>
                        <Profile />
                    </ProtectedRoute>
                } />
                <Route path="/history"></Route>
                <Route path="/collaboration"> </Route>
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
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem("login");
        navigate("/");
    };

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
                <button onClick={handleLogout} style={styles.logoutButton}>
                    Logout
                </button>
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
    alignItems: "center",                 
    boxSizing: "border-box" as const,     
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
        maxWidth: "280px",
        marginLeft: "auto",
        marginRight: "auto",
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center" as const,
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
        width: "250px",
        padding: "12px",
        border: "1px solid #ccc",
        outline: "none",
        boxSizing: "border-box" as const,
    },
    label: {
        marginBottom: "5px",
        textAlign: "left" as const,
        display: "block",
        width: "250px",
    },
    form: {
        maxWidth: "300px",
        margin: "0 auto",
    },

    button: {
        padding: "10px 20px",
        backgroundColor: "white",
        border: "2px solid #333",
        borderRadius: "20px",
        fontWeight: "bold" as const,
        fontSize: "15px",
        cursor: "pointer",
    },
    logoutButton: {
        padding: "10px 20px",
        backgroundColor: "white",
        border: "2px solid #333",
        borderRadius: "20px",
        fontWeight: "bold" as const,
        fontSize: "15px",
        cursor: "pointer",
    },
    link: {
        textDecoration: "none",
        color: "#007BFF",
    },
};

export default App;