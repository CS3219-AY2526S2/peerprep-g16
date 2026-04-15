import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import UserTable from "./userTable";

vi.mock("./styles", () => ({
    default: {
        searchBox: {},
        searchInput: {},
        filterSelect: {},
        table: {},
        th: {},
        tr: {},
        td: {},
        promoteButton: {},
    },
}));

const mockUsers = [
    { id: "1", username: "alice", email: "alice@example.com", isAdmin: true },
    { id: "2", username: "bob", email: "bob@example.com", isAdmin: false },
    { id: "3", username: "charlie", email: "charlie@example.com", isAdmin: false },
];

const defaultProps = {
    users: mockUsers,
    filteredUsers: mockUsers,
    searchQuery: "",
    setSearchQuery: vi.fn(),
    filterAdmin: "all",
    setFilterAdmin: vi.fn(),
    sortField: "",
    sortOrder: "asc",
    handleSort: vi.fn(),
    handlePromote: vi.fn(),
    handleDemote: vi.fn(),
    currentUserId: "1",
    userSuccess: "",
    userError: "",
};

describe("UserTable", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ─── Rendering ────────────────────────────────────────────────────────────

    describe("Rendering", () => {
        it("renders the section heading", () => {
            render(<UserTable {...defaultProps} />);
            expect(screen.getByText("User Database")).toBeInTheDocument();
        });

        it("renders all users passed in filteredUsers", () => {
            render(<UserTable {...defaultProps} />);
            expect(screen.getByText("alice")).toBeInTheDocument();
            expect(screen.getByText("bob")).toBeInTheDocument();
            expect(screen.getByText("charlie")).toBeInTheDocument();
        });

        it("renders user emails", () => {
            render(<UserTable {...defaultProps} />);
            expect(screen.getByText("alice@example.com")).toBeInTheDocument();
            expect(screen.getByText("bob@example.com")).toBeInTheDocument();
        });

        it("renders correct role labels", () => {
            render(<UserTable {...defaultProps} />);
            expect(screen.getByText("Admin")).toBeInTheDocument();
            const userLabels = screen.getAllByText("User");
            expect(userLabels).toHaveLength(2);
        });

        it("renders table column headers", () => {
            render(<UserTable {...defaultProps} />);
            expect(screen.getByText(/User ID/)).toBeInTheDocument();
            expect(screen.getByText(/Username/)).toBeInTheDocument();
            expect(screen.getByText(/Email/)).toBeInTheDocument();
            expect(screen.getByText("Role")).toBeInTheDocument();
            expect(screen.getByText("Action")).toBeInTheDocument();
        });

        it("renders an empty table body when filteredUsers is empty", () => {
            render(<UserTable {...defaultProps} filteredUsers={[]} />);
            expect(screen.queryByText("alice")).not.toBeInTheDocument();
            expect(screen.queryByText("bob")).not.toBeInTheDocument();
        });
    });

    // ─── Search & Filter controls ─────────────────────────────────────────────

    describe("Search and Filter controls", () => {
        it("renders the search input with the current searchQuery value", () => {
            render(<UserTable {...defaultProps} searchQuery="alice" />);
            const input = screen.getByPlaceholderText("Search by username or ID");
            expect(input).toHaveValue("alice");
        });

        it("calls setSearchQuery when the search input changes", () => {
            render(<UserTable {...defaultProps} />);
            const input = screen.getByPlaceholderText("Search by username or ID");
            fireEvent.change(input, { target: { value: "bob" } });
            expect(defaultProps.setSearchQuery).toHaveBeenCalledWith("bob");
        });

        it("renders the filter select with the current filterAdmin value", () => {
            render(<UserTable {...defaultProps} filterAdmin="admin" />);
            const select = screen.getByRole("combobox");
            expect(select).toHaveValue("admin");
        });

        it("calls setFilterAdmin when the filter select changes", () => {
            render(<UserTable {...defaultProps} />);
            const select = screen.getByRole("combobox");
            fireEvent.change(select, { target: { value: "admin" } });
            expect(defaultProps.setFilterAdmin).toHaveBeenCalledWith("admin");
        });

        it("renders all three filter options", () => {
            render(<UserTable {...defaultProps} />);
            expect(screen.getByRole("option", { name: "All Accounts" })).toBeInTheDocument();
            expect(screen.getByRole("option", { name: "Users" })).toBeInTheDocument();
            expect(screen.getByRole("option", { name: "Admins" })).toBeInTheDocument();
        });
    });

    // ─── Sorting ──────────────────────────────────────────────────────────────

    describe("Column sorting", () => {
        it("calls handleSort with 'id' when User ID header is clicked", () => {
            render(<UserTable {...defaultProps} />);
            fireEvent.click(screen.getByText(/User ID/));
            expect(defaultProps.handleSort).toHaveBeenCalledWith("id");
        });

        it("calls handleSort with 'username' when Username header is clicked", () => {
            render(<UserTable {...defaultProps} />);
            fireEvent.click(screen.getByText(/Username/));
            expect(defaultProps.handleSort).toHaveBeenCalledWith("username");
        });

        it("calls handleSort with 'email' when Email header is clicked", () => {
            render(<UserTable {...defaultProps} />);
            fireEvent.click(screen.getByText(/Email/));
            expect(defaultProps.handleSort).toHaveBeenCalledWith("email");
        });

        it("shows ascending arrow on the active sort field with sortOrder 'asc'", () => {
            render(<UserTable {...defaultProps} sortField="username" sortOrder="asc" />);
            expect(screen.getByText(/Username ↑/)).toBeInTheDocument();
        });

        it("shows descending arrow on the active sort field with sortOrder 'desc'", () => {
            render(<UserTable {...defaultProps} sortField="username" sortOrder="desc" />);
            expect(screen.getByText(/Username ↓/)).toBeInTheDocument();
        });

        it("shows neutral arrows on inactive sort fields", () => {
            render(<UserTable {...defaultProps} sortField="username" sortOrder="asc" />);
            expect(screen.getByText(/User ID ↕/)).toBeInTheDocument();
            expect(screen.getByText(/Email ↕/)).toBeInTheDocument();
        });
    });

    // ─── Action buttons ───────────────────────────────────────────────────────

    describe("Promote and Demote actions", () => {
        it("renders 'Promote to Admin' button for non-admin users", () => {
            render(<UserTable {...defaultProps} />);
            const promoteButtons = screen.getAllByText("Promote to Admin");
            expect(promoteButtons).toHaveLength(2);
        });

        it("calls handlePromote with the correct user id when Promote is clicked", () => {
            render(<UserTable {...defaultProps} />);
            const promoteButtons = screen.getAllByText("Promote to Admin");
            fireEvent.click(promoteButtons[0]); // bob (id: "2")
            expect(defaultProps.handlePromote).toHaveBeenCalledWith("2");
        });

        it("does not render 'Promote to Admin' button for admin users", () => {
            render(<UserTable {...defaultProps} />);
            const promoteButtons = screen.getAllByText("Promote to Admin");
            expect(promoteButtons).toHaveLength(2); // only bob and charlie
        });

        it("renders 'Demote to User' button for admins who are not the current user", () => {
            const usersWithAnotherAdmin = [
                ...mockUsers,
                { id: "4", username: "dana", email: "dana@example.com", isAdmin: true },
            ];
            render(
                <UserTable
                    {...defaultProps}
                    filteredUsers={usersWithAnotherAdmin}
                    currentUserId="1"
                />
            );
            expect(screen.getByText("Demote to User")).toBeInTheDocument();
        });

        it("calls handleDemote with the correct user id when Demote is clicked", () => {
            const usersWithAnotherAdmin = [
                ...mockUsers,
                { id: "4", username: "dana", email: "dana@example.com", isAdmin: true },
            ];
            render(
                <UserTable
                    {...defaultProps}
                    filteredUsers={usersWithAnotherAdmin}
                    currentUserId="1"
                />
            );
            fireEvent.click(screen.getByText("Demote to User"));
            expect(defaultProps.handleDemote).toHaveBeenCalledWith("4");
        });

        it("does not render 'Demote to User' button for the current user", () => {
            render(<UserTable {...defaultProps} currentUserId="1" />);
            expect(screen.queryByText("Demote to User")).not.toBeInTheDocument();
        });

        it("renders 'You' label for the current admin user instead of a Demote button", () => {
            render(<UserTable {...defaultProps} currentUserId="1" />);
            expect(screen.getByText("You")).toBeInTheDocument();
        });
    });

    // ─── Success and Error messages ────────────────────────────────────────────

    describe("Status messages", () => {
        it("displays a success message when userSuccess is set", () => {
            render(<UserTable {...defaultProps} userSuccess="User promoted successfully." />);
            expect(screen.getByText("User promoted successfully.")).toBeInTheDocument();
        });

        it("displays an error message when userError is set", () => {
            render(<UserTable {...defaultProps} userError="Failed to update user." />);
            expect(screen.getByText("Failed to update user.")).toBeInTheDocument();
        });

        it("does not display a success message when userSuccess is empty", () => {
            render(<UserTable {...defaultProps} userSuccess="" />);
            expect(screen.queryByText("User promoted successfully.")).not.toBeInTheDocument();
        });

        it("does not display an error message when userError is empty", () => {
            render(<UserTable {...defaultProps} userError="" />);
            expect(screen.queryByText("Failed to update user.")).not.toBeInTheDocument();
        });
    });
});