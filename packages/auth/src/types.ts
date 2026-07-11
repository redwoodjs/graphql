export type AuthResponse = {
  readonly email?: string;
  readonly error?: string;
  readonly message?: string;
};

export type AuthClient = {
  forgotPassword(username: string): Promise<AuthResponse>;
  getToken(): Promise<null | string>;
  getUserMetadata(): Promise<null | Record<string, unknown>>;
  login(options: Record<string, unknown>): Promise<AuthResponse>;
  logout(): Promise<void>;
  resetPassword(options: Record<string, unknown>): Promise<AuthResponse>;
  signup(options: Record<string, unknown>): Promise<AuthResponse>;
  validateResetToken?(token: string): Promise<AuthResponse>;
};

export type UseAuth = {
  currentUser: Record<string, unknown> | null;
  forgotPassword: AuthClient["forgotPassword"];
  getToken: AuthClient["getToken"];
  hasRole: (role: string | string[]) => boolean;
  isAuthenticated: boolean;
  loading: boolean;
  logIn: AuthClient["login"];
  logOut: () => void;
  reauthenticate: () => Promise<void>;
  resetPassword: AuthClient["resetPassword"];
  signUp: AuthClient["signup"];
  validateResetToken: (token: string) => Promise<AuthResponse>;
};
