import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BubbleHint } from "./BubbleHint";

describe("BubbleHint", () => {
  it("renders nothing when show is false", () => {
    const { container } = render(<BubbleHint show={false} />);
    expect(container.innerHTML).toBe("");
  });

  it("shows collapsed hint button when show is true", () => {
    render(<BubbleHint show={true} />);
    expect(screen.getByText("speech bubbles...")).toBeInTheDocument();
  });

  it("expands to show full instructions on click", () => {
    render(<BubbleHint show={true} />);
    fireEvent.click(screen.getByText("speech bubbles..."));
    expect(
      screen.getByText(/Drag speech bubbles to position them/i),
    ).toBeInTheDocument();
    expect(screen.getByText("got it")).toBeInTheDocument();
  });

  it("dismisses when 'got it' is clicked", () => {
    render(<BubbleHint show={true} />);
    fireEvent.click(screen.getByText("speech bubbles..."));
    fireEvent.click(screen.getByText("got it"));
    expect(screen.queryByText("speech bubbles...")).not.toBeInTheDocument();
    expect(screen.queryByText("got it")).not.toBeInTheDocument();
  });

  it("calls onExpandedChange when expanding and dismissing", () => {
    const onChange = vi.fn();
    render(<BubbleHint show={true} onExpandedChange={onChange} />);
    fireEvent.click(screen.getByText("speech bubbles..."));
    expect(onChange).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByText("got it"));
    expect(onChange).toHaveBeenCalledWith(false);
  });
});
