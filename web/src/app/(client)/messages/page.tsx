"use client";

export default function ClientMessagesPage() {
  return (
    <div className="client-page-inner">
      <div className="client-header">
        <div className="client-header-label">Your training</div>
        <h1 className="client-header-title">Messages</h1>
        <p className="client-header-subtitle">
          Stay in touch with your coach between sessions.
        </p>
      </div>

      <section
        className="client-card"
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
          {/* Conversations list */}
          <div
            style={{
              borderRight: "1px solid rgba(51,65,85,0.8)",
              padding: "18px 18px",
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
              Conversations
            </div>
            <div style={{ fontSize: 13, opacity: 0.75 }}>
              No messages yet
            </div>
          </div>

          {/* Thread area */}
          <div
            style={{
              padding: "18px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              opacity: 0.7,
            }}
          >
            Select a conversation to start messaging.
          </div>
        </div>
      </section>
    </div>
  );
}
