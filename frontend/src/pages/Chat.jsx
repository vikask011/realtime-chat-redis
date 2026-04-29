import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import { getSocket } from "../socket";
import { useAuth } from "../context/AuthContext";

const SERVER = import.meta.env.VITE_SERVER_URL;

export default function Chat() {
  const { user, token } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  // unreadCounts: { [username]: count }
  const [unreadCounts, setUnreadCounts] = useState({});

  const fetchUsers = useCallback(() => {
    axios
      .get(`${SERVER}/api/users/all`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setUsers(res.data))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    fetchUsers();
    const socket = getSocket(user.username);

    socket.on("user_status", ({ username, online }) => {
      setUsers((prev) =>
        prev.map((u) => (u.username === username ? { ...u, online } : u))
      );
      setSelectedUser((prev) =>
        prev?.username === username ? { ...prev, online } : prev
      );
    });

    // Track incoming messages for unread count
    socket.on("receive_message", (msg) => {
      setSelectedUser((currentSelected) => {
        // If message is from the currently selected user, don't count as unread
        if (currentSelected?.username === msg.from) return currentSelected;
        // Otherwise increment unread
        setUnreadCounts((prev) => ({
          ...prev,
          [msg.from]: (prev[msg.from] || 0) + 1,
        }));
        return currentSelected;
      });
    });

    const interval = setInterval(fetchUsers, 15000);

    return () => {
      socket.off("user_status");
      socket.off("receive_message");
      clearInterval(interval);
    };
  }, []);

  const handleSelectUser = (u) => {
    setSelectedUser(u);
    // Clear unread count when opening conversation
    setUnreadCounts((prev) => ({ ...prev, [u.username]: 0 }));
  };

  return (
    <div className="chat-root">
      <Sidebar
        users={users}
        selectedUser={selectedUser}
        onSelect={handleSelectUser}
        unreadCounts={unreadCounts}
      />
      <ChatWindow selectedUser={selectedUser} />
    </div>
  );
}