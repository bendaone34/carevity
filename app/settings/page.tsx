'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { useTheme } from '@/context/ThemeContext';
import {
  User,
  Bell,
  Lock,
  Palette,
  Globe,
  Save,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'language', label: 'Language', icon: Globe },
  ];

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    reminders: true,
    weekly: false,
  });

  const [appearance, setAppearance] = useState({
    sidebarCollapsed: false,
    compactMode: false,
  });

  const [language, setLanguage] = useState('en');

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="animate-fadeIn">
      <Header title="Settings" subtitle="Manage your account preferences" />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-2 sticky top-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                  activeTab === tab.id
                    ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">
                Profile Information
              </h3>
              <div className="flex items-center gap-6 mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-2xl">DS</span>
                </div>
                <div>
                  <Button variant="secondary" size="sm">
                    Change Photo
                  </Button>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    JPG, GIF or PNG. Max size 2MB
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="First Name" defaultValue="Emily" />
                <Input label="Last Name" defaultValue="Smith" />
                <Input
                  label="Email"
                  type="email"
                  defaultValue="dr.smith@carevity.com"
                />
                <Input label="Phone" defaultValue="(555) 123-4567" />
                <Input label="Specialty" defaultValue="General Medicine" />
                <Input label="License Number" defaultValue="MD-12345678" />
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Bio
                  </label>
                  <textarea
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all duration-200 bg-white dark:bg-slate-800 dark:text-white resize-none"
                    rows={3}
                    defaultValue="Board certified physician with over 10 years of experience in general medicine and patient care."
                  />
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-700 flex justify-end">
                <Button>
                  <Save className="w-4 h-4" />
                  Save Changes
                </Button>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">
                Notification Preferences
              </h3>
              <div className="space-y-4">
                {[
                  {
                    key: 'email',
                    label: 'Email Notifications',
                    desc: 'Receive email updates about appointments and patients',
                  },
                  {
                    key: 'push',
                    label: 'Push Notifications',
                    desc: 'Get push notifications on your device',
                  },
                  {
                    key: 'sms',
                    label: 'SMS Notifications',
                    desc: 'Receive SMS reminders for urgent matters',
                  },
                  {
                    key: 'reminders',
                    label: 'Appointment Reminders',
                    desc: 'Get reminded 30 minutes before appointments',
                  },
                  {
                    key: 'weekly',
                    label: 'Weekly Summary',
                    desc: 'Receive weekly activity summary every Monday',
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-800 dark:text-white">{item.label}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
                    </div>
                    <button
                      onClick={() =>
                        toggleNotification(item.key as keyof typeof notifications)
                      }
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        notifications[item.key as keyof typeof notifications]
                          ? 'bg-sky-500'
                          : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          notifications[item.key as keyof typeof notifications]
                            ? 'translate-x-7'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-700 flex justify-end">
                <Button>
                  <Save className="w-4 h-4" />
                  Save Preferences
                </Button>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">
                  Change Password
                </h3>
                <div className="space-y-4 max-w-md">
                  <div className="relative">
                    <Input
                      label="Current Password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      label="New Password"
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <Input
                    label="Confirm New Password"
                    type="password"
                    placeholder="Confirm new password"
                  />
                </div>
                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-700 flex justify-end">
                  <Button>
                    <Lock className="w-4 h-4" />
                    Update Password
                  </Button>
                </div>
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">
                  Two-Factor Authentication
                </h3>
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">
                      Enable 2FA
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Button variant="secondary">Setup 2FA</Button>
                </div>
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">
                  Active Sessions
                </h3>
                <div className="space-y-3">
                  {[
                    {
                      device: 'MacBook Pro - Chrome',
                      location: 'New York, US',
                      time: 'Active now',
                      current: true,
                    },
                    {
                      device: 'iPhone 14 - Safari',
                      location: 'New York, US',
                      time: '2 hours ago',
                      current: false,
                    },
                    {
                      device: 'Windows PC - Firefox',
                      location: 'Boston, US',
                      time: '3 days ago',
                      current: false,
                    },
                  ].map((session, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-800 flex items-center gap-2">
                          {session.device}
                          {session.current && (
                            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                              Current
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {session.location} • {session.time}
                        </p>
                      </div>
                      {!session.current && (
                        <Button variant="ghost" size="sm">
                          Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">
                Appearance Settings
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Theme
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { value: 'light' as const, label: 'Light', icon: '☀️' },
                      { value: 'dark' as const, label: 'Dark', icon: '🌙' },
                    ].map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setTheme(t.value)}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          theme === t.value
                            ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/30'
                            : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                        }`}
                      >
                        <div className="text-2xl mb-2">{t.icon}</div>
                        <p className="font-medium text-gray-800 dark:text-white">{t.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      key: 'sidebarCollapsed',
                      label: 'Collapsed Sidebar',
                      desc: 'Show only icons in the sidebar',
                    },
                    {
                      key: 'compactMode',
                      label: 'Compact Mode',
                      desc: 'Reduce spacing and padding throughout the app',
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-800 dark:text-white">{item.label}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
                      </div>
                      <button
                        onClick={() =>
                          setAppearance((prev) => ({
                            ...prev,
                            [item.key]:
                              !prev[item.key as keyof typeof appearance],
                          }))
                        }
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          appearance[item.key as keyof typeof appearance]
                            ? 'bg-sky-500'
                            : 'bg-gray-300 dark:bg-slate-600'
                        }`}
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            appearance[item.key as keyof typeof appearance]
                              ? 'translate-x-7'
                              : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-700 flex justify-end">
                <Button>
                  <Save className="w-4 h-4" />
                  Save Preferences
                </Button>
              </div>
            </div>
          )}

          {/* Language Tab */}
          {activeTab === 'language' && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">
                Language & Region
              </h3>
              <div className="space-y-4 max-w-md">
                <Select
                  label="Language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  options={[
                    { value: 'en', label: 'English (US)' },
                    { value: 'en-gb', label: 'English (UK)' },
                    { value: 'es', label: 'Spanish' },
                    { value: 'fr', label: 'French' },
                    { value: 'de', label: 'German' },
                    { value: 'pt', label: 'Portuguese' },
                    { value: 'zh', label: 'Chinese' },
                    { value: 'ja', label: 'Japanese' },
                  ]}
                />
                <Select
                  label="Timezone"
                  options={[
                    { value: 'est', label: 'Eastern Time (ET)' },
                    { value: 'cst', label: 'Central Time (CT)' },
                    { value: 'mst', label: 'Mountain Time (MT)' },
                    { value: 'pst', label: 'Pacific Time (PT)' },
                    { value: 'utc', label: 'UTC' },
                  ]}
                />
                <Select
                  label="Date Format"
                  options={[
                    { value: 'mdy', label: 'MM/DD/YYYY' },
                    { value: 'dmy', label: 'DD/MM/YYYY' },
                    { value: 'ymd', label: 'YYYY-MM-DD' },
                  ]}
                />
                <Select
                  label="Time Format"
                  options={[
                    { value: '12h', label: '12-hour (AM/PM)' },
                    { value: '24h', label: '24-hour' },
                  ]}
                />
              </div>
              <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-700 flex justify-end">
                <Button>
                  <Save className="w-4 h-4" />
                  Save Preferences
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}