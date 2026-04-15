import React from "react"
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosInstance"
import styles from "../components/styles";
const USER_SERVICE_URL = import.meta.env.VITE_USER_SERVICE_URL as string;

// --- Types ---
interface ApiError {
    response?: {
        status?: number;
        data?: {
            message?: string;
        };
    };
}

const USER_SERVICE_URL = import.meta.env.VITE_USER_SERVICE_URL as string;

function Profile() {
    const stored = localStorage.getItem("login");
    const user = stored ? JSON.parse(stored) : null;
    const token = user?.token;
    const [activeTab, setActiveTab] = React.useState("username");
    const [newUsername, setNewUsername] = useState("");
    const [newEmail, setEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    // Use a ref to track the previous tab so we can reset on change
    // without calling setState synchronously inside an effect body
    
    const switchTab = (tab: string) => {
        setActiveTab(tab);
        setSuccess("");
        setError("");
    };

    const handleEmailUpdate = async () => {
        if (!emailChange()) return
        else if (!handleEmailValidation()) return

        try {
            await api.patch(`${USER_SERVICE_URL}/users/${user?.id}`,
                { email: newEmail },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            localStorage.setItem("login", JSON.stringify({
                ...JSON.parse(localStorage.getItem("login")!),
                email: newEmail,
            }));
            setError("")
            setSuccess("Email Update successful!")
        } catch (err) {
            const apiErr = err as ApiError;
            console.log(apiErr)
            setError(apiErr.response?.data?.message || 'Email Update failed.')
        }
    }

    const handleEmailValidation = () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            setError("Please enter a valid email address.");
            return false;
        }
        setError("");
        return true;
    }

    const emailChange = () => {
        if (newEmail === user?.email) {
            setError("Please enter a new email address.");
            return false;
        }
        setError("");
        return true;
    }

    const handlePasswordUpdate = async () => {
        if (!handlePasswordValidation()) return
        else if (!handleConfirmPasswordValidation()) return

        try {
            await api.patch(`${USER_SERVICE_URL}/users/${user?.id}`,
                { password: newPassword, currentPassword: currentPassword },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            localStorage.setItem("login", JSON.stringify({
                ...JSON.parse(localStorage.getItem("login")!),
                password: newPassword,
            }));
            setError("")
            setSuccess("Password Update successful!")
        } catch (err) {
            const apiErr = err as ApiError;
            console.log(apiErr)
            setError(apiErr.response?.data?.message || 'Password Update failed.')
        }
    }

    const handlePasswordValidation = () => {
        const uppercaseRegex = /[A-Z]/;
        const lowercaseRegex = /[a-z]/;
        const numberRegex = /\d/;
        const specialCharRegex = /[@$!%*?&]/;
        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters long.");
            setNewPassword("");
            setConfirmPassword("");
            return false;
        }
        else if (!uppercaseRegex.test(newPassword)) {
            setError("Password must contain at least 1 Uppercase letter.");
            setNewPassword("");
            setConfirmPassword("");
            return false;
        }
        else if (!lowercaseRegex.test(newPassword)) {
            setError("Password must contain at least 1 lowercase letter.");
            setNewPassword("");
            setConfirmPassword("");
            return false;
        }
        else if (!numberRegex.test(newPassword)) {
            setError("Password must contain at least 1 number.");
            setNewPassword("");
            setConfirmPassword("");
            return false;
        }
        else if (!specialCharRegex.test(newPassword)) {
            setError("Password must contain at least 1 special character (@$!%*?&).");
            setNewPassword("");
            setConfirmPassword("");
            return false;
        }
        setError("");
        return true;
    }

    const handleConfirmPasswordValidation = () => {
        if (newPassword !== confirmPassword) {
            setError("Passwords don't match!")
            setNewPassword("")
            setConfirmPassword("")
            return false
        }
        return true
    }

    const handleUsernameUpdate = async () => {
        if (!usernameChange()) return

        try {
            await api.patch(`${USER_SERVICE_URL}/users/${user?.id}`,
                { username: newUsername },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            localStorage.setItem("login", JSON.stringify({
                ...JSON.parse(localStorage.getItem("login")!),
                username: newUsername,
            }));
            setError("")
            setSuccess("Username Update successful!")
        } catch (err) {
            const apiErr = err as ApiError;
            console.log(apiErr)
            if (apiErr.response?.status === 409) {
                setError("Username already exists, please choose a different one.")
            } else {
                setError(apiErr.response?.data?.message || 'Username Update failed.')
            }
        }
    }

    const usernameChange = () => {
        if (newUsername === user?.username) {
            setError("Please enter a new username.")
            setNewUsername("")
            return false;
        }
        setError("");
        return true;
    }

    const handleAccountDeletion = async () => {
        const confirmed = window.confirm("Are you sure you want to delete your account? This action cannot be undone.");
        if (!confirmed) return;

        try {
            await api.delete(`${USER_SERVICE_URL}/users/${user?.id}`,
                { headers: { Authorization: `Bearer ${token}` } }
            )
            localStorage.removeItem("login");
            navigate("/");
        } catch (err) {
            const apiErr = err as ApiError;
            setError(apiErr.response?.data?.message || 'Account deletion failed.')
        }
    }

    return (
        <div style={{ display: "flex", marginTop: "60px", minHeight: "100vh" }}>
            <div style={styles.sidebar}>
                <h3 style={styles.heading}>Account</h3>
                <button onClick={() => switchTab("username")} style={activeTab === "username" ? styles.activeTab : styles.tab}>
                    Username Update
                </button>
                <button onClick={() => switchTab("email")} style={activeTab === "email" ? styles.activeTab : styles.tab}>
                    Email Update
                </button>
                <button onClick={() => switchTab("password")} style={activeTab === "password" ? styles.activeTab : styles.tab}>
                    Password Update
                </button>
                <button onClick={() => switchTab("delete")} style={activeTab === "delete" ? styles.activeTab : styles.tab}>
                    Account Deletion
                </button>
            </div>
            <div style={{ flex: 1, padding: "60px", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                {activeTab === "username" && (
                    <>
                        <label style={styles.label}>
                            Current Username: {user?.username}
                        </label>
                        <label style={styles.label}>
                            New Username:
                            <input type="text"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                style={styles.input} />
                        </label>
                        <button onClick={handleUsernameUpdate} style={styles.button}>Submit</button>
                        {success && <p style={{ color: "green" }}>{success}</p>}
                        {error && <p style={{ color: "red" }}>{error}</p>}
                    </>
                )}

                {activeTab === "email" && (
                    <>
                        <label style={styles.label}>
                            Current Email: {user?.email}
                        </label>
                        <label style={styles.label}>
                            New Email:
                            <input type="text"
                                value={newEmail}
                                onChange={(e) => setEmail(e.target.value)}
                                style={styles.input} />
                        </label>
                        <button onClick={handleEmailUpdate} style={styles.button}>Submit</button>
                        {success && <p style={{ color: "green" }}>{success}</p>}
                        {error && <p style={{ color: "red" }}>{error}</p>}
                    </>
                )}

                {activeTab === "password" && (
                    <>
                        <label style={styles.label}>
                            <span style={{ width: "160px", display: "inline-block", textAlign: "left" }}>Current Password:</span>
                            <input type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                style={styles.input} />
                        </label>
                        <label style={styles.label}>
                            <span style={{ width: "160px", display: "inline-block", textAlign: "left" }}>New Password:</span>
                            <input type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                style={styles.input} />
                        </label>
                        <div style={styles.passwordBorder}>
                            <span style={{ color: "red", fontWeight: "bold" }}>
                                Password Requirements:
                            </span>
                            <ul style={styles.passwordRequirements}>
                                <li>Minimum 8 characters</li>
                                <li>At least 1 Uppercase Letter</li>
                                <li>At least 1 lowercase Letter</li>
                                <li>At least 1 Number</li>
                                <li>At least 1 Special Character</li>
                            </ul>
                        </div>
                        <label style={styles.label}>
                            <span style={{ width: "160px", display: "inline-block", textAlign: "left" }}>Confirm Password:</span>
                            <input type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                style={styles.input} />
                        </label>
                        <button onClick={handlePasswordUpdate} style={styles.button}>Submit</button>
                        {success && <p style={{ color: "green" }}>{success}</p>}
                        {error && <p style={{ color: "red" }}>{error}</p>}
                    </>
                )}

                {activeTab === "delete" && (
                    <>
                        <button onClick={handleAccountDeletion} style={styles.button}>Delete Account</button>
                        {success && <p style={{ color: "green" }}>{success}</p>}
                        {error && <p style={{ color: "red" }}>{error}</p>}
                    </>
                )}
            </div>
        </div>
    );
}

export default Profile