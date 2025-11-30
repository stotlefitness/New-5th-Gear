"use client";

import { useState, useEffect } from "react";
import { ClientPageWrapper } from "@/components/ClientPageWrapper";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import useSWR from "swr";

type Message = {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
};

type Conversation = {
  id: string;
  coach_id: string;
  profiles: {
    full_name: string;
  };
};

const supabase = getSupabaseBrowserClient();

async function getCoachId(): Promise<string | null> {
  // Try to get coach from app_settings first (single coach setup)
  const { data: settings } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "single_coach")
    .maybeSingle();

  if (settings?.value?.coach_id) {
    return settings.value.coach_id;
  }

  // Fallback: get coach from any booking or lesson
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: booking } = await supabase
    .from("bookings")
    .select("openings(coach_id)")
    .eq("client_id", user.id)
    .limit(1)
    .maybeSingle();

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
    .eq("client_id", user.id)
    .limit(1)
    .maybeSingle();

  if (lesson?.coach_id) {
    return lesson.coach_id;
  }

  // Last resort: get any coach
  const { data: coachProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "coach")
    .maybeSingle();

  return coachProfile?.id || null;
}

async function fetchConversation(): Promise<Conversation | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("conversations")
    .select("id, coach_id, profiles:coach_id(full_name)")
    .eq("client_id", user.id)
    .maybeSingle();

  if (error && error.code !== "PGRST116") throw error;
  if (!data) return null;

  // Handle array response from Supabase foreign key relationship
  const profiles = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
  
  return {
    id: data.id,
    coach_id: data.coach_id,
    profiles: profiles || { full_name: "Coach Alaina" },
  } as Conversation;
}

async function fetchMessages(conversationId: string | null): Promise<Message[]> {
  if (!conversationId) return [];

  const { data, error } = await supabase
    .from("messages")
    .select("id, content, sender_id, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []) as Message[];
}

export default function ClientMessagesPage() {
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const { data: conversation, mutate: mutateConversation } = useSWR("client-conversation", fetchConversation);
  const { data: messages = [], mutate: mutateMessages } = useSWR(
    conversation?.id ? `conversation-${conversation.id}-messages` : null,
    () => fetchMessages(conversation?.id || null)
  );

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  // Mark messages as read when conversation is viewed
  useEffect(() => {
    const convId = conversation?.id;
    if (!convId) return;

    async function markAsRead() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !convId) return;

      // Mark all unread messages (not sent by current user) as read
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("conversation_id", convId)
        .neq("sender_id", user.id)
        .is("read_at", null);
    }

    markAsRead();
    // Also mark as read periodically while viewing
    const interval = setInterval(markAsRead, 5000);
    return () => clearInterval(interval);
  }, [conversation?.id]);

  // Real-time subscription for messages (bidirectional chat)
  useEffect(() => {
    const convId = conversation?.id;
    if (!convId) return;

    const channel = supabase
      .channel(`messages-${convId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${convId}`,
        },
        async () => {
          mutateMessages(); // Refresh messages when new message is inserted
          
          // Mark new message as read if it's not from current user
          const { data: { user } } = await supabase.auth.getUser();
          if (user && convId) {
            await supabase
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("conversation_id", convId)
              .neq("sender_id", user.id)
              .is("read_at", null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation?.id, mutateMessages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageText.trim() || sending) return;

    try {
      setSending(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let convId = conversation?.id;

      if (!convId) {
        // Get the correct coach ID using the same logic as other parts of the app
        const coachId = await getCoachId();

        if (!coachId) {
          alert("Coach not found. Please contact support.");
          return;
        }

        const { data: newConv, error: convError } = await supabase
          .from("conversations")
          .insert({
            coach_id: coachId,
            client_id: user.id,
          })
          .select()
          .single();

        if (convError) {
          // If conversation already exists (race condition), fetch it
          if (convError.code === "23505") {
            const { data: existingConv } = await supabase
              .from("conversations")
              .select("id")
              .eq("coach_id", coachId)
              .eq("client_id", user.id)
              .maybeSingle();
            if (existingConv) {
              convId = existingConv.id;
            } else {
              throw convError;
            }
          } else {
            throw convError;
          }
        } else {
          convId = newConv.id;
        }
        await mutateConversation();
      }

      const { error: msgError } = await supabase.from("messages").insert({
        conversation_id: convId,
        sender_id: user.id,
        content: messageText.trim(),
      });

      if (msgError) throw msgError;

      // Update conversation updated_at so it appears at top of coach's list
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", convId);

      setMessageText("");
      await mutateMessages();
    } catch (error: any) {
      alert(error.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  function formatTime(date: Date): string {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  const coachName = conversation?.profiles?.full_name || "Coach Alaina";

  return (
    <ClientPageWrapper
      title="Messages"
      subtitle={`Direct chat with ${coachName} about your schedule and progress.`}
    >
      <div style={{ display: "flex", gap: 24, marginTop: 32, maxWidth: 1200 }}>
        <aside style={{ minWidth: 240 }}>
          <div
            style={{
              padding: "20px",
              borderRadius: "16px",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 500, color: "rgba(255, 255, 255, 0.9)", marginBottom: 4 }}>
                {coachName}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Primary coach
              </div>
            </div>
          </div>
        </aside>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 600 }}>
          <div
            style={{
              flex: 1,
              padding: "24px",
              borderRadius: "16px",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              marginBottom: 16,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {messages.length === 0 ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                <p style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.6)", marginBottom: 8 }}>
                  No messages yet.
                </p>
                <p style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.5)" }}>
                  Send a quick hello to get started.
                </p>
              </div>
            ) : (
              messages.map((message) => {
                const isOwn = message.sender_id === currentUserId;
                const msgDate = new Date(message.created_at);

                return (
                  <div
                    key={message.id}
                    style={{
                      display: "flex",
                      justifyContent: isOwn ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "70%",
                        padding: "12px 16px",
                        borderRadius: "12px",
                        background: isOwn ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.08)",
                        border: `1px solid ${isOwn ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.1)"}`,
                      }}
                    >
                      <p style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.9)", marginBottom: 4, wordBreak: "break-word" }}>
                        {message.content}
                      </p>
                      <p style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.4)" }}>
                        {formatTime(msgDate)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={sendMessage} style={{ display: "flex", gap: 12 }}>
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={`Type a message to ${coachName}…`}
              disabled={sending}
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "rgba(255, 255, 255, 0.9)",
                fontSize: 14,
              }}
            />
            <button
              type="submit"
              disabled={!messageText.trim() || sending}
              className="btn-primary"
              style={{ fontSize: 13, padding: "12px 24px", whiteSpace: "nowrap" }}
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </form>
        </div>
      </div>
    </ClientPageWrapper>
  );
}

