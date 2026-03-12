import { Link } from "react-router-dom";

function Homepage() {
    return (
        <div style={styles.container}>
            <h2 style={styles.heading}>Welcome to PeerPrep!</h2>
            <p>Welcome back to PeerPrep? Click here to <Link to="/login" style={styles.link}>Login</Link>.</p>
            <p>New to PeerPrep? Click here to <Link to="/register" style={styles.link}>Register</Link>.</p>
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
        width: "250px",       
        padding: "12px",
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

export default Homepage