'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { useTheme } from '@/context/ThemeContext';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import {
  User,
  Bell,
  Lock,
  Palette,
  Globe,
  Save,
  Eye,
  EyeOff,
  Building2,
  Copy,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import Breadcrumbs from '@/components/ui/Breadcrumbs';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { currentUserRole, organisation, updateOrganisation, staffMembers } = useStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Profile state
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    jobTitle: '',
  });

  // Password state
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwords, setPasswords] = useState({
    current: '',
    next: '',
    confirm: '',
  });

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'language', label: 'Language', icon: Globe },
    ...(currentUserRole === 'admin' ? [{ id: 'organisation', label: 'Organisation', icon: Building2 }] : []),
  ];

  const [notifications, setNotifications] = useState<{ email: boolean; push: boolean; sms: boolean; reminders: boolean; weekly: boolean }>(() => {
    try {
      const stored = localStorage.getItem('carevity:notifications');
      if (stored) return JSON.parse(stored);
    } catch {}
    return { email: true, push: true, sms: false, reminders: true, weekly: false };
  });

  const [appearance, setAppearance] = useState<{ sidebarCollapsed: boolean; compactMode: boolean }>(() => {
    try {
      const stored = localStorage.getItem('carevity:appearance');
      if (stored) return JSON.parse(stored);
    } catch {}
    return { sidebarCollapsed: false, compactMode: false };
  });

  const [language, setLanguage] = useState(() => {
    try {
      return localStorage.getItem('carevity:language') ?? 'en-gb';
    } catch {}
    return 'en-gb';
  });

  const [prefsSaving, setPrefsSaving] = useState(false);

  // Organisation tab state
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgForm, setOrgForm] = useState({ name: '', address: '', phone: '', email: '' });

  function savePreferences(type: 'notifications' | 'appearance' | 'language') {
    setPrefsSaving(true);
    try {
      if (type === 'notifications') localStorage.setItem('carevity:notifications', JSON.stringify(notifications));
      if (type === 'appearance')    localStorage.setItem('carevity:appearance',    JSON.stringify(appearance));
      if (type === 'language')      localStorage.setItem('carevity:language',      language);
      toast.success('Preferences saved');
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setPrefsSaving(false);
    }
  }

  // Sync org form from store
  useEffect(() => {
    if (organisation) {
      setOrgForm({
        name:    organisation.name,
        address: organisation.address,
        phone:   organisation.phone,
        email:   organisation.email,
      });
    }
  }, [organisation]);

  // Load real profile on mount
  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, email, phone, job_title')
        .eq('id', user.id)
        .single();

      const fullName = prof?.full_name ?? '';
      const spaceIdx = fullName.indexOf(' ');
      const firstName = spaceIdx >= 0 ? fullName.slice(0, spaceIdx) : fullName;
      const lastName  = spaceIdx >= 0 ? fullName.slice(spaceIdx + 1) : '';

      setProfile({
        firstName,
        lastName,
        email: prof?.email ?? user.email ?? '',
        phone: prof?.phone ?? '',
        jobTitle: prof?.job_title ?? '',
      });
      setProfileLoading(false);
    }
    loadProfile();
  }, []);

  async function saveProfile() {
    setProfileSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      const fullName = [profile.firstName.trim(), profile.lastName.trim()]
        .filter(Boolean)
        .join(' ');

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: profile.phone || null,
          job_title: profile.jobTitle || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Also update auth metadata so the name shows correctly in the header
      await supabase.auth.updateUser({ data: { full_name: fullName } });

      toast.success('Profile saved');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setProfileSaving(false);
    }
  }

  async function savePassword() {
    if (passwords.next !== passwords.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwords.next.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setPasswordSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: passwords.next });
      if (error) throw error;
      setPasswords({ current: '', next: '', confirm: '' });
      toast.success('Password updated');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setPasswordSaving(false);
    }
  }

  async function saveOrganisation() {
    setOrgSaving(true);
    try {
      await updateOrganisation(orgForm);
      toast.success('Organisation saved');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save organisation');
    } finally {
      setOrgSaving(false);
    }
  }

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Derive initials from real name
  const initials = [profile.firstName[0], profile.lastName[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || '?';

  return (
    <div className="animate-fadeIn">
      <Breadcrumbs items={[{ label: 'Settings' }]} />
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

              {profileLoading ? (
                <div className="space-y-4 animate-pulse">
                  <div className="flex items-center gap-6 mb-6">
                    <div className="w-20 h-20 bg-gray-200 dark:bg-slate-700 rounded-full" />
                    <div className="h-8 w-32 bg-gray-200 dark:bg-slate-700 rounded" />
                  </div>
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-10 bg-gray-100 dark:bg-slate-700 rounded-lg" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-6 mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-white font-bold text-2xl">{initials}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-white">
                        {[profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Your Name'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{profile.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="First Name"
                      value={profile.firstName}
                      onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
                    />
                    <Input
                      label="Last Name"
                      value={profile.lastName}
                      onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={profile.email}
                      disabled
                      className="opacity-60 cursor-not-allowed"
                    />
                    <Input
                      label="Phone"
                      value={profile.phone}
                      onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="e.g. 07700 900000"
                    />
                    <div className="md:col-span-2">
                      <Input
                        label="Job Title"
                        value={profile.jobTitle}
                        onChange={(e) => setProfile((p) => ({ ...p, jobTitle: e.target.value }))}
                        placeholder="e.g. Care Home Manager"
                      />
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-700 flex justify-end">
                    <Button onClick={saveProfile} disabled={profileSaving}>
                      <Save className="w-4 h-4" />
                      {profileSaving ? 'Saving…' : 'Save Changes'}
                    </Button>
                  </div>
                </>
              )}
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
                <Button onClick={() => savePreferences('notifications')} disabled={prefsSaving}>
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
                      label="New Password"
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Enter new password (min 8 characters)"
                      value={passwords.next}
                      onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <Input
                    label="Confirm New Password"
                    type="password"
                    placeholder="Confirm new password"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                  />
                </div>
                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-700 flex justify-end">
                  <Button onClick={savePassword} disabled={passwordSaving}>
                    <Lock className="w-4 h-4" />
                    {passwordSaving ? 'Updating…' : 'Update Password'}
                  </Button>
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
                            [item.key]: !prev[item.key as keyof typeof appearance],
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
                <Button onClick={() => savePreferences('appearance')} disabled={prefsSaving}>
                  <Save className="w-4 h-4" />
                  Save Preferences
                </Button>
              </div>
            </div>
          )}

          {/* Organisation Tab */}
          {activeTab === 'organisation' && (
            <div className="space-y-6">
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">
                  Organisation Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Organisation Name"
                    value={orgForm.name}
                    onChange={(e) => setOrgForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={orgForm.email}
                    onChange={(e) => setOrgForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="e.g. hello@myclinic.co.uk"
                  />
                  <div className="md:col-span-2">
                    <Input
                      label="Address"
                      value={orgForm.address}
                      onChange={(e) => setOrgForm((f) => ({ ...f, address: e.target.value }))}
                      placeholder="e.g. 12 High Street, London"
                    />
                  </div>
                  <Input
                    label="Phone"
                    value={orgForm.phone}
                    onChange={(e) => setOrgForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="e.g. 020 7946 0000"
                  />
                </div>
                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-700 flex justify-end">
                  <Button onClick={saveOrganisation} disabled={orgSaving || !orgForm.name.trim()}>
                    <Save className="w-4 h-4" />
                    {orgSaving ? 'Saving…' : 'Save Changes'}
                  </Button>
                </div>
              </div>

              {/* Subscription Tier */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                  Subscription
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Current plan:</span>
                  {organisation && (
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                        organisation.subscriptionTier === 'enterprise'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                          : organisation.subscriptionTier === 'professional'
                          ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400'
                      }`}
                    >
                      {organisation.subscriptionTier}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  {staffMembers.length} staff member{staffMembers.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Invite Link */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  Invite Team Members
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Share this link with staff to let them join your organisation.
                </p>
                {organisation && (
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/join/${organisation.id}?name=${encodeURIComponent(organisation.name)}`}
                      className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-mono"
                    />
                    <Button
                      variant="secondary"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${window.location.origin}/join/${organisation.id}?name=${encodeURIComponent(organisation.name)}`
                        );
                        toast.success('Invite link copied!');
                      }}
                    >
                      <Copy className="w-4 h-4" />
                      Copy Link
                    </Button>
                  </div>
                )}
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
                    { value: 'en-gb', label: 'English (UK)' },
                    { value: 'en', label: 'English (US)' },
                    { value: 'es', label: 'Spanish' },
                    { value: 'fr', label: 'French' },
                    { value: 'de', label: 'German' },
                    { value: 'pt', label: 'Portuguese' },
                  ]}
                />
                <Select
                  label="Timezone"
                  options={[
                    { value: 'utc', label: 'UTC' },
                    { value: 'europe-london', label: 'Europe/London (GMT/BST)' },
                    { value: 'est', label: 'Eastern Time (ET)' },
                    { value: 'pst', label: 'Pacific Time (PT)' },
                  ]}
                />
                <Select
                  label="Date Format"
                  options={[
                    { value: 'dmy', label: 'DD/MM/YYYY' },
                    { value: 'mdy', label: 'MM/DD/YYYY' },
                    { value: 'ymd', label: 'YYYY-MM-DD' },
                  ]}
                />
                <Select
                  label="Time Format"
                  options={[
                    { value: '24h', label: '24-hour' },
                    { value: '12h', label: '12-hour (AM/PM)' },
                  ]}
                />
              </div>
              <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-700 flex justify-end">
                <Button onClick={() => savePreferences('language')} disabled={prefsSaving}>
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
