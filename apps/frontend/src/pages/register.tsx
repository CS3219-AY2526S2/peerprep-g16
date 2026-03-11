import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";


function Register  () {
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
  
      /*try {
          await axios.post('http://localhost:8080/api/users', {
              username,
              email,
              password,
          })
          setSuccess("Registration successful! Redirecting to login...")
          setTimeout(() => navigate('/'), 2000)  // wait 2 seconds then redirect
      } catch (error : any) {
          console.log(error)
          setError(error.response?.data?.message || 'Registration failed.')
      }
          */
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
          <input
            type="text"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={styles.input}
          />
        </label>
        <button onClick={handleRegister} style={styles.button}>Register</button>
        {success && <p style={{color: "green"}}>{success}</p>}
        {error && <p style={{color: "red"}}>{error}</p>}
      <p>
        Already have an account?{" "} <Link to="/" style={styles.link}>Login</Link>.
      </p>
    </div>
  );
}
const styles = {
    container: {
        marginTop: "100px",
        textAlign: "center" as const,
        maxWidth: "280px",     
        marginLeft: "auto",    
        marginRight: "auto",   
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
    
};

export default Register;
