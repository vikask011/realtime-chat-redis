import { useAuth } from "../context/AuthContext";

export default function Sidebar({ users, selectedUser, onSelect }) {
  const { user, logout } = useAuth();

  return (
    <div className="w-72 bg-gray-900 border-r border-gray-800 flex flex-col h-full shrink-0">
      {/* Current user header */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-sm uppercase">
            {user.username[0]}
          </div>
          <div>
            <p className="text-white text-sm font-semibold">{user.username}</p>
            <p className="text-green-400 text-xs">● Online</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="text-gray-500 hover:text-red-400 text-xs transition"
          title="Logout"
        >
          ⏻
        </button>
      </div>

      {/* Label */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-gray-500 text-xs uppercase tracking-wider font-semibold">
          All Users ({users.length})
        </p>
      </div>

      {/* User list */}
      <div className="flex-1 overflow-y-auto">
        {users.length === 0 && (
          <p className="text-gray-600 text-sm text-center mt-8 px-4">
            No other users registered yet
          </p>
        )}
        {users.map((u) => (
          <button
            key={u._id}
            onClick={() => onSelect(u)}
            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition text-left
              ${selectedUser?._id === u._id ? "bg-gray-800 border-r-2 border-purple-500" : ""}`}
          >
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-sm uppercase">
                {u.username[0]}
              </div>
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-gray-900
                  ${u.online ? "bg-green-400" : "bg-gray-600"}`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{u.username}</p>
              <p className={`text-xs truncate ${u.online ? "text-green-400" : "text-gray-500"}`}>
                {u.online ? "Online" : "Offline"}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
