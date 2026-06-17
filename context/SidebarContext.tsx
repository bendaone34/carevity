'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface SidebarContextValue {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  setCollapsed: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsedState] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored === 'true') setCollapsedState(true);
  }, []);

  const setCollapsed = (v: boolean) => {
    setCollapsedState(v);
    if (mounted) localStorage.setItem('sidebar-collapsed', String(v));
  };

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
