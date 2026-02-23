'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Settings,
  LogOut,
  Heart,
  ChevronRight,
  ClipboardList,
  BookOpen,
  UserCog,
  BarChart2,
  Pill,
  AlertTriangle,
  CalendarClock,
  Bell,
} from 'lucide-react';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/lib/supabase/client';
import { useStore } from '@/lib/store';
import { StaffMember } from '@/lib/types';

type MenuItem = {
  name: string;
  href: string;
  icon: React.ElementType;
  roles?: Array<StaffMember['role']>;
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useUser();
  const clinicName = useStore((s) => s.clinicName);
  const currentUserRole = useStore((s) => s.currentUserRole);
  const resetStore = useStore((s) => s.resetStore);
  const incidents = useStore((s) => s.incidents);
  const openCritical = incidents.filter(
    (i) => i.severity === 'critical' && i.status !== 'resolved'
  ).length;
  const wellbeingAlerts = useStore((s) => s.wellbeingAlerts);
  const openHighAlerts  = wellbeingAlerts.filter((a) => a.severity === 'high' && a.status === 'open').length;

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
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Patients', href: '/patients', icon: Users },
    { name: 'Appointments', href: '/appointments', icon: Calendar },
    { name: 'Medical Records', href: '/records', icon: FileText },
    { name: 'Care Plans', href: '/care-plans', icon: ClipboardList },
    { name: 'Daily Records', href: '/daily-records', icon: BookOpen },
    { name: 'Shifts', href: '/shifts', icon: CalendarClock },
    { name: 'Medications', href: '/medications', icon: Pill },
    { name: 'Alerts', href: '/alerts', icon: Bell, roles: ['admin', 'manager'] as Array<StaffMember['role']> },
    { name: 'Incidents', href: '/incidents', icon: AlertTriangle },
    { name: 'Reports', href: '/reports', icon: BarChart2, roles: ['admin', 'manager'] },
    { name: 'Staff', href: '/staff', icon: UserCog },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <aside className="hidden lg:flex w-64 bg-white dark:bg-slate-800 h-screen fixed left-0 top-0 border-r border-gray-200 dark:border-slate-700 flex-col z-40 transition-colors duration-300 print:hidden">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100 dark:border-slate-700">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/30">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold text-gray-800 dark:text-white">Carevity</span>
            {clinicName
              ? <p className="text-xs text-sky-600 font-medium truncate">{clinicName}</p>
              : <p className="text-xs text-gray-500 dark:text-gray-400">Healthcare Management</p>
            }
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems
            .filter((item) => !item.roles || currentUserRole === null || item.roles.includes(currentUserRole))
            .map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const IconComponent = item.icon;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <IconComponent
                      className={`w-5 h-5 ${
                        isActive
                          ? 'text-sky-600 dark:text-sky-400'
                          : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                      }`}
                    />
                    <span className="font-medium">{item.name}</span>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4" />}
                  {!isActive && item.name === 'Alerts' && openHighAlerts > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs font-bold bg-red-500 text-white rounded-full">
                      {openHighAlerts > 9 ? '9+' : openHighAlerts}
                    </span>
                  )}
                  {!isActive && item.name === 'Incidents' && openCritical > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs font-bold bg-red-500 text-white rounded-full">
                      {openCritical > 9 ? '9+' : openCritical}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Theme Toggle & User Section */}
      <div className="p-4 border-t border-gray-100 dark:border-slate-700 space-y-4">
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Theme</span>
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-700/50">
          <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center shrink-0">
            <span className="text-white font-semibold text-sm">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{fullName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-2 hover:bg-white dark:hover:bg-slate-600 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4 text-gray-400 hover:text-red-500 transition-colors" />
          </button>
        </div>
      </div>
    </aside>
  );
}
