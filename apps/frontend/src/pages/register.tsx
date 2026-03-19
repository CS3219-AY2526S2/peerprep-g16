import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axiosInstance"

function Register() {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const [success, setSuccess] = useState("");
    const handleRegister = async () => {

        if (!handleEmailValidation()) return
        else if (!handlePasswordValidation()) return
        else if (!handleConfirmPasswordValidation()) return

        try {
            await api.post('http://localhost:3001/users', {
                username,
                email,
                password,
            })
            setError("")
            setSuccess("Registration successful! Redirecting to login...")
            setTimeout(() => navigate('/'), 2000)
        } catch (error: any) {
            if (error.response?.status === 409) {
                setError("Username already exists, please choose a different one.")
            }
            else {
                console.log(error)
                setError(error.response?.data?.message || 'Registration failed.')
            }
        }
    }


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
        <div style={styles.container}>
            <h2 style={styles.heading}>User Registration</h2>
            {error && <p style={styles.error}>{error}</p>}
            <label style={styles.label}>
                Username:
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={styles.input}
                />
            </label>
            <label style={styles.label}>
                Email:
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={styles.input}
                />
            </label>
            <label style={styles.label}>
                Password:
                <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={styles.input}
                />
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
                Confirm Password:
                <input
                    type="text"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={styles.input}
                />
            </label>
            <button onClick={handleRegister} style={styles.button}>Register</button>
            {success && <p style={{ color: "green" }}>{success}</p>}
            {error && <p style={{ color: "red" }}>{error}</p>}
            <p>
                Already have an account?{" "} <Link to="/" style={styles.link}>Login</Link>.
            </p>
        </div>
    );
}
const styles = {
    container: {
        marginTop: "50px",
        textAlign: "center" as const,
        maxWidth: "280px",
        marginLeft: "auto",
        marginRight: "auto",
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center" as const,
        justifyContent: "flex-start" as const,  // add this
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

export default Register;
