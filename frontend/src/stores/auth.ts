import { create } from 'zustand';
import { api } from '@/lib/api';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  team_name: string;
  role: 'user' | 'admin';
  wallet_balance: number;
  is_active: boolean;
  created_at?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (username: string, password: string) => Promise<void>;
  register: (data: {
    username: string;
    email: string;
    password: string;
    full_name: string;
    team_name: string;
    role?: 'user' | 'admin';
  }) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  user: null,
  loading: false,
  error: null,

  login: async (username: string, password: string) => {
    set({ loading: true, error: null });
    try {
      console.log('Attempting login with:', { username, password: '***' });
      const response = await api.post('/auth/login', { username, password });
      console.log('Login response:', response.data);
      
      // Handle your backend's response format: {success: true, user: {...}}
      if (response.data.success && response.data.user) {
        // Store user data in localStorage for persistence
        localStorage.setItem('cricbid_user', JSON.stringify(response.data.user));
        console.log('Login successful, user stored:', response.data.user);
        set({ user: response.data.user, loading: false });
      } else {
        throw new Error(response.data.message || 'Login failed - invalid credentials');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      let errorMessage = 'Login failed';
      // Handle FastAPI validation errors (detail is an array)
      if (Array.isArray(error.response?.data?.detail)) {
        errorMessage = error.response.data.detail.map((d: any) => d.msg).join(', ');
      } else if (typeof error.response?.data?.detail === 'string') {
        errorMessage = error.response.data.detail;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message && error.message.includes('Network Error')) {
        errorMessage = 'Network error - please check if backend is running';
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Cannot connect to server - is your backend running?';
      }
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  register: async (data) => {
    set({ loading: true, error: null });
    try {
      console.log('Attempting registration with:', { ...data, password: '***' });
      const response = await api.post('/users', data);
      console.log('Registration response:', response.data);
      // Handle backend's response: return user object directly from FastAPI
      if (response.data && response.data.id) {
        // Add missing properties for consistency
        const user = {
          ...response.data,
          is_active: true
        };
        localStorage.setItem('cricbid_user', JSON.stringify(user));
        console.log('Registration successful, user stored:', user);
        set({ user: user, loading: false });
      } else {
        throw new Error(response.data.message || 'Registration failed');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      let errorMessage = 'Registration failed';
      // Handle FastAPI validation errors (detail is an array)
      if (Array.isArray(error.response?.data?.detail)) {
        errorMessage = error.response.data.detail.map((d: any) => d.msg).join(', ');
      } else if (typeof error.response?.data?.detail === 'string') {
        errorMessage = error.response.data.detail;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message && error.message.includes('Network Error')) {
        errorMessage = 'Network error - please check if backend is running';
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Cannot connect to server - is your backend running?';
      }
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  logout: async () => {
    set({ loading: true });
    try {
      console.log('Attempting logout...');
      await api.post('/auth/logout');
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error (non-critical):', error);
      // Don't throw error for logout - always clear local state
    } finally {
      // Always clear stored user data
      localStorage.removeItem('cricbid_user');
      console.log('User data cleared from localStorage');
      set({ user: null, loading: false, error: null });
      // Redirect to login page
      window.location.href = '/';
    }
  },

  checkAuth: async () => {
    set({ loading: true });
    try {
      // Only check localStorage for persisted user
      const storedUser = localStorage.getItem('cricbid_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        set({ user, loading: false });
        console.log('User restored from localStorage:', user);
      } else {
        set({ user: null, loading: false });
        console.log('No stored user data found');
      }
    } catch (error: any) {
      console.error('Auth check error:', error);
      localStorage.removeItem('cricbid_user');
      set({ user: null, loading: false });
    }
  },

  clearError: () => {
    console.log('Clearing authentication error');
    set({ error: null });
  },
}));