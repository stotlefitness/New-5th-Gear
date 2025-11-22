"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import useSWR from "swr";

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
      <div className="coach-page-inner">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
          <div style={{ width: 48, height: 48, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        </div>
      </div>
    );
  }

  const isCoach = profile?.role === "coach";
  const selectedClient = clients?.find((c) => c.id === selectedClientId);

  return (
    <div className="coach-page-inner">
      <div className="coach-header">
        <div className="coach-header-label">Coach tools</div>
        <h1 className="coach-header-title">Messages</h1>
        <p className="coach-header-subtitle">
          {isCoach ? "Direct athlete communication with saved threads." : "Chat with your coach"}
        </p>
      </div>

      <section
        className="coach-card"
        style={{
          maxWidth: 1040,
          width: "100%",
          padding: 0,
          overflow: "hidden",
          height: 460,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "280px 1fr",
            height: "100%",
          }}
        >
          {isCoach ? (
            <>
              {/* Sidebar: clients */}
              <div
                style={{
                  borderRight: "1px solid rgba(51,65,85,0.8)",
                  padding: "18px 18px",
                  overflowY: "auto",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.24em",
                    textTransform: "uppercase",
                    opacity: 0.7,
                    marginBottom: 8,
                  }}
                >
                  Select client
                </div>
                {!clients || clients.length === 0 ? (
                  <div style={{ fontSize: 13, opacity: 0.7 }}>No clients found</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {clients.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => handleSelectClient(client.id)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "12px",
                          borderRadius: 12,
                          border: selectedClientId === client.id
                            ? "1px solid rgba(255,255,255,0.3)"
                            : "1px solid rgba(148,163,184,0.2)",
                          background: selectedClientId === client.id
                            ? "rgba(255,255,255,0.1)"
                            : "transparent",
                          color: "#fff",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (selectedClientId !== client.id) {
                            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedClientId !== client.id) {
                            e.currentTarget.style.background = "transparent";
                          }
                        }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 300 }}>{client.full_name}</div>
                        <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>{client.email}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Thread area */}
              <div
                style={{
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                }}
              >
                {!selectedClient ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 14, opacity: 0.7 }}>
                    Select a client to start messaging
                  </div>
                ) : (
                  <>
                    <div style={{ borderBottom: "1px solid rgba(51,65,85,0.8)", paddingBottom: 12, marginBottom: 12 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 400, marginBottom: 4 }}>{selectedClient.full_name}</h3>
                      <div style={{ fontSize: 11, opacity: 0.6 }}>{selectedClient.email}</div>
                    </div>

                    {/* Messages */}
                    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
                      {!messages || messages.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "24px 0", color: "rgba(203,213,225,0.6)", fontSize: 13 }}>
                          No messages yet. Start the conversation!
                        </div>
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
                                  borderRadius: 16,
                                  padding: "8px 12px",
                                  background: isOwn ? "#ffffff" : "rgba(255,255,255,0.1)",
                                  color: isOwn ? "#020617" : "#fff",
                                }}
                              >
                                <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{msg.content}</div>
                                <div style={{ fontSize: 10, marginTop: 4, opacity: 0.6 }}>
                                  {new Date(msg.created_at).toLocaleTimeString("en-US", {
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Message Input */}
                    <div style={{ display: "flex", gap: 8 }}>
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
                        style={{
                          flex: 1,
                          background: "rgba(15,23,42,0.6)",
                          border: "1px solid rgba(148,163,184,0.3)",
                          borderRadius: 12,
                          padding: "10px 14px",
                          color: "#fff",
                          fontSize: 13,
                          resize: "none",
                        }}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!messageContent.trim() || sending}
                        className="coach-btn"
                        style={{ opacity: (!messageContent.trim() || sending) ? 0.6 : 1, cursor: (!messageContent.trim() || sending) ? "not-allowed" : "pointer" }}
                      >
                        Send
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Client view - simplified single column */}
              <div
                style={{
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                  gridColumn: "1 / -1",
                }}
              >
                {!coach ? (
                  <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(203,213,225,0.6)" }}>
                    Unable to find your coach. Please contact support.
                  </div>
                ) : (
                  <>
                    <div style={{ borderBottom: "1px solid rgba(51,65,85,0.8)", paddingBottom: 12, marginBottom: 12 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 400, marginBottom: 4 }}>{coach.full_name}</h3>
                      <div style={{ fontSize: 11, opacity: 0.6 }}>Your Coach</div>
                    </div>

                    {/* Messages */}
                    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
                      {!messages || messages.length === 0 ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", color: "rgba(203,213,225,0.6)", fontSize: 13 }}>
                          No messages yet. Start the conversation!
                        </div>
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
                                  borderRadius: 16,
                                  padding: "8px 12px",
                                  background: isOwn ? "#ffffff" : "rgba(255,255,255,0.1)",
                                  color: isOwn ? "#020617" : "#fff",
                                }}
                              >
                                <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{msg.content}</div>
                                <div style={{ fontSize: 10, marginTop: 4, opacity: 0.6 }}>
                                  {new Date(msg.created_at).toLocaleTimeString("en-US", {
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Message Input */}
                    <div style={{ display: "flex", gap: 8 }}>
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
                        style={{
                          flex: 1,
                          background: "rgba(15,23,42,0.6)",
                          border: "1px solid rgba(148,163,184,0.3)",
                          borderRadius: 12,
                          padding: "10px 14px",
                          color: "#fff",
                          fontSize: 13,
                          resize: "none",
                        }}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!messageContent.trim() || sending}
                        className="coach-btn"
                        style={{ opacity: (!messageContent.trim() || sending) ? 0.6 : 1, cursor: (!messageContent.trim() || sending) ? "not-allowed" : "pointer" }}
                      >
                        Send
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
