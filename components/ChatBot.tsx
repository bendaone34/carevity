'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';

interface Message {
  role: 'bot' | 'user';
  text: string;
}

const faqData = [
  {
    question: 'What is Carevity?',
    keywords: ['what', 'carevity', 'about', 'platform'],
    answer:
      'Carevity is a modern healthcare management platform designed for clinics and practitioners. It brings together patient management, appointment scheduling, medical records, and analytics into one streamlined interface.',
  },
  {
    question: 'Features overview',
    keywords: ['features', 'capabilities', 'tools', 'offer', 'do'],
    answer:
      'Carevity includes: Patient Management for organizing records and treatment plans, Appointment Scheduling with reminders, secure Medical Records storage with audit trails, and Analytics & Insights dashboards to track key metrics.',
  },
  {
    question: 'How do I get started?',
    keywords: ['start', 'sign up', 'register', 'create', 'account', 'begin', 'join'],
    answer:
      'Getting started is easy! Click the "Get Started" or "Sign Up" button on our homepage to create your account. You can set up your practice profile and start adding patients right away.',
  },
  {
    question: 'Pricing & cost',
    keywords: ['price', 'pricing', 'cost', 'plan', 'free', 'pay', 'subscription', 'how much'],
    answer:
      'Carevity offers flexible pricing plans to fit practices of any size. Contact our sales team for detailed pricing information, or sign up to start with our free trial — no credit card required.',
  },
  {
    question: 'Is my data secure?',
    keywords: ['secure', 'security', 'privacy', 'safe', 'data', 'hipaa', 'encrypt', 'protection'],
    answer:
      'Absolutely. Carevity uses industry-standard encryption, secure cloud infrastructure, and full audit trails. Your patient data is protected with enterprise-grade security measures and we follow healthcare data compliance best practices.',
  },
  {
    question: 'Contact support',
    keywords: ['contact', 'support', 'help', 'email', 'phone', 'reach', 'issue', 'problem'],
    answer:
      'You can reach our support team through the Contact link in the footer, or email us at support@carevity.com. We typically respond within 24 hours on business days.',
  },
];

const WELCOME_MESSAGE: Message = {
  role: 'bot',
  text: "Hi! I'm the Carevity Assistant. How can I help you today? Choose a topic below or type your question.",
};

const FALLBACK =
  "I'm not sure I have an answer for that. Try one of the suggested topics, or contact our support team for more help!";

function matchFaq(input: string): string {
  const lower = input.toLowerCase();
  let bestMatch: (typeof faqData)[number] | null = null;
  let bestCount = 0;

  for (const faq of faqData) {
    const count = faq.keywords.filter((kw) => lower.includes(kw)).length;
    if (count > bestCount) {
      bestCount = count;
      bestMatch = faq;
    }
  }

  return bestMatch ? bestMatch.answer : FALLBACK;
}

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSend(text: string) {
    if (!text.trim()) return;

    const userMsg: Message = { role: 'user', text: text.trim() };
    const botMsg: Message = { role: 'bot', text: matchFaq(text) };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput('');
  }

  function handleQuickReply(faq: (typeof faqData)[number]) {
    const userMsg: Message = { role: 'user', text: faq.question };
    const botMsg: Message = { role: 'bot', text: faq.answer };
    setMessages((prev) => [...prev, userMsg, botMsg]);
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat Window */}
      <div
        className={`${
          open
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
        } transition-all duration-200 ease-out origin-bottom-right w-[360px] max-h-[500px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-slate-700`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white shrink-0">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            <span className="font-semibold text-sm">Carevity Assistant</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded-lg hover:bg-white/20 transition-colors"
            aria-label="Close chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-br-md'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200 rounded-bl-md'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />

          {/* Quick Replies (show after last bot message) */}
          {messages[messages.length - 1]?.role === 'bot' && (
            <div className="flex flex-wrap gap-2 pt-1">
              {faqData.map((faq) => (
                <button
                  key={faq.question}
                  onClick={() => handleQuickReply(faq)}
                  className="text-xs px-3 py-1.5 rounded-full border border-sky-300 dark:border-sky-600 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-900/30 transition-colors"
                >
                  {faq.question}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-gray-200 dark:border-slate-700 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a question..."
              className="flex-1 px-3 py-2 text-sm rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-sky-400"
            />
            <button
              type="submit"
              className="p-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              disabled={!input.trim()}
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Floating Toggle Button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-14 h-14 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/30 hover:shadow-xl hover:shadow-sky-500/40 transition-all flex items-center justify-center"
        aria-label="Open chat"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  );
}
