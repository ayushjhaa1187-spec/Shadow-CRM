"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Send,
  Loader2,
  MessageSquare,
  Trash2,
  Plus,
  History,
} from "lucide-react";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatEntry {
  id: string;
  title: string;
  updated_at: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [chatList, setChatList] = useState<ChatEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchChatHistory();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchChatHistory = async () => {
    const res = await fetch("/api/chat/history");
    const data = await res.json();
    if (data.success) setChatList(data.data);
  };

  const loadChat = async (id: string) => {
    const res = await fetch(`/api/chat/${id}`);
    const data = await res.json();
    if (data.success) {
      setChatId(id);
      setMessages(data.data.messages.filter((m: Message) => m.role !== "system"));
      setShowHistory(false);
    }
  };

  const handleNewChat = () => {
    setChatId(null);
    setMessages([]);
    setError("");
    setShowHistory(false);
    inputRef.current?.focus();
  };

  const handleDeleteChat = async (id: string) => {
    await fetch(`/api/chat/${id}`, { method: "DELETE" });
    setChatList((prev) => prev.filter((c) => c.id !== id));
    if (chatId === id) handleNewChat();
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    const userMessage = input.trim();
    setInput("");
    setError("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          chat_id: chatId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.data.message },
        ]);
        if (data.data.chat_id) {
          setChatId(data.data.chat_id);
          fetchChatHistory();
        }
      } else {
        setError(data.error || "Failed to get response");
      }
    } catch {
      setError("Failed to connect. Please try again.");
    }

    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">AI Assistant</h1>
          <p className="text-sm text-text-muted mt-1">
            Ask about pipeline strategy, email drafting, lead qualification, and more
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <History size={16} />
            History
          </button>
          <button onClick={handleNewChat} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} />
            New chat
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Chat history sidebar */}
        {showHistory && (
          <div className="w-64 shrink-0 card overflow-y-auto">
            <h3 className="text-sm font-medium text-text-secondary mb-3">Conversations</h3>
            {chatList.length === 0 ? (
              <p className="text-xs text-text-muted">No previous conversations</p>
            ) : (
              <div className="space-y-1">
                {chatList.map((chat) => (
                  <div
                    key={chat.id}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                      chatId === chat.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-surface-hover text-text-secondary"
                    }`}
                  >
                    <button
                      onClick={() => loadChat(chat.id)}
                      className="flex-1 text-left text-sm truncate"
                    >
                      {chat.title}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChat(chat.id);
                      }}
                      className="p-1 hover:bg-danger/10 rounded text-text-muted hover:text-danger shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chat area */}
        <div className="flex-1 flex flex-col card min-h-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <MessageSquare size={24} className="text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-1">
                  Shadow CRM Assistant
                </h3>
                <p className="text-sm text-text-muted max-w-sm">
                  Ask me about pipeline management, email drafting, lead qualification, revenue
                  forecasting, or any CRM best practices.
                </p>
                <div className="flex flex-wrap gap-2 mt-6 max-w-md justify-center">
                  {[
                    "How should I qualify leads?",
                    "Draft a follow-up email",
                    "Pipeline best practices",
                    "Revenue forecasting tips",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setInput(suggestion);
                        inputRef.current?.focus();
                      }}
                      className="px-3 py-1.5 bg-surface-hover rounded-full text-xs text-text-secondary hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-white rounded-br-md"
                        : "bg-surface-hover text-text-primary rounded-bl-md"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))
            )}

            {/* Typing indicator */}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-surface-hover rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce [animation-delay:0ms]" />
                    <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce [animation-delay:150ms]" />
                    <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-center">
                <div className="px-4 py-2 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">
                  {error}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-4">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your pipeline, drafting emails, or CRM strategy..."
                className="input resize-none min-h-[42px] max-h-[120px]"
                rows={1}
                disabled={sending}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="btn-primary px-3 shrink-0"
                aria-label="Send message"
              >
                {sending ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
