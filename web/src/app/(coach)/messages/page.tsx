"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import useSWR from "swr";
import CoachPageContainer from "@/components/CoachPageContainer";

const supabase = getSupabaseBrowserClient();

type Client = {
  id: string;
  full_name: string;
  email: string;
};

type Coach = {
  id: string;
  full_name: string;
  email: string;
};

type Conversation = {
  id: string;
  client_id: string;
  client: Client;
  updated_at: string;
};

type Message = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

async function fetchClients() {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user) throw new Error("Not authenticated");
  
  const { data, error } = await supabase
    .from("coach_clients")
    .select("client_id, profiles:client_id(id, full_name, email)")
    .eq("coach_id", session.session.user.id);
  
  if (error) throw error;
  return (data || []).map((item: any) => ({
    id: item.client_id,
    full_name: item.profiles.full_name,
    email: item.profiles.email,
  })) as Client[];
}

async function fetchConversations() {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user) throw new Error("Not authenticated");
  
  const { data, error } = await supabase
    .from("conversations")
    .select("id, client_id, updated_at, profiles:client_id(id, full_name, email)")
    .eq("coach_id", session.session.user.id)
    .order("updated_at", { ascending: false });
  
  if (error) throw error;
  return (data || []).map((conv: any) => ({
    id: conv.id,
    client_id: conv.client_id,
    client: {
      id: conv.profiles.id,
      full_name: conv.profiles.full_name,
      email: conv.profiles.email,
    },
    updated_at: conv.updated_at,
  })) as Conversation[];
}

async function getCoachId(): Promise<string | null> {
  // Try to get coach from app_settings
  const { data: settings } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "single_coach")
    .single();
  
  if (settings?.value?.coach_id) {
    return settings.value.coach_id;
  }
  
  // Fallback: get coach from any booking or lesson
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user) return null;
  
  const { data: booking } = await supabase
    .from("bookings")
    .select("openings(coach_id)")
    .eq("client_id", session.session.user.id)
    .limit(1)
    .single();
  
  if (booking?.openings) {
    const openings = booking.openings as any;
    if (Array.isArray(openings) && openings.length > 0 && openings[0]?.coach_id) {
      return openings[0].coach_id;
    } else if (!Array.isArray(openings) && openings?.coach_id) {
      return openings.coach_id;
    }
  }
  
  const { data: lesson } = await supabase
    .from("lessons")
    .select("coach_id")
    .eq("client_id", session.session.user.id)
    .limit(1)
    .single();
  
  return lesson?.coach_id || null;
}

async function getCoach(coachId: string): Promise<Coach | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", coachId)
    .single();
  
  if (error) throw error;
  return data as Coach;
}

