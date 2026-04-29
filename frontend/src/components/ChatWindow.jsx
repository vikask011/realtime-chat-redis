import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { getSocket } from "../socket";
import { useAuth } from "../context/AuthContext";

const SERVER = import.meta.env.VITE_SERVER_URL;

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts) {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function groupByDate(messages) {
  const groups = [];
  let lastDate = null;
  for (const msg of messages) {
    const label = formatDate(msg.createdAt);
    if (label !== lastDate) {
      groups.push({ type: "date", label });
      lastDate = label;
    }
    groups.push({ type: "msg", msg });
  }
  return groups;
}

export default function ChatWindow({ selectedUser }) {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!selectedUser) return;
    setMessages([]);

    const socket = getSocket(user.username);

    axios
      .get(`${SERVER}/api/messages/${selectedUser.username}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setMessages(res.data);
        socket.emit("get_live_history", { with: selectedUser.username });
      })
      .catch(() => {});
  }, [selectedUser?.username]);

  useEffect(() => {
    if (!selectedUser) return;
    const socket = getSocket(user.username);

    const onLiveHistory = (buffered) => {
      if (!buffered.length) return;
      setMessages((prev) => {
        const existingKeys = new Set(prev.map((m) => `${m.from}${m.text}${m.createdAt}`));
        const fresh = buffered
          .filter(
            (m) =>
              (m.from === user.username && m.to === selectedUser.username) ||
              (m.from === selectedUser.username && m.to === user.username)
          )
          .filter((m) => !existingKeys.has(`${m.from}${m.text}${m.createdAt}`));
        return [...prev, ...fresh];
      });
    };

    const onReceive = (msg) => {
      const isRelevant =
        (msg.from === user.username && msg.to === selectedUser.username) ||
        (msg.from === selectedUser.username && msg.to === user.username);
      if (!isRelevant) return;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.from === msg.from && last.text === msg.text && last.createdAt === msg.createdAt)
          return prev;
        return [...prev, msg];
      });
    };

    socket.on("live_history", onLiveHistory);
    socket.on("receive_message", onReceive);

    return () => {
      socket.off("live_history", onLiveHistory);
      socket.off("receive_message", onReceive);
    };
  }, [selectedUser?.username]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    if (!text.trim() || !selectedUser || sending) return;
    setSending(true);
    const socket = getSocket(user.username);
    socket.emit("send_message", { to: selectedUser.username, text: text.trim() });
    setText("");
    setSending(false);
    inputRef.current?.focus();
  };

  if (!selectedUser) {
    return (
      <div className="chat-empty">
        <div className="chat-empty-inner">
          <div className="chat-empty-icon">
            <svg width="56" height="56" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3>Pick a conversation</h3>
          <p>Select someone from the sidebar to start chatting</p>
        </div>
      </div>
    );
  }

  const grouped = groupByDate(messages);

  return (
    <div className="chat-window">
      {/* Header */}
      <div className="chat-header">
        <div className="avatar avatar-sm">
          {selectedUser.username[0].toUpperCase()}
          <span className={`avatar-dot ${selectedUser.online ? "online" : "offline"}`} />
        </div>
        <div className="chat-header-info">
          <p className="chat-header-name">{selectedUser.username}</p>
          <p className={`chat-header-status ${selectedUser.online ? "status-online" : "status-offline"}`}>
            {selectedUser.online ? (
              <>
                <span className="pulse-dot" />
                Active now
              </>
            ) : (
              "Offline"
            )}
          </p>
        </div>


      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="messages-empty">
            <div className="messages-empty-avatar">{selectedUser.username[0].toUpperCase()}</div>
            <p className="messages-empty-name">{selectedUser.username}</p>
            <p className="messages-empty-sub">No messages yet. Say hello! 👋</p>
          </div>
        )}

        {grouped.map((item, i) => {
          if (item.type === "date") {
            return (
              <div key={`date-${i}`} className="date-divider">
                <span>{item.label}</span>
              </div>
            );
          }

          const msg = item.msg;
          const isMe = msg.from === user.username;

          return (
            <div key={i} className={`msg-row ${isMe ? "msg-row-me" : "msg-row-them"}`}>
              {!isMe && (
                <div className="msg-avatar">{msg.from[0].toUpperCase()}</div>
              )}
              <div className={`msg-bubble ${isMe ? "bubble-me" : "bubble-them"}`}>
                <p className="msg-text">{msg.text}</p>
                <span className="msg-time">{formatTime(msg.createdAt)}</span>
              </div>
              {isMe && (
                <svg className="msg-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="chat-input-bar">
        <button className="input-action-btn" title="Emoji">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M8 13s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" strokeLinecap="round" /><line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </button>
        <button className="input-action-btn" title="Attach file">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>

        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder={`Message ${selectedUser.username}…`}
          className="chat-input"
        />

        <button
          onClick={send}
          disabled={!text.trim() || sending}
          className="send-btn"
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  );
}