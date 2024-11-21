// Background FloartingShpae interface
export interface FloartingShpaeInterface {
  color: string;
  size: string;
  top: string;
  left: string;
  delay: number;
}

// authStore interface
export interface AuthState {
  user: any;
  isAuthenticated: boolean;
  error: string | null;
  isLoading: boolean;
  isCheckingAuth: boolean;
  message: string | null;

  signup: (email: string, password: string, username: string) => Promise<void>;
}