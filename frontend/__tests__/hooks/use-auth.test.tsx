/**
 * Tests for use-auth hook — AuthProvider, login, logout, and state.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import api from "@/lib/api";

// Mock the API module
jest.mock("@/lib/api", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    defaults: { baseURL: "/api/v1" },
    interceptors: {
      request: { use: jest.fn(), handlers: [] },
      response: { use: jest.fn(), handlers: [] },
    },
  },
}));

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(global, "localStorage", { value: localStorageMock });

function TestComponent() {
  const { user, isLoading, login, logout } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!user) return <div>Not authenticated</div>;

  return (
    <div>
      <span data-testid="user-name">{user.nome}</span>
      <span data-testid="user-email">{user.email}</span>
      <span data-testid="user-role">{user.role}</span>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
}

describe("useAuth hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  it("should show not authenticated when no token", async () => {
    localStorageMock.removeItem("access_token");
    (api.get as jest.Mock).mockRejectedValue(new Error("No token"));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Not authenticated")).toBeInTheDocument();
    });
  });

  it("should authenticate user when token exists and /auth/me succeeds", async () => {
    localStorageMock.setItem("access_token", "valid-token");

    const mockUser = { id: "1", nome: "Admin", email: "admin@test.com", role: "admin" };
    (api.get as jest.Mock).mockResolvedValue({ data: mockUser });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user-name")).toHaveTextContent("Admin");
      expect(screen.getByTestId("user-email")).toHaveTextContent("admin@test.com");
      expect(screen.getByTestId("user-role")).toHaveTextContent("admin");
    });
  });

  it("should clear auth on /auth/me failure", async () => {
    localStorageMock.setItem("access_token", "invalid-token");
    (api.get as jest.Mock).mockRejectedValue(new Error("Unauthorized"));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Not authenticated")).toBeInTheDocument();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith("access_token");
    });
  });

  it("should login successfully and fetch user", async () => {
    localStorageMock.setItem("access_token", "new-token");
    localStorageMock.setItem("refresh_token", "new-refresh");

    const mockUser = { id: "2", nome: "João", email: "joao@test.com", role: "morador" };
    (api.post as jest.Mock).mockResolvedValue({ data: { access_token: "new-token", refresh_token: "new-refresh" } });
    (api.get as jest.Mock).mockResolvedValue({ data: mockUser });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for user info to appear
    await screen.findByText("João");
    expect(screen.getByTestId("user-name")).toHaveTextContent("João");
    expect(screen.getByTestId("user-email")).toHaveTextContent("joao@test.com");
  });

  it("should logout and clear tokens", async () => {
    localStorageMock.setItem("access_token", "token");
    localStorageMock.setItem("refresh_token", "refresh");

    const mockUser = { id: "1", nome: "Admin", email: "admin@test.com", role: "admin" };
    (api.get as jest.Mock).mockResolvedValue({ data: mockUser });
    (api.post as jest.Mock).mockResolvedValue({ data: {} });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for user info
    await screen.findByText("Admin");

    // Click logout
    await userEvent.click(screen.getByText("Logout"));

    // Wait for Not authenticated
    await screen.findByText("Not authenticated");
    expect(localStorageMock.removeItem).toHaveBeenCalledWith("access_token");
  });
});
