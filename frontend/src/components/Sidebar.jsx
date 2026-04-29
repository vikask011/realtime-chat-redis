import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Sidebar({ users, selectedUser, onSelect, unreadCounts = {} }) {
  const { user, logout } = useAuth();
  const [search, setSearch] = useState("");

  const filtered = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const onlineCount = users.filter((u) => u.online).length;
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  return (
    <aside className="sidebar">
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

      {/* Search */}
      <div className="sidebar-search-wrap">
        <span className="search-icon">
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
        </span>
        <input
          type="text"
          placeholder="Search users…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sidebar-search"
        />
      </div>

      {/* Stats row */}
      <div className="sidebar-stats">
        <span className="stat-chip">
          <span className="stat-dot online-dot" /> {onlineCount} online
        </span>
        <span className="stat-chip muted">{users.length} total</span>
      </div>

      {/* User list */}
      <div className="sidebar-list">
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
              onClick={() => onSelect(u)}
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
                <span className="unread-badge">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}