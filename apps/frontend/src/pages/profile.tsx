import React from "react"
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Profile() {
    const [activeTab, setActiveTab] = React.useState("password");
    const [username, setUsername] = useState("");
    const currentUsername = useState("");
    const [email, setEmail] = useState("");
    const currentEmail = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const currentPassword = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const [success, setSuccess] = useState("");

    const handleEmailValidation = () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("Please enter a valid email address.");
            return false;
        }
        setError("");
        return true;
    }
    const handlePasswordValidation = () => {
        const uppercaseRegex = /[A-Z]/;
        const lowercaseRegex = /[a-z]/;
        const numberRegex = /\d/;
        const specialCharRegex = /[@$!%*?&]/;
        if (password.length < 8) {
            setError("Password must be at least 8 characters long.");
            setPassword("");
            setConfirmPassword("");
            return false;
        }
        else if (!uppercaseRegex.test(password)) {
            setError("Password must contain at least 1 Uppercase letter.");
            setPassword("");
            setConfirmPassword("");
            return false;
        }
        else if (!lowercaseRegex.test(password)) {
            setError("Password must contain at least 1 lowercase letter.");
            setPassword("");
            setConfirmPassword("");
            return false;
        }
        else if (!numberRegex.test(password)) {
            setError("Password must contain at least 1 number.");
            setPassword("");
            setConfirmPassword("");
            return false;
        }
        else if (!specialCharRegex.test(password)) {
            setError("Password must contain at least 1 special character (@$!%*?&).");
            setPassword("");
            setConfirmPassword("");
            return false;
        }
        setError("");
        return true;
    }

    const handleConfirmPasswordValidation = () => {
        if (password !== confirmPassword) {
            setError("Passwords don't match!")
            setPassword("")
            setConfirmPassword("")
            return false
        }
        return true
    }

    
    return (
        <div style={{ display: "flex", marginTop: "60px"}}>
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
            </div>
            <div style={{ flex: 1, padding: "60px" }}>
                {activeTab === "username" && (
                    <>
                        <label style={styles.label}>
                            Current Username:
                        </label>
                        <label style={styles.label}>
                            Updated Username:
                            <input type="text" style={styles.input} />
                        </label>
                        <button style={styles.button} type="submit">
                            Submit
                        </button>
                    </>
                )}

                {activeTab === "email" && (
                    <>
                        <label style={styles.label}>
                            Current Email:
                        </label>
                        <label style={styles.label}>
                            Updated Email:
                            <input type="text" style={styles.input} />
                        </label>
                        <button style={styles.button} type="submit">
                            Submit
                        </button>
                    </>
                )}

                {activeTab === "password" && (
                    <>
                        <label style={styles.label}>
                            Current Password:
                            <input type="text" style={styles.input} />
                        </label>
                        <label style={styles.label}>
                            Updated Password:
                            <input type="text" style={styles.input} />
                        </label>
                        <p style={styles.passwordBorder}>
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
                        </p>
                        <label style={styles.label}>
                            Confirm Password:
                            <input type="text" style={styles.input} />
                        </label>
                        <button style={styles.button} type="submit">
                            Submit
                        </button>
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

    error: {
        color: "red",
    },

    input: {
        marginBottom: "5px",
        borderRadius: "10px",
        width: "250px",
        padding: "12px",
    },

    label: {
        display: "flex" as const,
        alignItems: "center" as const,
        gap: "20px",
        marginBottom: "30px",
        fontSize: "16px",
        whiteSpace: "nowrap" as const,
    },

    passwordBorder: {
        backgroundColor: "#f5f5f5",
        border: "1px solid #ddd",
        borderRadius: "4px",
        padding: "12px",
        margin: "10px 0",
        fontSize: "14px",
        color: "#666",
        textAlign: "left" as const
    },
    
    passwordRequirements: {
        margin: "5px 0",
        paddingLeft: "20px",
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
    
    sidebar: {
        width: "200px",
        height: "auto",
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