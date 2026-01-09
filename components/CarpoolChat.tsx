"use client";

import { useEffect, useState, useRef } from "react";
import type { CarpoolMessage } from "@/types/carpool";

interface CarpoolChatProps {
  carpoolId: string;
  userId: string;
}

export default function CarpoolChat({ carpoolId, userId }: CarpoolChatProps) {
  const [messages, setMessages] = useState<CarpoolMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);
  const shouldAutoScroll = useRef(true); // Track if we should auto-scroll
  const userJustSentMessage = useRef(false); // Track if user just sent a message

  // Check if user is near the bottom of the scroll container
  const isNearBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    const threshold = 100; // pixels from bottom
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  };

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch messages
  async function fetchMessages() {
    try {
      const res = await fetch(`/api/carpools/${carpoolId}/messages`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMessages(); // Initial load
    // Poll for new messages every 5 seconds (MVP)
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [carpoolId]);

  // Auto-scroll logic: scroll on initial load, when user sends message, or if user is near bottom
  /**
  useEffect(() => {
    if (loading) return; // Don't scroll while loading
    
    // Always scroll on initial load or when user sends a message
    if (isInitialLoad.current || userJustSentMessage.current) {
      setTimeout(() => {
        scrollToBottom();
        isInitialLoad.current = false;
        userJustSentMessage.current = false;
      }, 0);
    } else if (isNearBottom()) {
      // Only auto-scroll if user is near bottom (for polling updates)
      setTimeout(() => scrollToBottom(), 0);
    }
  }, [messages, loading]);

  // Track scroll position to detect if user scrolled up
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Update shouldAutoScroll based on whether user is near bottom
      shouldAutoScroll.current = isNearBottom();
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);
  */

  // Send message
  async function handleSend() {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    setError("");

    try {
      const res = await fetch(`/api/carpools/${carpoolId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          content: newMessage.trim()
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Failed to send message");
      }

      const data = await res.json();
      setMessages([...messages, data.message]);
      setNewMessage("");
      
      // Mark that user just sent a message so we auto-scroll
      userJustSentMessage.current = true;
      
      // Refresh messages to get latest
      await fetchMessages();
    } catch (e: any) {
      setError(e?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit"
    });
  };

  return (
    <div className="flex flex-col h-full border rounded-xl bg-white">
      {/* Messages area */}
      <div 
        ref={messagesContainerRef} // scrollable chat area that holds all messages. The ref lets us check the scroll position to decide when to auto-scroll.
        className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[500px]"
      >
        {loading && messages.length === 0 ? (
          <div className="text-center text-neutral-600 py-8">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-neutral-600 py-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.userId === userId;
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-3 py-2 ${
                    isOwn
                      ? "bg-blue-500 text-white"
                      : "bg-neutral-100 text-neutral-900"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                  <p
                    className={`text-xs mt-1 ${
                      isOwn ? "text-blue-100" : "text-neutral-500"
                    }`}
                  >
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Input area */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message..."
            className="flex-1 rounded-xl border p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={sending}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="rounded-xl px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

