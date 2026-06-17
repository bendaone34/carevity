'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, ArrowLeft, Send, User } from 'lucide-react';
import Header from '@/components/layout/Header';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { createClient } from '@/lib/supabase/client';
import { useStore } from '@/lib/store';

interface Thread {
  familyMemberId: string;
  familyMemberName: string;
  relationship: string;
  patientId: string;
  residentName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastSenderType: 'family' | 'staff' | null;
  unreadCount: number;
}

interface Message {
  id: string;
  senderType: 'family' | 'staff';
  senderName: string;
  message: string;
  createdAt: string;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString('en-GB', { weekday: 'short' });
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatFull(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function MessagesPage() {
  const clinicId = useStore((s) => s.clinicId);

  const [threads, setThreads]               = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [messages, setMessages]             = useState<Message[]>([]);
  const [replyText, setReplyText]           = useState('');
  const [isSending, setIsSending]           = useState(false);
  const [isLoading, setIsLoading]           = useState(true);
  const [isLoadingMsgs, setIsLoadingMsgs]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadThreads() {
    const supabase = createClient();

    const [{ data: members }, { data: msgs }] = await Promise.all([
      supabase
        .from('family_members')
        .select('id, name, relationship, patient_id, patients(first_name, last_name)')
        .eq('status', 'active')
        .order('created_at', { ascending: false }),
      supabase
        .from('family_messages')
        .select('family_member_id, sender_type, message, created_at, read_at')
        .order('created_at', { ascending: false }),
    ]);

    if (!members) { setIsLoading(false); return; }

    const built: Thread[] = members.map((member) => {
      const patientRaw = member.patients as unknown;
      const patient = (Array.isArray(patientRaw) ? patientRaw[0] : patientRaw) as { first_name: string; last_name: string } | null;
      const threadMsgs = (msgs ?? []).filter((m) => m.family_member_id === member.id);
      const last = threadMsgs[0] ?? null;
      const unread = threadMsgs.filter((m) => m.sender_type === 'family' && !m.read_at).length;
      return {
        familyMemberId:  member.id,
        familyMemberName: member.name,
        relationship:    member.relationship,
        patientId:       member.patient_id,
        residentName:    patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown',
        lastMessage:     last?.message    ?? null,
        lastMessageAt:   last?.created_at ?? null,
        lastSenderType:  last?.sender_type ?? null,
        unreadCount:     unread,
      };
    });

    // Sort: threads with messages first, by recency
    built.sort((a, b) => {
      if (!a.lastMessageAt && !b.lastMessageAt) return 0;
      if (!a.lastMessageAt) return 1;
      if (!b.lastMessageAt) return -1;
      return b.lastMessageAt.localeCompare(a.lastMessageAt);
    });

    setThreads(built);
    setIsLoading(false);
  }

  useEffect(() => { loadThreads(); }, []);

  async function openThread(thread: Thread) {
    setSelectedThread(thread);
    setIsLoadingMsgs(true);
    setMessages([]);

    const supabase = createClient();
    const { data } = await supabase
      .from('family_messages')
      .select('id, sender_type, sender_name, message, created_at')
      .eq('family_member_id', thread.familyMemberId)
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
    setIsLoadingMsgs(false);

    // Mark incoming family messages as read
    await supabase
      .from('family_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('family_member_id', thread.familyMemberId)
      .eq('sender_type', 'family')
      .is('read_at', null);

    setThreads((prev) =>
      prev.map((t) =>
        t.familyMemberId === thread.familyMemberId ? { ...t, unreadCount: 0 } : t
      )
    );
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    const text = replyText.trim();
    if (!text || !selectedThread || isSending) return;

    setIsSending(true);
    setReplyText('');

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsSending(false); return; }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const senderName = profile?.full_name || user.email || 'Staff';

    const { data, error } = await supabase
      .from('family_messages')
      .insert({
        clinic_id:        clinicId,
        patient_id:       selectedThread.patientId,
        family_member_id: selectedThread.familyMemberId,
        sender_type:      'staff',
        sender_id:        user.id,
        sender_name:      senderName,
        message:          text,
      })
      .select('id, created_at')
      .single();

    if (!error && data) {
      const newMsg: Message = {
        id:         data.id,
        senderType: 'staff',
        senderName,
        message:    text,
        createdAt:  data.created_at,
      };
      setMessages((prev) => [...prev, newMsg]);
      setThreads((prev) =>
        prev.map((t) =>
          t.familyMemberId === selectedThread.familyMemberId
            ? { ...t, lastMessage: text, lastMessageAt: data.created_at, lastSenderType: 'staff' }
            : t
        )
      );
      setSelectedThread((prev) =>
        prev ? { ...prev, lastMessage: text, lastMessageAt: data.created_at, lastSenderType: 'staff' } : prev
      );
    }

    setIsSending(false);
  }

  // ── Thread List view ──────────────────────────────────────────────────────────
  if (!selectedThread) {
    return (
      <div className="animate-fadeIn">
        <Breadcrumbs items={[{ label: 'Messages' }]} />
        <Header title="Family Messages" subtitle="Messages from family members about their relatives" />

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-5 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-36 bg-gray-200 dark:bg-slate-700 rounded" />
                    <div className="h-3 w-56 bg-gray-100 dark:bg-slate-700/50 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-sky-50 dark:bg-sky-900/20 rounded-2xl flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-sky-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">No family members yet</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs">
              Once you invite family members via the resident profile, their messages will appear here.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700 overflow-hidden">
            {threads.map((thread) => (
              <button
                key={thread.familyMemberId}
                onClick={() => openThread(thread)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-white font-semibold text-sm">
                    {thread.familyMemberName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-semibold truncate ${thread.unreadCount > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200'}`}>
                      {thread.familyMemberName}
                      <span className="font-normal text-gray-400 dark:text-gray-500 ml-1.5">({thread.relationship})</span>
                    </p>
                    <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                      {thread.lastMessageAt ? formatTime(thread.lastMessageAt) : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      <span className="text-sky-600 dark:text-sky-400 font-medium">{thread.residentName}</span>
                      {thread.lastMessage && (
                        <>
                          {' · '}
                          {thread.lastSenderType === 'staff' ? 'You: ' : ''}
                          {thread.lastMessage}
                        </>
                      )}
                      {!thread.lastMessage && ' · No messages yet'}
                    </p>
                    {thread.unreadCount > 0 && (
                      <span className="shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-sky-500 text-white text-[10px] font-bold">
                        {thread.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Thread view ───────────────────────────────────────────────────────────────
  return (
    <div className="animate-fadeIn flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <button
          onClick={() => setSelectedThread(null)}
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center shrink-0">
          <span className="text-white font-semibold text-sm">
            {selectedThread.familyMemberName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white text-sm leading-none">
            {selectedThread.familyMemberName}
            <span className="font-normal text-gray-400 ml-1.5">({selectedThread.relationship})</span>
          </p>
          <p className="text-xs text-sky-600 dark:text-sky-400 mt-0.5">{selectedThread.residentName}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 space-y-3 min-h-0">
        {isLoadingMsgs ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-400 dark:text-gray-500">No messages yet. Reply below to start the conversation.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isStaff = msg.senderType === 'staff';
            return (
              <div key={msg.id} className={`flex gap-2 ${isStaff ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold text-white ${isStaff ? 'bg-sky-500' : 'bg-emerald-500'}`}>
                  {msg.senderName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className={`max-w-[72%] ${isStaff ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                  <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isStaff
                      ? 'bg-sky-500 text-white rounded-tr-sm'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white rounded-tl-sm'
                  }`}>
                    {msg.message}
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 px-1">
                    {isStaff ? 'You' : msg.senderName} · {formatFull(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      <form onSubmit={handleReply} className="flex gap-2 mt-3 shrink-0">
        <input
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Reply to family member…"
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        <button
          type="submit"
          disabled={!replyText.trim() || isSending}
          className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <Send className="w-4 h-4" />
          {isSending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
