import React from "react"
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosInstance"

function Profile() {
    const stored = localStorage.getItem("login");
    const user = stored ? JSON.parse(stored) : null;
    const token = user?.token;
    const [activeTab, setActiveTab] = React.useState("username");
    const [newUsername, setNewUsername] = useState("");
    const [currentUsername, setCurrentUsername] = useState("");
    const [newEmail, setEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        setSuccess("");
        setError("");
    }, [activeTab])

    const handleEmailUpdate = async () => {
        if (!emailChange()) return
        else if (!handleEmailValidation()) return

        try {
            await api.patch(`http://localhost:3001/users/${user?.id}`,
                { email: newEmail },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            localStorage.setItem("login", JSON.stringify({
                ...JSON.parse(localStorage.getItem("login")!),
                email: newEmail,
            }));
            setError("")
            setSuccess("Email Update successful!")
        } catch (error: any) {
            console.log(error)
            setError(error.response?.data?.message || 'Email Update failed.')
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
            await api.patch(`http://localhost:3001/users/${user?.id}`,
                { password: newPassword },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            localStorage.setItem("login", JSON.stringify({
                ...JSON.parse(localStorage.getItem("login")!),
                password: newPassword,
            }));
            setError("")
            setSuccess("Password Update successful!")
        } catch (error: any) {
            console.log(error)
            setError(error.response?.data?.message || 'Email Update failed.')
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
            await api.patch(`http://localhost:3001/users/${user?.id}`,
                { username: newUsername },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            localStorage.setItem("login", JSON.stringify({
                ...JSON.parse(localStorage.getItem("login")!),
                username: newUsername,
            }));
            setError("")
            setSuccess("Username Update successful!")
        } catch (error: any) {
            console.log(error)
            if (error.response?.status === 409) {
                setError("Username already exists, please choose a different one.")
            } else {
                setError(error.response?.data?.message || 'Username Update failed.')
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
            await api.delete(`http://localhost:3001/users/${user?.id}`,
                { headers: { Authorization: `Bearer ${token}` } }
            )
            localStorage.removeItem("login");
            navigate("/");
        } catch (error: any) {
            setError(error.response?.data?.message || 'Account deletion failed.')
        }

    }


    return (
        <div style={{ display: "flex", marginTop: "60px", minHeight: "100vh" }}>
            <div style={styles.sidebar}>
                <h3 style={styles.heading}>Account</h3>
                <button onClick={() => setActiveTab("username")} style={activeTab === "username" ? styles.activeTab : styles.tab}>
                    Username Update
                </button>
                <button onClick={() => setActiveTab("email")} style={activeTab === "email" ? styles.activeTab : styles.tab}>
                    Email Update
                </button>
                <button onClick={() => setActiveTab("password")} style={activeTab === "password" ? styles.activeTab : styles.tab}>
                    Password Update
                </button>
                <button onClick={() => setActiveTab("delete")} style={activeTab === "delete" ? styles.activeTab : styles.tab}>
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
                            <input type="text"
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                style={styles.input} />
                        </label>
                        <label style={styles.label}>
                            <span style={{ width: "160px", display: "inline-block", textAlign: "left" }}>New Password:</span>
                            <input type="text"
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
                            <input type="text"
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

const styles = {

    heading: {
        fontSize: "20px",
        color: "#333",
        textAlign: "left" as const,
        padding: 0,
        margin: "20px 0 20px 20px"
    },

    input: {
        marginBottom: "5px",
        borderRadius: "10px",
        width: "250px",
        padding: "12px",
        border: "1px solid #ccc",
        outline: "none",
        boxSizing: "border-box" as const,
        flexShrink: 0 as const,
    },

    label: {
        display: "flex" as const,
        alignItems: "center" as const,
        gap: "20px",
        marginBottom: "30px",
        fontSize: "16px",
        whiteSpace: "nowrap" as const,
        width: "100%",
        justifyContent: "flex-start" as const,
    },

    passwordBorder: {
        backgroundColor: "#f5f5f5",
        border: "1px solid #ddd",
        borderRadius: "4px",
        padding: "12px",
        margin: "10px 0",
        fontSize: "14px",
        color: "#666",
        textAlign: "left" as const,
        width: "460px",
        marginBottom: "30px"
    },

    passwordRequirements: {
        margin: "5px 0",
        paddingLeft: "20px",
    },

    button: {
        padding: "10px 20px",
        backgroundColor: "white",
        border: "2px solid #333",
        borderRadius: "20px",
        fontWeight: "bold" as const,
        fontSize: "15px",
        cursor: "pointer",
        alignSelf: "flex-start"
    },

    link: {
        textDecoration: "none",
        color: "#007BFF",
    },

    sidebar: {
        width: "200px",
        minHeight: "100vh",    // change from height: "auto"
        borderRight: "1px solid #000000",
        textAlign: "left" as const,
        left: 0,
        padding: 0,
    },

    tab: {
        display: "block" as const,
        width: "100%",
        padding: "15px 20px",
        textAlign: "left" as const,
        border: "none",
        backgroundColor: "transparent",
        cursor: "pointer",
        fontSize: "15px",
        left: 0,
    },

    activeTab: {
        display: "block" as const,
        width: "100%",
        padding: "15px 20px",
        textAlign: "left" as const,
        border: "none",
        cursor: "pointer",
        fontSize: "15px",
        backgroundColor: "#ffffff",
        fontWeight: "bold",
    }


};


export default Profile