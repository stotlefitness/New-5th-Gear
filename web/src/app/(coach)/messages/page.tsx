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

  if (booking?.openings?.coach_id) {
    return booking.openings.coach_id;
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
  const { data: conversations, mutate: mutateConversations } = useSWR(
    profile?.role === "coach" ? "coach_conversations" : null,
    fetchConversations
  );
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Client state
  const [coachId, setCoachId] = useState<string | null>(null);
  const [coach, setCoach] = useState<Coach | null>(null);

  // Shared state
  const [conversationId, setConversationId] = useState<string | null>(null);
  const { data: messages, mutate: mutateMessages } = useSWR(
    conversationId ? ["messages", conversationId] : null,
    () => (conversationId ? fetchMessages(conversationId) : null)
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
    const { error } = await supabase.from("messages").insert({
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
        <div className="text-center space-y-4 py-32">
          <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-sm text-white/60">Loading messages…</p>
        </div>
      </CoachPageContainer>
    );
  }

  const isCoach = profile?.role === "coach";
  const selectedClient = clients?.find((c) => c.id === selectedClientId);

  return (
    <CoachPageContainer>
      <header className="text-center space-y-6 mb-8">
        <p className="text-xs uppercase tracking-[0.4em] text-white/40">Communication</p>
        <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-white">Messages</h1>
        <p className="text-sm sm:text-base text-white/60">
          {isCoach ? "Direct client communication with saved threads." : "Chat with your coach"}
        </p>
      </header>

      {isCoach ? (
        // Coach view with client selector
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24, maxWidth: 1200, width: "100%" }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 1fr) 2fr", gap: 24 }}>
            {/* Client List */}
            <section className="auth-panel" style={{ maxHeight: "600px", overflowY: "auto" }}>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                  color: "rgba(255, 255, 255, 0.5)",
                  marginBottom: 16,
                }}
              >
                Clients
              </div>
              {!clients || clients.length === 0 ? (
                <div className="text-center py-8 text-white/60 text-sm">No clients found</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {clients.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => handleSelectClient(client.id)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "12px 16px",
                        borderRadius: "12px",
                        border: selectedClientId === client.id ? "1px solid rgba(255, 255, 255, 0.3)" : "1px solid rgba(255, 255, 255, 0.1)",
                        background: selectedClientId === client.id ? "rgba(255, 255, 255, 0.1)" : "transparent",
                        transition: "all 0.2s",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        if (selectedClientId !== client.id) {
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedClientId !== client.id) {
                          e.currentTarget.style.background = "transparent";
                        }
                      }}
                    >
                      <div style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.9)", marginBottom: 4 }}>
                        {client.full_name}
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.5)" }}>{client.email}</div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Chat Area */}
            <section className="auth-panel" style={{ display: "flex", flexDirection: "column", maxHeight: "600px" }}>
              {!selectedClient ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <p className="text-sm text-white/60">Select a client to start messaging</p>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      paddingBottom: 16,
                      marginBottom: 16,
                      borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
                    }}
                  >
                    <div style={{ fontSize: 15, color: "rgba(255, 255, 255, 0.9)", marginBottom: 4 }}>
                      {selectedClient.full_name}
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.5)" }}>{selectedClient.email}</div>
                  </div>

                  {/* Messages */}
                  <div
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      marginBottom: 16,
                      paddingRight: 8,
                    }}
                  >
                    {!messages || messages.length === 0 ? (
                      <div className="text-center py-8 text-white/60 text-sm">No messages yet. Start the conversation!</div>
                    ) : (
                      messages.map((msg) => {
                        const isOwn = msg.sender_id === user?.id;
                        return (
                          <div
                            key={msg.id}
                            style={{
                              display: "flex",
                              justifyContent: isOwn ? "flex-end" : "flex-start",
                            }}
                          >
                            <div
                              style={{
                                maxWidth: "70%",
                                padding: "10px 14px",
                                borderRadius: "12px",
                                background: isOwn ? "rgba(255, 255, 255, 0.95)" : "rgba(255, 255, 255, 0.1)",
                                color: isOwn ? "rgba(0, 0, 0, 0.9)" : "rgba(255, 255, 255, 0.9)",
                              }}
                            >
                              <p style={{ fontSize: 14, whiteSpace: "pre-wrap", lineHeight: 1.5, marginBottom: 4 }}>
                                {msg.content}
                              </p>
                              <p style={{ fontSize: 11, color: isOwn ? "rgba(0, 0, 0, 0.5)" : "rgba(255, 255, 255, 0.5)" }}>
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
                  <div style={{ display: "flex", gap: 12 }}>
                    <textarea
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder="Type a message…"
                      rows={2}
                      className="field-input"
                      style={{
                        flex: 1,
                        minHeight: "60px",
                        resize: "vertical",
                        paddingTop: "8px",
                        paddingBottom: "8px",
                      }}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!messageContent.trim() || sending}
                      className="btn-primary"
                      style={{
                        padding: "12px 24px",
                        alignSelf: "flex-end",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {sending ? "Sending…" : "Send"}
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      ) : (
        // Client view - auto-opened with coach
        <section className="auth-panel" style={{ maxWidth: 860, width: "100%", display: "flex", flexDirection: "column", maxHeight: "600px" }}>
          {!coach ? (
            <div className="text-center py-12">
              <p className="text-sm text-white/60">Unable to find your coach. Please contact support.</p>
            </div>
          ) : (
            <>
              <div
                style={{
                  paddingBottom: 16,
                  marginBottom: 16,
                  borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
                }}
              >
                <div style={{ fontSize: 15, color: "rgba(255, 255, 255, 0.9)", marginBottom: 4 }}>{coach.full_name}</div>
                <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.5)" }}>Your Coach</div>
              </div>

              {/* Messages */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  marginBottom: 16,
                  paddingRight: 8,
                }}
              >
                {!messages || messages.length === 0 ? (
                  <div className="text-center py-8 text-white/60 text-sm">No messages yet. Start the conversation!</div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.sender_id === user?.id;
                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: "flex",
                          justifyContent: isOwn ? "flex-end" : "flex-start",
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "70%",
                            padding: "10px 14px",
                            borderRadius: "12px",
                            background: isOwn ? "rgba(255, 255, 255, 0.95)" : "rgba(255, 255, 255, 0.1)",
                            color: isOwn ? "rgba(0, 0, 0, 0.9)" : "rgba(255, 255, 255, 0.9)",
                          }}
                        >
                          <p style={{ fontSize: 14, whiteSpace: "pre-wrap", lineHeight: 1.5, marginBottom: 4 }}>
                            {msg.content}
                          </p>
                          <p style={{ fontSize: 11, color: isOwn ? "rgba(0, 0, 0, 0.5)" : "rgba(255, 255, 255, 0.5)" }}>
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
              <div style={{ display: "flex", gap: 12 }}>
                <textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Type a message…"
                  rows={2}
                  className="field-input"
                  style={{
                    flex: 1,
                    minHeight: "60px",
                    resize: "vertical",
                    paddingTop: "8px",
                    paddingBottom: "8px",
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!messageContent.trim() || sending}
                  className="btn-primary"
                  style={{
                    padding: "12px 24px",
                    alignSelf: "flex-end",
                    whiteSpace: "nowrap",
                  }}
                >
                  {sending ? "Sending…" : "Send"}
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </CoachPageContainer>
  );
}
