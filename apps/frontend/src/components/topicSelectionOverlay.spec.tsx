import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import TopicSelectionOverlay from "./topicSelectionOverlay";

describe("TopicSelectionOverlay", () => {
  it("renders nothing when selected is false", () => {
    const { container } = render(
      <TopicSelectionOverlay selected={false} onDismiss={vi.fn()} />
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders the overlay content when selected is true", () => {
    render(<TopicSelectionOverlay selected={true} onDismiss={vi.fn()} />);

    expect(screen.getByText("Topic Required")).toBeInTheDocument();
    expect(
      screen.getByText("Please select a topic before matchmaking.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ok/i })).toBeInTheDocument();
  });

  it("calls onDismiss when OK button is clicked", () => {
    const onDismiss = vi.fn();

    render(<TopicSelectionOverlay selected={true} onDismiss={onDismiss} />);

    fireEvent.click(screen.getByRole("button", { name: /ok/i }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});