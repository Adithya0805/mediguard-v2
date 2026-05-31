import { create } from 'zustand';

interface UiState {
  sidebarOpen: boolean;
  activeTab: string;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  activeTab: 'dashboard',
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
