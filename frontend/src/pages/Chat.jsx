import { useEffect, useState } from "react";
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

  const fetchUsers = () => {
    axios
      .get(`${SERVER}/api/users/all`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setUsers(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchUsers();

    const socket = getSocket(user.username);

    // Update online status live
    socket.on("user_status", ({ username, online }) => {
      setUsers((prev) =>
        prev.map((u) => (u.username === username ? { ...u, online } : u))
      );
      setSelectedUser((prev) =>
        prev?.username === username ? { ...prev, online } : prev
      );
    });

    // Refresh user list every 15s to pick up new registrations
    const interval = setInterval(fetchUsers, 15000);

    return () => {
      socket.off("user_status");
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex h-full bg-gray-950">
      <Sidebar
        users={users}
        selectedUser={selectedUser}
        onSelect={setSelectedUser}
      />
      <ChatWindow selectedUser={selectedUser} />
    </div>
  );
}
