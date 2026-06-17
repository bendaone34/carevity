'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, UserRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useFamilyContext } from '@/hooks/useFamilyContext';

interface Message {
  id: string;
  senderType: 'family' | 'staff';
  senderName: string;
  message: string;
  createdAt: string;
}

function formatFull(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function FamilyMessagesPage() {
  const { context, isLoading: contextLoading } = useFamilyContext();

  const [messages,      setMessages]      = useState<Message[]>([]);
  const [todayCarer,    setTodayCarer]    = useState<string | null>(null);
  const [messageText,   setMessageText]   = useState('');
  const [isSending,     setIsSending]     = useState(false);
  const [isLoading,     setIsLoading]     = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadMessages() {
    if (!context) return;
    const supabase = createClient();

    const { data } = await supabase
      .from('family_messages')
      .select('id, sender_type, sender_name, message, created_at')
      .eq('family_member_id', context.familyMemberId)
      .order('created_at', { ascending: true });

    setMessages(
      (data ?? []).map((m) => ({
        id:         m.id,
        senderType: m.sender_type as 'family' | 'staff',
        senderName: m.sender_name,
        message:    m.message,
        createdAt:  m.created_at,
      }))
    );
    setIsLoading(false);
  }

  async function loadTodayCarer() {
    if (!context) return;
    const supabase = createClient();
    const today = new Date().toISOString().split('T')[0];

    const { data } = await supabase
      .from('daily_care_records')
      .select('carer_name, date')
      .eq('patient_id', context.patientId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const record = data[0];
      setTodayCarer(
        record.date === today
          ? record.carer_name
          : `${record.carer_name} (last recorded ${record.date})`
      );
    }
  }

  useEffect(() => {
    if (context) {
      loadMessages();
      loadTodayCarer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);

  // Poll for new messages every 8 seconds
  useEffect(() => {
    if (!context) return;
    const id = setInterval(loadMessages, 8000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = messageText.trim();
    if (!text || !context || isSending) return;

    setIsSending(true);
    setMessageText('');

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsSending(false); return; }

    const { data, error } = await supabase
      .from('family_messages')
      .insert({
        clinic_id:        context.clinicId,
        patient_id:       context.patientId,
        family_member_id: context.familyMemberId,
        sender_type:      'family',
        sender_id:        user.id,
        sender_name:      context.memberName,
        message:          text,
      })
      .select('id, created_at')
      .single();

    if (!error && data) {
      setMessages((prev) => [
        ...prev,
        {
          id:         data.id,
          senderType: 'family',
          senderName: context.memberName,
          message:    text,
          createdAt:  data.created_at,
        },
      ]);
    }
    setIsSending(false);
  }

  if (contextLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn flex flex-col" style={{ height: 'calc(100vh - 8rem)' }}>
      {/* Header */}
      <div className="mb-4 shrink-0">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">Messages</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Send a message to the care team looking after{' '}
          <span className="font-medium text-sky-600 dark:text-sky-400">{context?.residentName}</span>
        </p>
      </div>

      {/* Today's carer banner */}
      {todayCarer && (
        <div className="flex items-center gap-3 px-4 py-3 mb-4 bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800 rounded-xl shrink-0">
          <div className="w-8 h-8 bg-sky-100 dark:bg-sky-900/40 rounded-full flex items-center justify-center shrink-0">
            <UserRound className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-sky-700 dark:text-sky-300 uppercase tracking-wide">Today&apos;s carer</p>
            <p className="text-sm font-semibold text-sky-800 dark:text-sky-200">{todayCarer}</p>
          </div>
        </div>
      )}

      {/* Messages thread */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 space-y-3 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-14 h-14 bg-sky-50 dark:bg-sky-900/20 rounded-full flex items-center justify-center mb-3">
              <Send className="w-6 h-6 text-sky-400" />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start the conversation</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs">
              You can ask questions or share updates with the care team. They&apos;ll reply as soon as they can.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isFamily = msg.senderType === 'family';
            return (
              <div key={msg.id} className={`flex gap-2 ${isFamily ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold text-white ${isFamily ? 'bg-sky-500' : 'bg-emerald-500'}`}>
                  {msg.senderName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className={`max-w-[75%] flex flex-col gap-0.5 ${isFamily ? 'items-end' : 'items-start'}`}>
                  <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isFamily
                      ? 'bg-sky-500 text-white rounded-tr-sm'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white rounded-tl-sm'
                  }`}>
                    {msg.message}
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 px-1">
                    {isFamily ? 'You' : `${msg.senderName} (care team)`} · {formatFull(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Send input */}
      <form onSubmit={handleSend} className="flex gap-2 mt-3 shrink-0">
        <input
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Message the care team…"
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        <button
          type="submit"
          disabled={!messageText.trim() || isSending}
          className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <Send className="w-4 h-4" />
          {isSending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
