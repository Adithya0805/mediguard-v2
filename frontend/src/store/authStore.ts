import { create } from 'zustand';
import { toast } from 'sonner';
import { loginClinician, getClinicianProfile, ClinicianProfile } from '@/lib/api';

interface AuthState {
  token: string | null;
  clinician: ClinicianProfile | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('medi_token') : null,
  clinician: null,
  isLoading: false,

  login: async (username, password) => {
    set({ isLoading: true });
    try {
      const response = await loginClinician(username, password);
      // Save token to localStorage FIRST so api.ts interceptor can inject it into the next request
      if (typeof window !== 'undefined') {
        localStorage.setItem('medi_token', response.access_token);
        localStorage.setItem('medi_clinician_name', response.name);
        localStorage.setItem('medi_clinician_role', response.role);
      }
      set({ 
        token: response.access_token,
        isLoading: false 
      });
      // Fetch fresh profile to populate store (token is now in localStorage for interceptor)
      const profile = await getClinicianProfile();
      set({ clinician: profile });
      return true;
    } catch (error: any) {
      set({ isLoading: false });
      toast.error(error.message || 'Login failed. Please verify clinical credentials.');
      return false;
    }
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('medi_token');
      localStorage.removeItem('medi_clinician_name');
      localStorage.removeItem('medi_clinician_role');
    }
    set({ token: null, clinician: null });
    toast.info('Clinical session closed.');
  },

  checkAuth: async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('medi_token') : null;
    if (!token) {
      set({ token: null, clinician: null });
      return false;
    }

    try {
      set({ token });
      const profile = await getClinicianProfile();
      set({ clinician: profile });
      return true;
    } catch (error) {
      // Token is invalid/expired
      if (typeof window !== 'undefined') {
        localStorage.removeItem('medi_token');
      }
      set({ token: null, clinician: null });
      return false;
    }
  }
}));
