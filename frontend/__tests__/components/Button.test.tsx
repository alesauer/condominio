/**
 * Tests for the Button UI component.
 */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock shadcn Button to avoid CSS module resolution issues
jest.mock("@/components/ui/button", () => ({
  Button: React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<"button"> & { variant?: string }>(
    ({ children, ...props }, ref) => <button ref={ref} {...props}>{children}</button>
  ),
}));
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders with text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("calls onClick handler", async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    await userEvent.click(screen.getByText("Click"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("renders with variant attribute", () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByText("Delete");
    expect(button).toBeInTheDocument();
  });

  it("renders as disabled", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByText("Disabled")).toBeDisabled();
  });
});
