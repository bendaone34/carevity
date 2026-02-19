'use client';

import Link from 'next/link';
import { Heart, Users, Calendar, FileText, BarChart3, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import Button from '@/components/ui/Button';
import ChatBot from '@/components/ChatBot';

const features = [
  {
    icon: Users,
    title: 'Patient Management',
    description: 'Organize and access patient records with ease. Track demographics, medical history, and treatment plans in one place.',
  },
  {
    icon: Calendar,
    title: 'Appointment Scheduling',
    description: 'Streamline bookings with an intuitive calendar. Manage availability, send reminders, and reduce no-shows.',
  },
  {
    icon: FileText,
    title: 'Medical Records',
    description: 'Securely store and retrieve medical documents. Maintain comprehensive records with full audit trails.',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Insights',
    description: 'Make data-driven decisions with real-time dashboards. Track key metrics and identify trends across your practice.',
  },
];

export default function Home() {
  const { theme, toggleTheme } = useTheme();

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
      <section className="px-6 pt-16 pb-24 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-white/60 dark:bg-slate-800/60 rounded-full px-4 py-2 text-sm font-medium text-sky-700 dark:text-sky-300 mb-6">
          <Heart className="w-4 h-4" />
          Healthcare Management, Simplified
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white leading-tight max-w-4xl mx-auto">
          Modern care management for{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-blue-600">
            healthcare professionals
          </span>
        </h1>
        <p className="mt-6 text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Carevity helps clinics and practitioners manage patients, appointments, and medical records — all in one streamlined platform.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/auth/signup">
            <Button size="lg">Get Started</Button>
          </Link>
          <Link href="/auth/login">
            <Button variant="secondary" size="lg">Login</Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-6 py-20 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            Everything you need to run your practice
          </h2>
          <p className="mt-4 text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
            Powerful tools designed for healthcare teams of any size.
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
            Built for modern healthcare
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
            Carevity is designed to reduce administrative burden so you can focus on what matters most — your patients. Our platform brings together scheduling, records, and analytics into a single, intuitive interface.
          </p>
          <div className="mt-8">
            <Link href="/auth/login">
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
