import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import MatchmakingOverlay from "./matchmakingOverlay";

vi.mock("./styles", () => ({
  default: {
    overlay: {},
    box: {},
    spinner: {},
    acceptButton: {},
    cancelButton: {},
  },
}));

describe("MatchmakingOverlay", () => {
  const defaultProps = {
    isTimeout: false,
    matchStatus: "Finding a match...",
    elapsed: 45,
    topic: "Arrays",
    difficulty: "Easy",
    onCancel: vi.fn(),
    onDismiss: vi.fn(),
    isRedirecting: false,
  };

  it("renders loading state when not timed out", () => {
    render(<MatchmakingOverlay {...defaultProps} />);

    expect(screen.getByText("Finding a match...")).toBeInTheDocument();
    expect(screen.getByText(/Time elapsed:/i)).toBeInTheDocument();
    expect(screen.getByText(/Arrays/i)).toBeInTheDocument();
    expect(screen.getByText(/Easy/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("renders timeout state", () => {
    render(
      <MatchmakingOverlay
        {...defaultProps}
        isTimeout={true}
      />
    );

    expect(screen.getByText("No Match Found")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Sorry, there are no available matches at the moment/i
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ok/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
  });

  it("formats elapsed time as mm:ss", () => {
    render(
      <MatchmakingOverlay
        {...defaultProps}
        elapsed={65}
      />
    );

    expect(screen.getByText("01:05")).toBeInTheDocument();
  });

  it("shows selected difficulty when elapsed is under 60 seconds", () => {
    render(
      <MatchmakingOverlay
        {...defaultProps}
        elapsed={30}
        difficulty="Medium"
      />
    );

    expect(screen.getByText(/Topic:/i)).toBeInTheDocument();
    expect(screen.getByText(/Arrays/i)).toBeInTheDocument();
    expect(screen.getByText(/Medium/i)).toBeInTheDocument();
  });

  it('shows "Any" when difficulty is empty and elapsed is under 60 seconds', () => {
    render(
      <MatchmakingOverlay
        {...defaultProps}
        elapsed={30}
        difficulty=""
      />
    );

    expect(screen.getAllByText(/Any/i).length).toBeGreaterThan(0);
  });

  it('forces difficulty to "Any" when elapsed is between 60 and 119 seconds', () => {
    render(
      <MatchmakingOverlay
        {...defaultProps}
        elapsed={90}
        difficulty="Hard"
      />
    );

    expect(screen.getAllByText(/Any/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/^Hard$/i)).not.toBeInTheDocument();
  });

  it("does not show topic/difficulty info when elapsed is 120 seconds or more", () => {
    render(
      <MatchmakingOverlay
        {...defaultProps}
        elapsed={120}
      />
    );

    expect(screen.queryByText(/Topic:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Difficulty:/i)).not.toBeInTheDocument();
  });

  it("calls onCancel when Cancel button is clicked", () => {
    const onCancel = vi.fn();

    render(
      <MatchmakingOverlay
        {...defaultProps}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onDismiss when OK button is clicked in timeout state", () => {
    const onDismiss = vi.fn();

    render(
      <MatchmakingOverlay
        {...defaultProps}
        isTimeout={true}
        onDismiss={onDismiss}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /ok/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("disables Cancel button when redirecting", () => {
    render(
      <MatchmakingOverlay
        {...defaultProps}
        isRedirecting={true}
      />
    );

    expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
  });
});