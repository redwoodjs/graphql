import type { ReactNode } from "react";
import { vi } from "vite-plus/test";

export type MockAuthUser = {
  readonly email: string;
  readonly id: number;
  readonly roles: string;
};

export type MockAuthState = {
  readonly currentUser: MockAuthUser | null;
  readonly forgotPassword: ReturnType<typeof vi.fn>;
  readonly getToken: ReturnType<typeof vi.fn>;
  readonly hasRole: (role: string) => boolean;
  readonly isAuthenticated: boolean;
  readonly loading: boolean;
  readonly logIn: ReturnType<typeof vi.fn>;
  readonly logOut: ReturnType<typeof vi.fn>;
  readonly reauthenticate: ReturnType<typeof vi.fn>;
  readonly resetPassword: ReturnType<typeof vi.fn>;
  readonly signUp: ReturnType<typeof vi.fn>;
  readonly validateResetToken: ReturnType<typeof vi.fn>;
};

export const createMockAuthState = (overrides: Partial<MockAuthState> = {}): MockAuthState => ({
  currentUser: null,
  forgotPassword: vi.fn(),
  getToken: vi.fn(),
  hasRole: () => false,
  isAuthenticated: false,
  loading: false,
  logIn: vi.fn(),
  logOut: vi.fn(),
  reauthenticate: vi.fn(),
  resetPassword: vi.fn(),
  signUp: vi.fn(),
  validateResetToken: vi.fn(),
  ...overrides,
});

export const mockUseAuth = vi.fn(createMockAuthState);

export const AuthProvider = ({ children }: { readonly children: ReactNode }) => children;

export const useAuth = () => mockUseAuth();
