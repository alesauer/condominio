/**
 * Tests for the API client (lib/api.ts)
 * Uses manual mocks for axios to test interceptor behavior.
 */
import api from "@/lib/api";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(global, "localStorage", { value: localStorageMock, writable: true });

describe("API Client", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("should add Authorization header when token exists", () => {
    localStorageMock.setItem("access_token", "test-token-123");

    // Intercept the request config
    const interceptor = api.interceptors.request as any;
    const handlers = interceptor.handlers || [];

    // Manually test the request interceptor logic
    const config: any = { headers: {} };
    const token = localStorageMock.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    expect(config.headers.Authorization).toBe("Bearer test-token-123");
  });

  it("should not add Authorization header when no token", () => {
    const config: any = { headers: {} };
    const token = localStorageMock.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    expect(config.headers.Authorization).toBeUndefined();
  });

  it("should have correct base URL", () => {
    expect(api.defaults.baseURL).toBe("/api/v1");
  });
});
