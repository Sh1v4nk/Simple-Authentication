// Background FloartingShpae interface
export interface FloartingShpaeInterface {
  color: string;
  size: string;
  top: string;
  left: string;
  delay: number;
}

interface User {
  username: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

// authStore interface
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  error: string | null;
  isLoading: boolean;
  isCheckingAuth: boolean;
  message: string | null;
  generalErrors: string[];
  emailError: string[] | null;
  passwordError: string[] | null;
  usernameError: string[] | null;

  signup: (email: string, password: string, username: string) => Promise<void>;
  signin: (email: string, password: string) => Promise<void>;
  verifyEmail: (emailCode: string) => Promise<void>;
  verifyAuth: () => Promise<void>;
}

// ValidationError interface
export interface ValidationError {
  field: string;
  message: string;
  path?: string[];
}
