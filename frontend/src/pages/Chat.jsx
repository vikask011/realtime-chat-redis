import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import GroupChatWindow from "../components/GroupChatWindow";
import { getSocket } from "../socket";
import { useAuth } from "../context/AuthContext";

const SERVER = import.meta.env.VITE_SERVER_URL;

export default function Chat() {
  const { user, token } = useAuth();
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [groupUnreadCounts, setGroupUnreadCounts] = useState({});
  // mobile: "sidebar" | "chat"
  const [mobileView, setMobileView] = useState("sidebar");

  const fetchUsers = useCallback(() => {
    axios
      .get(`${SERVER}/api/users/all`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setUsers(res.data))
      .catch(() => {});
  }, [token]);

  const fetchGroups = useCallback(() => {
    axios
      .get(`${SERVER}/api/groups`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setGroups(res.data))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    fetchUsers();
    fetchGroups();
    const socket = getSocket(user.username);

    socket.on("user_status", ({ username, online }) => {
      setUsers((prev) =>
        prev.map((u) => (u.username === username ? { ...u, online } : u))
      );
      setSelectedUser((prev) =>
        prev?.username === username ? { ...prev, online } : prev
      );
    });

    // DM unread: only count messages FROM others (not your own sent messages)
    socket.on("receive_message", (msg) => {
      if (msg.from === user.username) return; // never count own messages
      setSelectedUser((currentSelected) => {
        if (currentSelected?.username === msg.from) return currentSelected;
        setUnreadCounts((prev) => ({
          ...prev,
          [msg.from]: (prev[msg.from] || 0) + 1,
        }));
        return currentSelected;
      });
    });

    // Group unread: only count messages FROM others
    socket.on("receive_group_message", (msg) => {
      if (msg.from === user.username) return; // never count own messages
      setSelectedGroup((currentSelected) => {
        if (currentSelected?._id === msg.toGroup) return currentSelected;
        setGroupUnreadCounts((prev) => ({
          ...prev,
          [msg.toGroup]: (prev[msg.toGroup] || 0) + 1,
        }));
        return currentSelected;
      });
    });

    const interval = setInterval(fetchUsers, 15000);

    return () => {
      socket.off("user_status");
      socket.off("receive_message");
      socket.off("receive_group_message");
      clearInterval(interval);
    };
  }, []);

  // When groups load, join them all via socket
  useEffect(() => {
    if (!groups.length) return;
    const socket = getSocket(user.username);
    socket.emit("join_groups", groups.map((g) => g._id));
  }, [groups]);

  const handleSelectUser = (u) => {
    setSelectedUser(u);
    setSelectedGroup(null);
    setUnreadCounts((prev) => ({ ...prev, [u.username]: 0 }));
    setMobileView("chat");
  };

  const handleSelectGroup = (g) => {
    setSelectedGroup(g);
    setSelectedUser(null);
    setGroupUnreadCounts((prev) => ({ ...prev, [g._id]: 0 }));
    setMobileView("chat");
  };

  const handleGroupCreated = (newGroup) => {
    setGroups((prev) => [newGroup, ...prev]);
    const socket = getSocket(user.username);
    socket.emit("join_groups", [newGroup._id]);
    handleSelectGroup(newGroup);
  };

  const handleBack = () => {
    setMobileView("sidebar");
  };

  return (
    <div className="chat-root">
      <Sidebar
        users={users}
        groups={groups}
        selectedUser={selectedUser}
        selectedGroup={selectedGroup}
        onSelectUser={handleSelectUser}
        onSelectGroup={handleSelectGroup}
        onGroupCreated={handleGroupCreated}
        unreadCounts={unreadCounts}
        groupUnreadCounts={groupUnreadCounts}
        mobileVisible={mobileView === "sidebar"}
      />
      <div className={`chat-main ${mobileView === "chat" ? "mobile-chat-visible" : "mobile-chat-hidden"}`}>
        {selectedGroup ? (
          <GroupChatWindow selectedGroup={selectedGroup} onBack={handleBack} />
        ) : (
          <ChatWindow selectedUser={selectedUser} onBack={handleBack} />
        )}
      </div>
    </div>
  );
}
