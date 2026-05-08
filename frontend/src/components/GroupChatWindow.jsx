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

export default function GroupChatWindow({ selectedGroup, onBack }) {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!selectedGroup) return;
    setMessages([]);

    const socket = getSocket(user.username);

    axios
      .get(`${SERVER}/api/groups/${selectedGroup._id}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setMessages(res.data);
        socket.emit("get_live_group_history", { groupId: selectedGroup._id });
      })
      .catch(() => {});
  }, [selectedGroup?._id]);

  useEffect(() => {
    if (!selectedGroup) return;
    const socket = getSocket(user.username);

    const onLiveHistory = ({ groupId, messages: buffered }) => {
      if (groupId !== selectedGroup._id || !buffered.length) return;
      setMessages((prev) => {
        const existingKeys = new Set(prev.map((m) => `${m.from}${m.text}${m.createdAt}`));
        const fresh = buffered.filter(
          (m) => !existingKeys.has(`${m.from}${m.text}${m.createdAt}`)
        );
        return [...prev, ...fresh];
      });
    };

    const onReceive = (msg) => {
      if (msg.toGroup !== selectedGroup._id) return;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.from === msg.from && last.text === msg.text && last.createdAt === msg.createdAt)
          return prev;
        return [...prev, msg];
      });
    };

    socket.on("live_group_history", onLiveHistory);
    socket.on("receive_group_message", onReceive);

    return () => {
      socket.off("live_group_history", onLiveHistory);
      socket.off("receive_group_message", onReceive);
    };
  }, [selectedGroup?._id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    if (!text.trim() || !selectedGroup || sending) return;
    setSending(true);
    const socket = getSocket(user.username);
    socket.emit("send_group_message", { groupId: selectedGroup._id, text: text.trim() });
    setText("");
    setSending(false);
    inputRef.current?.focus();
  };

  if (!selectedGroup) return null;

  const grouped = groupByDate(messages);

  return (
    <div className="chat-window">
      {/* Header */}
      <div className="chat-header">
        <button className="back-btn" onClick={onBack} title="Back">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="avatar avatar-sm group-avatar">#</div>
        <div className="chat-header-info">
          <p className="chat-header-name">{selectedGroup.name}</p>
          <p className="chat-header-status status-online">
            {selectedGroup.members.length} members
          </p>
        </div>
        <div className="group-members-pill">
          {selectedGroup.members.slice(0, 3).map((m) => (
            <span key={m} className="group-member-chip" title={m}>
              {m[0].toUpperCase()}
            </span>
          ))}
          {selectedGroup.members.length > 3 && (
            <span className="group-member-chip muted">+{selectedGroup.members.length - 3}</span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="messages-empty">
            <div className="messages-empty-avatar">#</div>
            <p className="messages-empty-name">{selectedGroup.name}</p>
            <p className="messages-empty-sub">No messages yet. Start the conversation! 🚀</p>
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
                <div className="msg-avatar" title={msg.from}>{msg.from[0].toUpperCase()}</div>
              )}
              <div className={`msg-bubble ${isMe ? "bubble-me" : "bubble-them"}`}>
                {!isMe && <span className="msg-sender-name">{msg.from}</span>}
                <p className="msg-text">{msg.text}</p>
                <span className="msg-time">{formatTime(msg.createdAt)}</span>
              </div>
              {isMe && (
                <svg className="msg-check msg-check-delivered" width="16" height="10" viewBox="0 0 16 10" fill="none">
                  <path d="M1 5l3.5 3.5L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5 5l3.5 3.5L15 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="chat-input-bar">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder={`Message #${selectedGroup.name}…`}
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
