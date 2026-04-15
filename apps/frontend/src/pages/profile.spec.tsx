import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, beforeEach, test, expect } from "vitest";
import api from "../api/axiosInstance";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../api/axiosInstance", () => ({
  default: {
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../components/styles", () => ({
  default: {
    sidebar: {},
    heading: {},
    activeTab: {},
    tab: {},
    label: {},
    input: {},
    button: {},
    passwordBorder: {},
    passwordRequirements: {},
  },
}));

describe("Profile", () => {
  const mockLogin = {
    id: "123",
    username: "alice",
    email: "alice@mail.com",
    token: "fake-jwt-token",
  };

  const renderProfile = async () => {
    const { default: Profile } = await import("./profile");
    return render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.stubEnv("VITE_USER_SERVICE_URL", "http://localhost:3000");

    localStorage.clear();
    localStorage.setItem("login", JSON.stringify(mockLogin));
  });

  test("renders username tab by default", async () => {
    await renderProfile();

    expect(screen.getByText(/Current Username:/i)).toBeInTheDocument();
    expect(screen.getByText(/alice/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Submit/i })).toBeInTheDocument();
  });

  test("switches to email tab", async () => {
    await renderProfile();

    fireEvent.click(screen.getByRole("button", { name: /Email Update/i }));

    expect(screen.getByText(/Current Email:/i)).toBeInTheDocument();
    expect(screen.getByText(/alice@mail\.com/i)).toBeInTheDocument();
  });

  test("shows error if new username is same as current username", async () => {
    await renderProfile();

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "alice" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit/i }));

    expect(await screen.findByText(/Please enter a new username\./i)).toBeInTheDocument();
    expect(api.patch).not.toHaveBeenCalled();
  });

  test("updates username successfully", async () => {
    (api.patch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: {} });

    await renderProfile();

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "alice_new" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        "http://localhost:3000/users/123",
        { username: "alice_new" },
        { headers: { Authorization: "Bearer fake-jwt-token" } }
      );
    });

    expect(await screen.findByText(/Username Update successful!/i)).toBeInTheDocument();

    const updatedLogin = JSON.parse(localStorage.getItem("login") || "{}");
    expect(updatedLogin.username).toBe("alice_new");
  });

  test("shows 409 error when username already exists", async () => {
    (api.patch as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
      response: {
        status: 409,
        data: { message: "Conflict" },
      },
    });

    await renderProfile();

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "taken_name" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit/i }));

    expect(
      await screen.findByText(/Username already exists, please choose a different one\./i)
    ).toBeInTheDocument();
  });

  test("shows error if new email is same as current email", async () => {
    await renderProfile();

    fireEvent.click(screen.getByRole("button", { name: /Email Update/i }));

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "alice@mail.com" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit/i }));

    expect(await screen.findByText(/Please enter a new email address\./i)).toBeInTheDocument();
    expect(api.patch).not.toHaveBeenCalled();
  });

  test("shows error for invalid email format", async () => {
    await renderProfile();

    fireEvent.click(screen.getByRole("button", { name: /Email Update/i }));

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "invalid-email" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit/i }));

    expect(await screen.findByText(/Please enter a valid email address\./i)).toBeInTheDocument();
    expect(api.patch).not.toHaveBeenCalled();
  });

  test("updates email successfully", async () => {
    (api.patch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: {} });

    await renderProfile();

    fireEvent.click(screen.getByRole("button", { name: /Email Update/i }));

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "new@mail.com" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        "http://localhost:3000/users/123",
        { email: "new@mail.com" },
        { headers: { Authorization: "Bearer fake-jwt-token" } }
      );
    });

    expect(await screen.findByText(/Email Update successful!/i)).toBeInTheDocument();

    const updatedLogin = JSON.parse(localStorage.getItem("login") || "{}");
    expect(updatedLogin.email).toBe("new@mail.com");
  });

  test("shows error when password is too short", async () => {
    await renderProfile();

    fireEvent.click(screen.getByRole("button", { name: /Password Update/i }));

    const passwordInputs = screen.getAllByDisplayValue("");
    fireEvent.change(passwordInputs[1], { target: { value: "Ab1@" } });
    fireEvent.change(passwordInputs[2], { target: { value: "Ab1@" } });

    fireEvent.click(screen.getByRole("button", { name: /Submit/i }));

    expect(
      await screen.findByText(/Password must be at least 8 characters long\./i)
    ).toBeInTheDocument();
    expect(api.patch).not.toHaveBeenCalled();
  });

  test("shows error when passwords do not match", async () => {
    await renderProfile();

    fireEvent.click(screen.getByRole("button", { name: /Password Update/i }));

    const passwordInputs = screen.getAllByDisplayValue("");
    fireEvent.change(passwordInputs[0], { target: { value: "OldPassword1@" } });
    fireEvent.change(passwordInputs[1], { target: { value: "NewPassword1@" } });
    fireEvent.change(passwordInputs[2], { target: { value: "Mismatch1@" } });

    fireEvent.click(screen.getByRole("button", { name: /Submit/i }));

    expect(await screen.findByText(/Passwords don't match!/i)).toBeInTheDocument();
    expect(api.patch).not.toHaveBeenCalled();
  });

  test("updates password successfully", async () => {
    (api.patch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: {} });

    await renderProfile();

    fireEvent.click(screen.getByRole("button", { name: /Password Update/i }));

    const passwordInputs = screen.getAllByDisplayValue("");
    fireEvent.change(passwordInputs[0], { target: { value: "OldPassword1@" } });
    fireEvent.change(passwordInputs[1], { target: { value: "NewPassword1@" } });
    fireEvent.change(passwordInputs[2], { target: { value: "NewPassword1@" } });

    fireEvent.click(screen.getByRole("button", { name: /Submit/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        "http://localhost:3000/users/123",
        {
          password: "NewPassword1@",
          currentPassword: "OldPassword1@",
        },
        { headers: { Authorization: "Bearer fake-jwt-token" } }
      );
    });

    expect(await screen.findByText(/Password Update successful!/i)).toBeInTheDocument();
  });

  test("deletes account and navigates to home when confirmed", async () => {
    (api.delete as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: {} });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    await renderProfile();

    fireEvent.click(screen.getByRole("button", { name: /Account Deletion/i }));
    fireEvent.click(screen.getByRole("button", { name: /Delete Account/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith("http://localhost:3000/users/123", {
        headers: { Authorization: "Bearer fake-jwt-token" },
      });
    });

    expect(localStorage.getItem("login")).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith("/");

    confirmSpy.mockRestore();
  });

  test("does not delete account when user cancels confirmation", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    await renderProfile();

    fireEvent.click(screen.getByRole("button", { name: /Account Deletion/i }));
    fireEvent.click(screen.getByRole("button", { name: /Delete Account/i }));

    expect(api.delete).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });
});