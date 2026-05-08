import { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const SERVER = import.meta.env.VITE_SERVER_URL;

export default function Sidebar({
  users,
  groups,
  selectedUser,
  selectedGroup,
  onSelectUser,
  onSelectGroup,
  onGroupCreated,
  unreadCounts = {},
  groupUnreadCounts = {},
  mobileVisible = true,
}) {
  const { user, token, logout } = useAuth();
  const [tab, setTab] = useState("dms"); // "dms" | "groups"
  const [search, setSearch] = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [creating, setCreating] = useState(false);

  const filtered = tab === "dms"
    ? users.filter((u) => u.username.toLowerCase().includes(search.toLowerCase()))
    : groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()));

  const onlineCount = users.filter((u) => u.online).length;
  const totalUnread =
    Object.values(unreadCounts).reduce((a, b) => a + b, 0) +
    Object.values(groupUnreadCounts).reduce((a, b) => a + b, 0);

  const toggleMember = (username) => {
    setSelectedMembers((prev) =>
      prev.includes(username) ? prev.filter((m) => m !== username) : [...prev, username]
    );
  };

  const createGroup = async () => {
    if (!groupName.trim()) return;
    setCreating(true);
    try {
      const res = await axios.post(
        `${SERVER}/api/groups`,
        { name: groupName.trim(), members: selectedMembers },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onGroupCreated(res.data);
      setShowCreateGroup(false);
      setGroupName("");
      setSelectedMembers([]);
      setTab("groups");
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  return (
    <aside className={`sidebar${mobileVisible ? "" : " mobile-sidebar-hidden"}`}>
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <svg width="28" height="28" viewBox="0 0 44 44" fill="none">
            <rect width="44" height="44" rx="10" fill="url(#sb-lg)" />
            <path d="M10 14h24M10 22h18M10 30h22" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
            <defs>
              <linearGradient id="sb-lg" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366f1" />
                <stop offset="1" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
          <span className="sidebar-brand-name">Nexus</span>
          {totalUnread > 0 && (
            <span className="global-unread-badge">{totalUnread}</span>
          )}
        </div>
        <button onClick={logout} className="logout-btn" title="Logout">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>

      {/* Current user info */}
      <div className="sidebar-me">
        <div className="avatar avatar-me">
          {user.username[0].toUpperCase()}
          <span className="avatar-dot online" />
        </div>
        <div className="sidebar-me-info">
          <p className="sidebar-me-name">{user.username}</p>
          <p className="sidebar-me-status">
            <span className="status-dot online-dot" />
            Online
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab ${tab === "dms" ? "tab-active" : ""}`}
          onClick={() => setTab("dms")}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          DMs
          {Object.values(unreadCounts).reduce((a, b) => a + b, 0) > 0 && (
            <span className="tab-badge">{Object.values(unreadCounts).reduce((a, b) => a + b, 0)}</span>
          )}
        </button>
        <button
          className={`sidebar-tab ${tab === "groups" ? "tab-active" : ""}`}
          onClick={() => setTab("groups")}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.768-.152-1.5-.438-2.168M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.768.152-1.5.438-2.168m0 0a5.002 5.002 0 019.124 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Groups
          {Object.values(groupUnreadCounts).reduce((a, b) => a + b, 0) > 0 && (
            <span className="tab-badge">{Object.values(groupUnreadCounts).reduce((a, b) => a + b, 0)}</span>
          )}
        </button>
      </div>

      {/* Search + create group button */}
      <div className="sidebar-search-wrap">
        <span className="search-icon">
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
        </span>
        <input
          type="text"
          placeholder={tab === "dms" ? "Search users…" : "Search groups…"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sidebar-search"
        />
        {tab === "groups" && (
          <button className="create-group-btn" onClick={() => setShowCreateGroup(true)} title="New group">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>

      {/* Stats row */}
      {tab === "dms" && (
        <div className="sidebar-stats">
          <span className="stat-chip">
            <span className="stat-dot online-dot" /> {onlineCount} online
          </span>
          <span className="stat-chip muted">{users.length} total</span>
        </div>
      )}
      {tab === "groups" && (
        <div className="sidebar-stats">
          <span className="stat-chip muted">{groups.length} group{groups.length !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* List */}
      <div className="sidebar-list">
        {tab === "dms" && (
          <>
            {filtered.length === 0 && (
              <div className="sidebar-empty">
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.768-.152-1.5-.438-2.168M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.768.152-1.5.438-2.168m0 0a5.002 5.002 0 019.124 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p>No users found</p>
              </div>
            )}
            {filtered.map((u) => {
              const unread = unreadCounts[u.username] || 0;
              const isSelected = selectedUser?._id === u._id;
              return (
                <button
                  key={u._id}
                  onClick={() => onSelectUser(u)}
                  className={`user-item ${isSelected ? "user-item-active" : ""}`}
                >
                  <div className="avatar avatar-sm">
                    {u.username[0].toUpperCase()}
                    <span className={`avatar-dot ${u.online ? "online" : "offline"}`} />
                  </div>
                  <div className="user-item-info">
                    <p className="user-item-name">{u.username}</p>
                    <p className={`user-item-status ${u.online ? "status-online" : "status-offline"}`}>
                      {u.online ? "Active now" : "Offline"}
                    </p>
                  </div>
                  {unread > 0 && (
                    <span className="unread-badge">{unread > 99 ? "99+" : unread}</span>
                  )}
                </button>
              );
            })}
          </>
        )}

        {tab === "groups" && (
          <>
            {filtered.length === 0 && (
              <div className="sidebar-empty">
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.768-.152-1.5-.438-2.168M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.768.152-1.5.438-2.168m0 0a5.002 5.002 0 019.124 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p>No groups yet</p>
                <button className="create-group-link" onClick={() => setShowCreateGroup(true)}>
                  Create one →
                </button>
              </div>
            )}
            {filtered.map((g) => {
              const unread = groupUnreadCounts[g._id] || 0;
              const isSelected = selectedGroup?._id === g._id;
              return (
                <button
                  key={g._id}
                  onClick={() => onSelectGroup(g)}
                  className={`user-item ${isSelected ? "user-item-active" : ""}`}
                >
                  <div className="avatar avatar-sm group-avatar">#</div>
                  <div className="user-item-info">
                    <p className="user-item-name">{g.name}</p>
                    <p className="user-item-status status-offline">
                      {g.members.length} member{g.members.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  {unread > 0 && (
                    <span className="unread-badge">{unread > 99 ? "99+" : unread}</span>
                  )}
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="modal-overlay" onClick={() => setShowCreateGroup(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New Group</h3>
              <button className="modal-close" onClick={() => setShowCreateGroup(false)}>✕</button>
            </div>
            <input
              type="text"
              className="modal-input"
              placeholder="Group name…"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              autoFocus
            />
            <p className="modal-label">Add members</p>
            <div className="modal-member-list">
              {users.map((u) => (
                <label key={u._id} className="modal-member-row">
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(u.username)}
                    onChange={() => toggleMember(u.username)}
                  />
                  <div className="avatar avatar-sm">
                    {u.username[0].toUpperCase()}
                    <span className={`avatar-dot ${u.online ? "online" : "offline"}`} />
                  </div>
                  <span>{u.username}</span>
                </label>
              ))}
            </div>
            <button
              className="modal-create-btn"
              onClick={createGroup}
              disabled={!groupName.trim() || creating}
            >
              {creating ? "Creating…" : "Create Group"}
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
