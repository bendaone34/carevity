'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Pill,
  AlertTriangle,
} from 'lucide-react';
import { useStore } from '@/lib/store';

const NAV_ITEMS = [
  { href: '/dashboard',     icon: LayoutDashboard, label: 'Home'     },
  { href: '/patients',      icon: Users,           label: 'Patients' },
  { href: '/daily-records', icon: BookOpen,        label: 'Records'  },
  { href: '/medications',   icon: Pill,            label: 'Meds'     },
  { href: '/incidents',     icon: AlertTriangle,   label: 'Incidents'},
];

export default function BottomNav() {
  const pathname = usePathname();
  const incidents = useStore((s) => s.incidents);
  const openCritical = incidents.filter(
    (i) => i.severity === 'critical' && i.status !== 'resolved'
  ).length;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-gray-200 bg-white px-1 pb-safe dark:border-slate-700 dark:bg-slate-800 lg:hidden">
      {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            className={`flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1 transition-colors ${
              isActive
                ? 'text-sky-600 dark:text-sky-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <div className="relative">
              <Icon className="h-5 w-5" />
              {href === '/incidents' && openCritical > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
                  {openCritical > 9 ? '9+' : openCritical}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium leading-tight">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
