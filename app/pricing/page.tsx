'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, Check, ChevronDown, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import Button from '@/components/ui/Button';

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 49,
    description: 'Perfect for small care homes getting started with digital care management.',
    features: [
      'Up to 15 residents',
      'Care plans and daily records',
      'Medication management',
      'Up to 5 staff accounts',
      'Email support',
    ],
    cta: 'Get Started',
    ctaHref: '/auth/signup',
    popular: false,
  },
  {
    id: 'professional',
    name: 'Professional',
    monthlyPrice: 99,
    description: 'The complete solution for growing care homes that need advanced features.',
    features: [
      'Up to 50 residents',
      'Everything in Starter',
      'Incident reporting',
      'Reporting and analytics',
      'Staff role management',
      'Priority support',
      'CSV and PDF exports',
    ],
    cta: 'Get Started',
    ctaHref: '/auth/signup',
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: null,
    description: 'Tailored for large organisations and multi-site care providers.',
    features: [
      'Unlimited residents',
      'Everything in Professional',
      'Multi-site management',
      'CQC compliance reporting',
      'Dedicated account manager',
      'Custom onboarding',
      'SLA guarantee',
    ],
    cta: 'Contact Us',
    ctaHref: '/auth/signup',
    popular: false,
  },
];

const faqs = [
  {
    q: 'Can I change my plan later?',
    a: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle, and we'll prorate any difference in cost automatically.",
  },
  {
    q: 'Is my data secure?',
    a: 'Absolutely. All data is encrypted in transit and at rest using AES-256 encryption. We use industry-standard security practices, perform regular automated backups, and our infrastructure is hosted on SOC 2 compliant cloud providers.',
  },
  {
    q: 'What happens after the free trial?',
    a: "After your 14-day free trial ends, you'll be prompted to choose a plan and enter your payment details. If you decide not to continue, your data is retained for 30 days before permanent deletion — no questions asked.",
  },
  {
    q: 'Do you offer discounts for small care homes?',
    a: 'Yes — our Starter plan is specifically designed with small care homes in mind. We also offer a 20% discount on all plans when billed annually. If you have specific requirements or budget constraints, contact us to discuss a custom arrangement.',
  },
  {
    q: 'Is Carevity GDPR compliant?',
    a: "Yes. Carevity is fully GDPR compliant. We act as a data processor while you remain the data controller. We provide a Data Processing Agreement (DPA) on request, and your residents' data is never shared with third parties for any purpose.",
  },
];

