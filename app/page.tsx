'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, ClipboardList, BookOpen, Pill, Users, Sun, Moon, CheckCircle } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import Button from '@/components/ui/Button';
import ChatBot from '@/components/ChatBot';
import { createClient } from '@/lib/supabase/client';

const features = [
  {
    icon: ClipboardList,
    title: 'Care Plans',
    description: 'Create and manage personalised care plans for every resident. Set goals, assign tasks, and track progress across your whole team.',
  },
  {
    icon: BookOpen,
    title: 'Daily Care Records',
    description: 'Log daily observations, activities, and incidents with ease. Keep a complete, timestamped record of every resident\'s day.',
  },
  {
    icon: Pill,
    title: 'Medication Management',
    description: 'Track medication schedules and log administrations in real time. Get instant alerts for missed or refused doses before the end of shift.',
  },
  {
    icon: Users,
    title: 'Staff & Reporting',
    description: 'Manage your team with role-based access for admins, managers, and carers. Generate reports and stay audit-ready at all times.',
  },
];

function DashboardMockup() {
  return (
    <div className="w-full max-w-4xl mx-auto mt-14 px-4">
      {/* Browser chrome */}
      <div className="rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        {/* Title bar */}
        <div className="bg-gray-100 dark:bg-slate-800 px-4 py-3 flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-400" />
            <span className="w-3 h-3 rounded-full bg-yellow-400" />
            <span className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 bg-white dark:bg-slate-700 rounded-md px-3 py-1 text-xs text-gray-400 dark:text-slate-400 text-center max-w-xs mx-auto">
            carevity.app/dashboard
          </div>
        </div>

        {/* App content */}
        <div className="flex bg-gray-50 dark:bg-slate-900" style={{ height: '340px' }}>
          {/* Sidebar */}
          <div className="w-48 bg-white dark:bg-slate-800 border-r border-gray-100 dark:border-slate-700 flex-shrink-0 flex flex-col py-4 px-3 gap-1">
            <div className="flex items-center gap-2 px-2 mb-4">
              <div className="w-7 h-7 bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Heart className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-bold text-gray-800 dark:text-white">Carevity</span>
            </div>
            {[
              { label: 'Dashboard', active: true },
              { label: 'Patients' },
              { label: 'Care Plans' },
              { label: 'Daily Records' },
              { label: 'Medications' },
              { label: 'Reports' },
            ].map(({ label, active }) => (
              <div
                key={label}
                className={`px-3 py-2 rounded-lg text-xs font-medium ${
                  active
                    ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Main content */}
          <div className="flex-1 overflow-hidden p-4 flex flex-col gap-3">
            {/* Header */}
            <div className="text-sm font-semibold text-gray-800 dark:text-white">Good morning, Sarah</div>

            {/* Stat cards */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Residents', value: '24', color: 'text-sky-600 dark:text-sky-400' },
                { label: 'Care Plans', value: '18', color: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Records Today', value: '9', color: 'text-violet-600 dark:text-violet-400' },
                { label: 'Med Alerts', value: '3', color: 'text-amber-600 dark:text-amber-400' },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-slate-700"
                >
                  <div className={`text-lg font-bold ${color}`}>{value}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {/* Bottom panels */}
            <div className="grid grid-cols-3 gap-2 flex-1 min-h-0">
              {/* Recent activity */}
              <div className="col-span-2 bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">Recent Activity</div>
                {[
                  { name: 'Margaret T.', action: 'Care plan updated', time: '2m ago', dot: 'bg-emerald-400' },
                  { name: 'Robert H.', action: 'Morning meds logged', time: '14m ago', dot: 'bg-sky-400' },
                  { name: 'Dorothy L.', action: 'Daily record added', time: '31m ago', dot: 'bg-violet-400' },
                  { name: 'Frank B.', action: 'Medication refused', time: '1h ago', dot: 'bg-amber-400' },
                ].map(({ name, action, time, dot }) => (
                  <div key={name} className="flex items-center gap-2 py-1.5 border-b border-gray-50 dark:border-slate-700 last:border-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-24 flex-shrink-0">{name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex-1 truncate">{action}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{time}</span>
                  </div>
                ))}
              </div>

              {/* Medication alerts */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">Medication Alerts</div>
                {[
                  { name: 'Frank B.', med: 'Amlodipine 5mg' },
                  { name: 'Edith W.', med: 'Metformin 500mg' },
                  { name: 'Harold K.', med: 'Lisinopril 10mg' },
                ].map(({ name, med }) => (
                  <div key={name} className="flex items-start gap-2 py-1.5 border-b border-gray-50 dark:border-slate-700 last:border-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-1" />
                    <div>
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300">{name}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{med}</div>
                    </div>
                  </div>
                ))}
                <div className="mt-2 text-xs text-sky-600 dark:text-sky-400 font-medium">View schedule →</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace('/dashboard');
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 dark:from-slate-900 dark:to-slate-800">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl shadow-lg shadow-sky-500/30">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-800 dark:text-white">Carevity</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-gray-600 dark:text-gray-300 hover:text-sky-600 dark:hover:text-sky-400 transition-colors font-medium">
            Features
          </a>
          <a href="#about" className="text-gray-600 dark:text-gray-300 hover:text-sky-600 dark:hover:text-sky-400 transition-colors font-medium">
            About
          </a>
          <Link href="/pricing" className="text-gray-600 dark:text-gray-300 hover:text-sky-600 dark:hover:text-sky-400 transition-colors font-medium">
            Pricing
          </Link>
          <Link href="/dashboard" className="text-gray-600 dark:text-gray-300 hover:text-sky-600 dark:hover:text-sky-400 transition-colors font-medium">
            Demo
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <Link href="/auth/login">
            <Button variant="ghost" size="sm">Login</Button>
          </Link>
          <Link href="/auth/signup">
            <Button size="sm">Sign Up</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 pt-16 pb-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-white/60 dark:bg-slate-800/60 rounded-full px-4 py-2 text-sm font-medium text-sky-700 dark:text-sky-300 mb-6">
          <Heart className="w-4 h-4" />
          Care Home Management, Simplified
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white leading-tight max-w-4xl mx-auto">
          Smarter care management for{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-blue-600">
            care homes & social care
          </span>
        </h1>
        <p className="mt-6 text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Carevity helps care teams manage care plans, daily care records, medication schedules, staff, and reporting — all in one place.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/auth/signup">
            <Button size="lg">Get Started Free</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="secondary" size="lg">View Demo</Button>
          </Link>
        </div>

        {/* Dashboard Mockup */}
        <DashboardMockup />
      </section>

      {/* Social proof strip */}
      <section className="px-6 py-10 max-w-7xl mx-auto">
        <div className="flex flex-wrap justify-center gap-x-10 gap-y-4">
          {[
            'Care plan management',
            'Medication tracking',
            'Daily records',
            'Staff role management',
            'Compliance reporting',
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 font-medium">
              <CheckCircle className="w-4 h-4 text-sky-500 flex-shrink-0" />
              {item}
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-6 py-20 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            Everything your care home needs
          </h2>
          <p className="mt-4 text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
            Purpose-built tools for care home staff, managers, and administrators.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900/30 rounded-xl flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-sky-600 dark:text-sky-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="px-6 py-20 max-w-7xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 md:p-12 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Built for the people who care
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
            Carevity is designed to reduce administrative burden so your team can focus on what matters most — providing outstanding care. From the morning medication round to end-of-day reporting, every feature is built around the real workflows of care home staff.
          </p>
          <div className="mt-8">
            <Link href="/auth/signup">
              <Button size="lg">Start using Carevity</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 max-w-7xl mx-auto border-t border-gray-200 dark:border-slate-700">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-sky-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              &copy; {new Date().getFullYear()} Carevity. All rights reserved.
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
            <a href="#" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">Terms</a>
            <a href="#" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">Contact</a>
          </div>
        </div>
      </footer>

      <ChatBot />
    </div>
  );
}
