import { create } from 'zustand';
import { toast } from 'sonner';
import {
  loginClinicalStaff,
  getClinicalStaffProfile,
  logoutClinicalStaff,
  StaffProfileData,
  LoginPayload
} from '@/lib/api';

export interface StaffProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'physician' | 'nurse' | 'pharmacist' | 'admin' | 'superadmin';
  specialization: string | null;
  institution_name: string;
  institution_code: string;
  last_login_at: string | null;
  login_count: number;
}

interface AuthState {
  staff: StaffProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, keyPhrase: string, institutionCode: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  staff: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('mediguard_clinical_token') : null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email, keyPhrase, institutionCode) => {
    set({ isLoading: true, error: null });
    try {
      const response = await loginClinicalStaff({
        email,
        key_phrase: keyPhrase,
        institution_code: institutionCode
      });
      
      // Save token to localStorage and document.cookie for Next.js middleware access
      if (typeof window !== 'undefined') {
        localStorage.setItem('mediguard_clinical_token', response.access_token);
        document.cookie = `mediguard_clinical_token=${response.access_token}; path=/; max-age=28800; Secure; SameSite=Strict`;
      }
      
      set({
        token: response.access_token,
        isAuthenticated: true,
        staff: {
          id: response.staff_id,
          email: email.toLowerCase().trim(),
          full_name: response.full_name,
          role: response.role as any,
          specialization: null,
          institution_name: response.institution_name,
          institution_code: response.institution_code,
          last_login_at: new Date().toISOString(),
          login_count: 1
        },
        isLoading: false
      });
      
      console.log("Clinical access granted");
      return true;
    } catch (error: any) {
      const errMsg = error.message || 'Clinical authentication failed.';
      set({ isLoading: false, error: errMsg });
      toast.error(errMsg);
      return false;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      const token = get().token;
      if (token) {
        await logoutClinicalStaff();
      }
    } catch (err) {
      console.warn("Logout endpoint call failed (revoked locally)", err);
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('mediguard_clinical_token');
        document.cookie = 'mediguard_clinical_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; SameSite=Strict';
      }
      set({
        token: null,
        staff: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
      toast.info('Clinical session closed.');
    }
  },

  loadFromStorage: async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('mediguard_clinical_token') : null;
    if (!token) {
      set({ token: null, staff: null, isAuthenticated: false });
      return false;
    }

    // Restore cookie if missing on page load
    if (typeof window !== 'undefined' && !document.cookie.includes('mediguard_clinical_token')) {
      document.cookie = `mediguard_clinical_token=${token}; path=/; max-age=28800; Secure; SameSite=Strict`;
    }

    set({ isLoading: true, token });
    try {
      const profile = await getClinicalStaffProfile();
      set({
        staff: profile as StaffProfile,
        isAuthenticated: true,
        isLoading: false
      });
      return true;
    } catch (error) {
      console.error("Failed to restore session profile", error);
      // Clean local storage, cookies, and state
      if (typeof window !== 'undefined') {
        localStorage.removeItem('mediguard_clinical_token');
        document.cookie = 'mediguard_clinical_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; SameSite=Strict';
      }
      set({
        token: null,
        staff: null,
        isAuthenticated: false,
        isLoading: false
      });
      return false;
    }
  },

  clearError: () => set({ error: null })
}));
