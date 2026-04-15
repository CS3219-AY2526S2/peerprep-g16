import styles from "./styles";

interface User {
    id: string;
    username: string;
    email: string;
    isAdmin: boolean;
}

interface UserTableProps {
    users: User[];
    filteredUsers: User[];
    searchQuery: string;
    setSearchQuery: (v: string) => void;
    filterAdmin: string;
    setFilterAdmin: (v: string) => void;
    sortField: string;
    sortOrder: string;
    handleSort: (field: string) => void;
    handlePromote: (id: string) => void;
    handleDemote: (id: string) => void;
    currentUserId: string;
    userSuccess: string;
    userError: string;
}

function UserTable({ filteredUsers, searchQuery, setSearchQuery, filterAdmin, setFilterAdmin, sortField, sortOrder, handleSort, handlePromote, handleDemote, currentUserId, userSuccess, userError }: UserTableProps) {
    return (
        <>
            <h3 style={{ marginBottom: "20px" }}>User Database</h3>

            {/* Search and Filter Row */}
            <div style={{ display: "flex", gap: "15px", marginBottom: "20px", alignItems: "center" }}>
                <div style={styles.searchBox}>
                    <span>🔍</span>
                    <input
                        type="text"
                        placeholder="Search by username or ID"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={styles.searchInput}
                    />
                </div>
                <select
                    value={filterAdmin}
                    onChange={(e) => setFilterAdmin(e.target.value)}
                    style={styles.filterSelect}
                >
                    <option value="all">All Accounts</option>
                    <option value="user">Users</option>
                    <option value="admin">Admins</option>
                </select>
            </div>

            <table style={styles.table}>
                <colgroup>
                    <col style={{ width: "25%" }} />  {/* User ID */}
                    <col style={{ width: "15%" }} />  {/* Username */}
                    <col style={{ width: "25%" }} />  {/* Email */}
                    <col style={{ width: "10%" }} />  {/* Role */}
                    <col style={{ width: "25%" }} />  {/* Action */}
                </colgroup>
                <thead>
                    <tr>
                        <th style={styles.th} onClick={() => handleSort("id")}>
                            User ID {sortField === "id" ? (sortOrder === "asc" ? "↑" : "↓") : "↕"}
                        </th>
                        <th style={styles.th} onClick={() => handleSort("username")}>
                            Username {sortField === "username" ? (sortOrder === "asc" ? "↑" : "↓") : "↕"}
                        </th>
                        <th style={styles.th} onClick={() => handleSort("email")}>
                            Email {sortField === "email" ? (sortOrder === "asc" ? "↑" : "↓") : "↕"}
                        </th>
                        <th style={styles.th}>Role</th>
                        <th style={styles.th}>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredUsers.map((u) => (
                        <tr key={u.id} style={styles.tr}>
                            <td style={styles.td}>{u.id}</td>
                            <td style={{ ...styles.td, fontWeight: "bold" }}>{u.username}</td>
                            <td style={styles.td}>{u.email}</td>
                            <td style={styles.td}>{u.isAdmin ? "Admin" : "User"}</td>
                            <td style={styles.td}>
                                {!u.isAdmin && (
                                    <button
                                        onClick={() => handlePromote(u.id)}
                                        style={styles.promoteButton}
                                    >
                                        Promote to Admin
                                    </button>
                                )}
                                {u.isAdmin && u.id !== currentUserId && (
                                    <button
                                        onClick={() => handleDemote(u.id)}
                                        style={{ ...styles.promoteButton, backgroundColor: "red" }}
                                    >
                                        Demote to User
                                    </button>
                                )}
                                {u.isAdmin && u.id === currentUserId && (
                                    <span style={{ color: "#000000", fontSize: "13px", fontWeight: "Bold" }}>You</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {userSuccess && <p style={{ color: "green", marginTop: "10px" }}>{userSuccess}</p>}
            {userError && <p style={{ color: "red", marginTop: "10px" }}>{userError}</p>}
        </>
    );
}

export default UserTable;