async function fetchMessages(conversationId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("id, sender_id, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  
  if (error) throw error;
  return data as Message[];
}

async function getOrCreateConversation(clientId: string, coachId: string) {
  // Try to find existing conversation
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("coach_id", coachId)
    .eq("client_id", clientId)
    .single();
  
  if (existing) return existing.id;
  
  // Create new conversation
  const { data, error } = await supabase
    .from("conversations")
    .insert({ coach_id: coachId, client_id: clientId })
    .select("id")
    .single();
  
  if (error) throw error;
  return data.id;
}

export default function MessagesPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Coach state
  const { data: clients } = useSWR(profile?.role === "coach" ? "coach_clients" : null, fetchClients);
  const { data: conversations, mutate: mutateConversations } = useSWR(profile?.role === "coach" ? "coach_conversations" : null, fetchConversations);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  
  // Client state
  const [coachId, setCoachId] = useState<string | null>(null);
  const [coach, setCoach] = useState<Coach | null>(null);
  
  // Shared state
  const [conversationId, setConversationId] = useState<string | null>(null);
  const { data: messages, mutate: mutateMessages } = useSWR(
    conversationId ? ["messages", conversationId] : null,
    () => conversationId ? fetchMessages(conversationId) : null
  );
  const [messageContent, setMessageContent] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function initialize() {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        setLoading(false);
        return;
      }
      
      setUser(session.session.user);
      
      // Get profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.session.user.id)
        .single();
      
      setProfile(profileData);
      
      // If client, get coach and setup conversation
      if (profileData?.role === "client") {
        const cId = await getCoachId();
        if (cId) {
          setCoachId(cId);
          const coachData = await getCoach(cId);
          setCoach(coachData);
          const convId = await getOrCreateConversation(session.session.user.id, cId);
          setConversationId(convId);
        }
      }
      
      setLoading(false);
    }
    
    initialize();
  }, []);

  async function handleSelectClient(clientId: string) {
    if (!user) return;
    const convId = await getOrCreateConversation(clientId, user.id);
    setSelectedClientId(clientId);
    setConversationId(convId);
    mutateConversations();
  }

  async function sendMessage() {
    if (!conversationId || !messageContent.trim() || !user) return;
    
    setSending(true);
    const { error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: messageContent.trim(),
      });
    
    if (error) {
      alert(error.message);
    } else {
      setMessageContent("");
      mutateMessages();
      mutateConversations();
      
      // Update conversation updated_at
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);
    }
    setSending(false);
  }

  if (loading) {
    return (
      <CoachPageContainer>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      </CoachPageContainer>
    );
  }

  const isCoach = profile?.role === "coach";
  const selectedClient = clients?.find((c) => c.id === selectedClientId);

  return (
    <CoachPageContainer>
      <header className="text-center space-y-6">
        <p className="text-xs uppercase tracking-[0.4em] text-white/40">Coach tools</p>
        <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-white">Messages</h1>
        <p className="text-sm sm:text-base text-white/60">
          {isCoach ? "Direct athlete communication with saved threads." : "Chat with your coach"}
        </p>
      </header>

      <div className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-2xl p-8 lg:p-12">
        {isCoach ? (
          // Coach view with client selector
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
            {/* Client List */}
            <div className="lg:col-span-1 border-r border-white/10 pr-6 overflow-y-auto">
              <h2 className="text-sm uppercase tracking-[0.3em] text-white/50 mb-4">Select Client</h2>
              {!clients || clients.length === 0 ? (
                <p className="text-sm text-white/40">No clients found</p>
              ) : (
                <div className="space-y-2">
                  {clients.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => handleSelectClient(client.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        selectedClientId === client.id
                          ? "border-white/30 bg-white/10"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <p className="text-white font-light">{client.full_name}</p>
                      <p className="text-xs text-white/50 mt-1">{client.email}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Chat Area */}
            <div className="lg:col-span-2 flex flex-col">
              {!selectedClient ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-white/40 text-sm">Select a client to start messaging</p>
                </div>
              ) : (
                <>
                  <div className="border-b border-white/10 pb-4 mb-4">
                    <h3 className="text-lg font-light text-white">{selectedClient.full_name}</h3>
                    <p className="text-xs text-white/50">{selectedClient.email}</p>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                    {!messages || messages.length === 0 ? (
                      <p className="text-center text-white/40 text-sm py-8">No messages yet. Start the conversation!</p>
                    ) : (
                      messages.map((msg) => {
                        const isOwn = msg.sender_id === user?.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                                isOwn
                                  ? "bg-white text-black"
                                  : "bg-white/10 text-white"
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              <p className="text-xs mt-1 opacity-60">
                                {new Date(msg.created_at).toLocaleTimeString("en-US", {
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Message Input */}
                  <div className="flex gap-3">
                    <textarea
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder="Type a message..."
                      rows={2}
                      className="flex-1 bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:bg-white/10 focus:border-white/30 focus:outline-none rounded-xl resize-none"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!messageContent.trim() || sending}
                      className="px-6 py-3 rounded-xl bg-white text-black text-sm uppercase tracking-[0.3em] hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Send
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          // Client view - auto-opened with coach
          <>
            {!coach ? (
              <div className="text-center py-12">
                <p className="text-white/60">Unable to find your coach. Please contact support.</p>
              </div>
            ) : (
              <div className="flex flex-col h-[600px]">
                <div className="border-b border-white/10 pb-4 mb-4">
                  <h3 className="text-lg font-light text-white">{coach.full_name}</h3>
                  <p className="text-xs text-white/50">Your Coach</p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                  {!messages || messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-center text-white/40 text-sm">No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isOwn = msg.sender_id === user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                              isOwn
                                ? "bg-white text-black"
                                : "bg-white/10 text-white"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            <p className="text-xs mt-1 opacity-60">
                              {new Date(msg.created_at).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Message Input */}
                <div className="flex gap-3">
                  <textarea
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Type a message..."
                    rows={2}
                    className="flex-1 bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:bg-white/10 focus:border-white/30 focus:outline-none rounded-xl resize-none"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!messageContent.trim() || sending}
                    className="px-6 py-3 rounded-xl bg-white text-black text-sm uppercase tracking-[0.3em] hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </CoachPageContainer>
  );
}
