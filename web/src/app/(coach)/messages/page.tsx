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

  // Handle array response from Supabase foreign key relationship
  if (booking?.openings) {
    const openings = Array.isArray(booking.openings) ? booking.openings : [booking.openings];
    if (openings.length > 0 && openings[0]?.coach_id) {
      return openings[0].coach_id;
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

  // Mark messages as read when conversation is viewed
  useEffect(() => {
    if (!conversationId || !user) return;

    async function markAsRead() {
      // Mark all unread messages (not sent by current user) as read
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .neq("sender_id", user.id)
        .is("read_at", null);
    }

    markAsRead();
    // Also mark as read periodically while viewing
    const interval = setInterval(markAsRead, 5000);
    return () => clearInterval(interval);
  }, [conversationId, user]);

  // Real-time subscription for messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async () => {
          mutateMessages(); // Refresh messages when new message is inserted
          mutateConversations(); // Also refresh conversations list to update updated_at
          
          // Mark new message as read if it's not from current user
          if (user) {
            await supabase
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("conversation_id", conversationId)
              .neq("sender_id", user.id)
              .is("read_at", null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, mutateMessages, mutateConversations, user]);

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

  // Real-time subscription for conversations list (coach only) - show new conversations immediately
  // MUST be before any early returns to follow React hooks rules
  useEffect(() => {
    if (profile?.role !== "coach" || !user) return;

    const channel = supabase
      .channel("coach-conversations-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `coach_id=eq.${user.id}`,
        },
        () => {
          mutateConversations(); // Refresh conversations list when any change occurs
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.role, user, mutateConversations]);

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
  // Get selected client from conversations array (not clients array from coach_clients)
  const selectedConversation = conversations?.find((c) => c.client_id === selectedClientId);
  const selectedClient = selectedConversation ? {
    id: selectedConversation.client_id,
    full_name: selectedConversation.client.full_name,
    email: selectedConversation.client.email,
  } : null;

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
        // Coach view with conversations selector
        <div className="messages-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24, maxWidth: 1200, width: "100%" }}>
          <div className="messages-split" style={{ display: "grid", gridTemplateColumns: "minmax(240px, 1fr) 2fr", gap: 24 }}>
            {/* Conversations List */}
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
                Conversations
              </div>
              {!conversations || conversations.length === 0 ? (
                <div className="text-center py-8 text-white/60 text-sm">No conversations yet</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {conversations.map((conv) => {
                    const isSelected = selectedClientId === conv.client_id;
                    return (
                      <button
                        key={conv.id}
                        onClick={() => handleSelectClient(conv.client_id)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "12px 16px",
                          borderRadius: "12px",
                          border: isSelected ? "1px solid rgba(255, 255, 255, 0.3)" : "1px solid rgba(255, 255, 255, 0.1)",
                          background: isSelected ? "rgba(255, 255, 255, 0.1)" : "transparent",
                          transition: "all 0.2s",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = "transparent";
                          }
                        }}
                      >
                        <div style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.9)", marginBottom: 4 }}>
                          {conv.client.full_name}
                        </div>
                        <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.5)" }}>{conv.client.email}</div>
                      </button>
                    );
                  })}
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
                  <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} style={{ display: "flex", gap: 12 }}>
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
                      disabled={sending}
                      rows={2}
                      style={{
                        flex: 1,
                        padding: "12px 16px",
                        borderRadius: "12px",
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        color: "rgba(255, 255, 255, 0.9)",
                        fontSize: 14,
                        fontFamily: "inherit",
                        resize: "vertical",
                        minHeight: "60px",
                        maxHeight: "120px",
                      }}
                    />
                    <button
                      type="submit"
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
                  </form>
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
              <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} style={{ display: "flex", gap: 12 }}>
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
                  disabled={sending}
                  rows={2}
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    borderRadius: "12px",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "rgba(255, 255, 255, 0.9)",
                    fontSize: 14,
                    fontFamily: "inherit",
                    resize: "vertical",
                    minHeight: "60px",
                    maxHeight: "120px",
                  }}
                />
                <button
                  type="submit"
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
              </form>
            </>
          )}
        </section>
      )}
    </CoachPageContainer>
  );
}