export default function PricingPage() {
  const { theme, toggleTheme } = useTheme();
  const [billing, setBilling] = useState<'monthly' | 'annually'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  function displayPrice(monthlyPrice: number | null) {
    if (monthlyPrice === null) return null;
    return billing === 'annually' ? Math.round(monthlyPrice * 0.8) : monthlyPrice;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 dark:from-slate-900 dark:to-slate-800">

      {/* ── Navbar ───────────────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl shadow-lg shadow-sky-500/30">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-800 dark:text-white">Carevity</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link href="/#features" className="text-gray-600 dark:text-gray-300 hover:text-sky-600 dark:hover:text-sky-400 transition-colors font-medium">
            Features
          </Link>
          <Link href="/#about" className="text-gray-600 dark:text-gray-300 hover:text-sky-600 dark:hover:text-sky-400 transition-colors font-medium">
            About
          </Link>
          <Link href="/pricing" className="text-sky-600 dark:text-sky-400 font-medium">
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

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <section className="px-6 pt-16 pb-10 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-white/60 dark:bg-slate-800/60 rounded-full px-4 py-2 text-sm font-medium text-sky-700 dark:text-sky-300 mb-6">
          <Heart className="w-4 h-4" />
          No hidden fees. No long-term contracts.
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
          Simple,{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-blue-600">
            transparent
          </span>{' '}
          pricing
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
          Choose the plan that fits your care home. All plans include a 14-day free trial.
        </p>

        {/* Billing toggle */}
        <div className="mt-8 inline-flex items-center bg-white dark:bg-slate-800 rounded-full p-1 shadow-sm border border-gray-200 dark:border-slate-700">
          <button
            onClick={() => setBilling('monthly')}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              billing === 'monthly'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling('annually')}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
              billing === 'annually'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Annually
            <span
              className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                billing === 'annually'
                  ? 'bg-white/20 text-white'
                  : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
              }`}
            >
              −20%
            </span>
          </button>
        </div>
      </section>

      {/* ── Pricing Cards ────────────────────────────────────────────────────── */}
      <section className="px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:items-center">
          {plans.map((plan) => {
            const price = displayPrice(plan.monthlyPrice);

            if (plan.popular) {
              return (
                <div
                  key={plan.id}
                  className="relative bg-gradient-to-b from-sky-500 to-blue-600 rounded-2xl shadow-2xl shadow-sky-500/30 p-8 flex flex-col md:scale-[1.05] md:z-10"
                >
                  <span className="inline-flex items-center self-start mb-5 bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Most Popular
                  </span>

                  <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                  <p className="text-white/75 text-sm mb-6 leading-relaxed">{plan.description}</p>

                  <div className="mb-6">
                    <div className="flex items-end gap-1">
                      <span className="text-5xl font-bold text-white">£{price}</span>
                      <span className="text-white/75 mb-2 text-base">/mo</span>
                    </div>
                    {billing === 'annually' && (
                      <p className="text-white/65 text-xs mt-1.5">
                        Billed annually at £{price! * 12} · Save £{(plan.monthlyPrice! - price!) * 12}/year
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2.5 text-sm text-white/90">
                        <span className="flex-shrink-0 w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Link href={plan.ctaHref}>
                    <button className="w-full py-3 px-6 bg-white text-sky-600 font-semibold rounded-xl hover:bg-sky-50 transition-colors text-sm">
                      {plan.cta}
                    </button>
                  </Link>
                </div>
              );
            }

            return (
              <div
                key={plan.id}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-8 flex flex-col"
              >
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{plan.name}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 leading-relaxed">{plan.description}</p>

                <div className="mb-6">
                  {price !== null ? (
                    <>
                      <div className="flex items-end gap-1">
                        <span className="text-5xl font-bold text-gray-900 dark:text-white">£{price}</span>
                        <span className="text-gray-500 dark:text-gray-400 mb-2 text-base">/mo</span>
                      </div>
                      {billing === 'annually' && (
                        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1.5">
                          Billed annually at £{price * 12} · Save £{(plan.monthlyPrice! - price) * 12}/year
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="text-5xl font-bold text-gray-900 dark:text-white">Custom</span>
                      <p className="text-gray-400 dark:text-gray-500 text-xs mt-1.5">Tailored to your organisation</p>
                    </>
                  )}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-300">
                      <span className="flex-shrink-0 w-5 h-5 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link href={plan.ctaHref}>
                  <Button className="w-full" variant={plan.id === 'enterprise' ? 'secondary' : 'primary'}>
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Trial note ───────────────────────────────────────────────────────── */}
      <div className="px-6 mt-10 mb-2">
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <span className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            14-day free trial on all plans
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            No credit card required
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            Cancel any time
          </span>
        </p>
      </div>

      {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            Frequently asked questions
          </h2>
          <p className="mt-4 text-gray-600 dark:text-gray-400 text-lg">
            Can&apos;t find the answer you&apos;re looking for?{' '}
            <a
              href="mailto:hello@carevity.app"
              className="text-sky-600 dark:text-sky-400 hover:underline font-medium"
            >
              Get in touch
            </a>
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden"
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left gap-4"
              >
                <span className="font-semibold text-gray-900 dark:text-white">{faq.q}</span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                    openFaq === i ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaq === i && (
                <div className="px-6 pb-5 pt-0 border-t border-gray-100 dark:border-slate-700">
                  <p className="pt-4 text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="px-6 pb-20 max-w-7xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 md:p-12 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to transform your care home?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed mb-8">
            Join care homes across the UK using Carevity to reduce paperwork, stay compliant, and give their teams more time to care.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/signup">
              <Button size="lg">Start Free Trial</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="secondary" size="lg">View Demo</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
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

    </div>
  );
}
