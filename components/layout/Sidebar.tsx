'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Users, Calendar, FileText, Settings, LogOut,
  Heart, ClipboardList, BookOpen, UserCog, BarChart2, Pill,
  AlertTriangle, CalendarClock, Bell, ChevronLeft, ChevronRight, Sun, Moon,
  MessageSquare, ScrollText,
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/lib/supabase/client';
import { useStore } from '@/lib/store';
import { useRole } from '@/hooks/useRole';
import { useSidebar } from '@/context/SidebarContext';
import { useTheme } from '@/context/ThemeContext';
import { StaffMember } from '@/lib/types';

type MenuItem = {
  name: string;
  href: string;
  icon: React.ElementType;
  roles?: Array<StaffMember['role']>;
  badge?: number;
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useUser();
  const { collapsed, setCollapsed } = useSidebar();
  const { theme, toggleTheme } = useTheme();
  const clinicName = useStore((s) => s.clinicName);
  const { role: currentUserRole } = useRole();
  const resetStore = useStore((s) => s.resetStore);
  const incidents = useStore((s) => s.incidents);
  const openCritical = incidents.filter(
    (i) => i.severity === 'critical' && i.status !== 'resolved'
  ).length;
  const wellbeingAlerts = useStore((s) => s.wellbeingAlerts);
  const openHighAlerts = wellbeingAlerts.filter(
    (a) => a.severity === 'high' && a.status === 'open'
  ).length;

  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function checkUnread() {
      const { createClient: cc } = await import('@/lib/supabase/client');
      const supabase = cc();
      const { count } = await supabase
        .from('family_messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_type', 'family')
        .is('read_at', null);
      if (!cancelled) setUnreadMessages(count ?? 0);
    }
    checkUnread();
    const id = setInterval(checkUnread, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const fullName = user?.user_metadata?.full_name || user?.email || 'User';
  const initials = fullName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    resetStore();
    router.push('/auth/login');
  };

  const menuItems: MenuItem[] = [
    { name: 'Dashboard',     href: '/dashboard',     icon: LayoutDashboard },
    { name: 'Patients',      href: '/patients',       icon: Users },
    { name: 'Appointments',  href: '/appointments',   icon: Calendar },
    { name: 'Records',       href: '/records',        icon: FileText },
    { name: 'Care Plans',    href: '/care-plans',     icon: ClipboardList },
    { name: 'Daily Records', href: '/daily-records',  icon: BookOpen },
    { name: 'Shifts',        href: '/shifts',         icon: CalendarClock },
    { name: 'Medications',   href: '/medications',    icon: Pill },
    { name: 'Messages',      href: '/messages',       icon: MessageSquare, badge: unreadMessages },
    { name: 'Alerts',        href: '/alerts',         icon: Bell,          roles: ['admin', 'manager'] as Array<StaffMember['role']>, badge: openHighAlerts },
    { name: 'Incidents',     href: '/incidents',      icon: AlertTriangle, badge: openCritical },
    { name: 'Reports',       href: '/reports',        icon: BarChart2,     roles: ['admin', 'manager'] as Array<StaffMember['role']> },
    { name: 'Audit Trail',   href: '/audit',          icon: ScrollText,    roles: ['admin', 'manager'] as Array<StaffMember['role']> },
    { name: 'Staff',         href: '/staff',          icon: UserCog },
    { name: 'Settings',      href: '/settings',       icon: Settings },
  ];

  const visibleItems = menuItems.filter(
    (item) => !item.roles || currentUserRole === null || item.roles.includes(currentUserRole)
  );

  return (
    <aside
      className={`hidden lg:flex flex-col h-screen fixed left-0 top-0 z-40 print:hidden
        bg-sidebar transition-all duration-200
        ${collapsed ? 'w-[60px]' : 'w-[220px]'}`}
    >
      {/* Logo */}
      <div className={`flex items-center h-14 shrink-0 px-3 border-b border-white/5 ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <Heart className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="text-sm font-semibold text-white leading-none">Carevity</span>
              {clinicName && (
                <p className="text-xs text-white/40 truncate leading-none mt-0.5">{clinicName}</p>
              )}
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              title={collapsed ? item.name : undefined}
              className={`flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all duration-150 group relative
                ${isActive
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
                }
                ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium truncate flex-1">{item.name}</span>
              )}
              {!collapsed && item.badge && item.badge > 0 ? (
                <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-red-500 text-white rounded-full">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              ) : null}
              {collapsed && item.badge && item.badge > 0 ? (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="shrink-0 border-t border-white/5 py-3 px-2 space-y-1">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={collapsed ? (theme === 'dark' ? 'Switch to light' : 'Switch to dark') : undefined}
          className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all duration-150 ${collapsed ? 'justify-center' : ''}`}
        >
          {theme === 'dark'
            ? <Sun className="w-4 h-4 shrink-0" />
            : <Moon className="w-4 h-4 shrink-0" />
          }
          {!collapsed && <span className="text-sm font-medium">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all duration-150 ${collapsed ? 'justify-center' : ''}`}
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4 shrink-0" />
            : <ChevronLeft className="w-4 h-4 shrink-0" />
          }
          {!collapsed && <span className="text-sm font-medium">Collapse</span>}
        </button>

        {/* User */}
        <div className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg ${collapsed ? 'justify-center' : ''}`}>
          <div
            className="w-6 h-6 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center shrink-0 cursor-default"
            title={collapsed ? fullName : undefined}
          >
            <span className="text-white font-semibold text-[10px]">{initials}</span>
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white/80 truncate leading-none">{fullName}</p>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="p-1 rounded text-white/40 hover:text-white transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {collapsed && (
            <button
              onClick={handleLogout}
              title="Sign out"
              className="absolute bottom-3 right-1 p-1 rounded text-white/40 hover:text-white transition-colors hidden"
            />
          )}
        </div>
      </div>
    </aside>
  );
}
