import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { getSocket } from "../socket";
import { useAuth } from "../context/AuthContext";

const SERVER = import.meta.env.VITE_SERVER_URL;

export default function ChatWindow({ selectedUser }) {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  // Load DB history + live buffer when conversation changes
  useEffect(() => {
    if (!selectedUser) return;
    setMessages([]);

    const socket = getSocket(user.username);

    // 1. Fetch persisted messages from DB
    axios
      .get(`${SERVER}/api/messages/${selectedUser.username}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setMessages(res.data);

        // 2. Also ask for any in-memory buffered messages not yet in DB
        socket.emit("get_live_history", { with: selectedUser.username });
      })
      .catch(() => {});
  }, [selectedUser?.username]);

  // Listen for real-time messages + live history from buffer
  useEffect(() => {
    if (!selectedUser) return;
    const socket = getSocket(user.username);

    // Live history (buffered messages not yet in DB)
    const onLiveHistory = (buffered) => {
      if (!buffered.length) return;
      setMessages((prev) => {
        const existingKeys = new Set(prev.map((m) => `${m.from}${m.text}${m.createdAt}`));
        const fresh = buffered.filter(
          (m) =>
            (m.from === user.username && m.to === selectedUser.username) ||
            (m.from === selectedUser.username && m.to === user.username)
        ).filter((m) => !existingKeys.has(`${m.from}${m.text}${m.createdAt}`));
        return [...prev, ...fresh];
      });
    };

    // Incoming real-time message
    const onReceive = (msg) => {
      const isRelevant =
        (msg.from === user.username && msg.to === selectedUser.username) ||
        (msg.from === selectedUser.username && msg.to === user.username);

      if (!isRelevant) return;

      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (
          last &&
          last.from === msg.from &&
          last.text === msg.text &&
          last.createdAt === msg.createdAt
        )
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

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    if (!text.trim() || !selectedUser) return;
    const socket = getSocket(user.username);
    socket.emit("send_message", { to: selectedUser.username, text: text.trim() });
    setText("");
  };

  if (!selectedUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="text-5xl mb-4">👈</div>
          <p className="text-gray-400 text-lg">Select a user to start chatting</p>
          <p className="text-gray-600 text-sm mt-2">Messages are saved when you disconnect</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-950 h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800 bg-gray-900 shrink-0">
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-sm uppercase">
            {selectedUser.username[0]}
          </div>
          <span
            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-gray-900
              ${selectedUser.online ? "bg-green-400" : "bg-gray-600"}`}
          />
        </div>
        <div>
          <p className="text-white font-semibold text-sm">{selectedUser.username}</p>
          <p className={`text-xs ${selectedUser.online ? "text-green-400" : "text-gray-500"}`}>
            {selectedUser.online ? "Online" : "Offline"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-gray-600 text-sm mt-8">No messages yet. Say hi! 👋</p>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.from === user.username;
          return (
            <div key={i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm
                  ${isMe
                    ? "bg-purple-600 text-white rounded-br-sm"
                    : "bg-gray-800 text-gray-100 rounded-bl-sm"}`}
              >
                <p className="break-words">{msg.text}</p>
                <p className={`text-xs mt-1 ${isMe ? "text-purple-300" : "text-gray-500"}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-800 bg-gray-900 shrink-0">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={`Message ${selectedUser.username}...`}
            className="flex-1 bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-500 transition"
          />
          <button
            onClick={send}
            disabled={!text.trim()}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
