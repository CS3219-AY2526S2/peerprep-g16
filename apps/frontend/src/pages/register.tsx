import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
            await api.post(`${USER_SERVICE_URL}/users`, {
                username,
                email,
                password,
            })
            setError("")
            setSuccess("Registration successful! Redirecting to login...")
            setTimeout(() => navigate('/'), 2000)
        } catch (err) {
            const apiErr = err as ApiError;
            if (apiErr.response?.status === 409) {
                setError("Username already exists, please choose a different one.")
            } else {
                console.log(apiErr)
                setError(apiErr.response?.data?.message || 'Registration failed.')
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
        } else if (!uppercaseRegex.test(password)) {
            setError("Password must contain at least 1 Uppercase letter.");
            setPassword("");
            setConfirmPassword("");
            return false;
        } else if (!lowercaseRegex.test(password)) {
            setError("Password must contain at least 1 lowercase letter.");
            setPassword("");
            setConfirmPassword("");
            return false;
        } else if (!numberRegex.test(password)) {
            setError("Password must contain at least 1 number.");
            setPassword("");
            setConfirmPassword("");
            return false;
        } else if (!specialCharRegex.test(password)) {
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
                    type="password"
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
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={styles.input}
                />
            </label>
            <button onClick={handleRegister} style={styles.button}>Register</button>
            {success && <p style={{ color: "green" }}>{success}</p>}
            <p>
                Already have an account?{" "}<Link to="/" style={styles.link}>Login</Link>.
            </p>
        </div>
    );
}

export default Register;