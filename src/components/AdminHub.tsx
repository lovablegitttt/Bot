import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Send,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Star,
  Ban,
  Radio,
  Loader2,
  RefreshCw,
  MessageSquare,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { BotUser, BotStatus } from '../types';

interface AdminHubProps {
  status: BotStatus | null;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onRefresh: () => void;
}

export const AdminHub: React.FC<AdminHubProps> = ({ status, showToast, onRefresh }) => {
  const [users, setUsers] = useState<BotUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [broadcastText, setBroadcastText] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastStats, setBroadcastStats] = useState<any>(null);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/bot/users');
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUserAction = async (userId: string, action: 'ban' | 'vip', currentValue: boolean) => {
    try {
      const res = await fetch('/api/bot/user-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          action,
          value: !currentValue,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`User ${userId} ${action === 'ban' ? (!currentValue ? 'Banned' : 'Unbanned') : (!currentValue ? 'granted VIP' : 'revoked VIP')}`, 'info');
        fetchUsers();
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;

    setIsBroadcasting(true);
    setBroadcastStats(null);

    try {
      const res = await fetch('/api/bot/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageText: broadcastText.trim() }),
      });

      const data = await res.json();
      if (data.success) {
        setBroadcastStats(data);
        showToast(`Broadcast delivered to ${data.sent} active users!`, 'success');
        setBroadcastText('');
      } else {
        showToast(data.error || 'Failed to send broadcast', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase();
    return (
      u.id.toLowerCase().includes(query) ||
      (u.username && u.username.toLowerCase().includes(query)) ||
      (u.firstName && u.firstName.toLowerCase().includes(query))
    );
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border border-purple-500/20 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl font-bold text-slate-100">Telegram Admin & User Command Hub</h2>
            </div>
            <p className="text-sm text-slate-300">
              Broadcast announcements to all bot users, manage user privileges and moderation, and monitor bot usage.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono">
              Admin ID: {status?.config?.adminId || 'Not Configured'}
            </span>
          </div>
        </div>
      </div>

      {/* Broadcast Module & Admin Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Broadcast Form (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-200 text-base flex items-center gap-2">
                <Radio className="w-4 h-4 text-sky-400" />
                <span>Broadcast Announcement to All Users</span>
              </h3>
              <span className="text-xs text-slate-400">
                Audience: <strong className="text-sky-300">{users.length}</strong> users
              </span>
            </div>

            <form onSubmit={handleBroadcast} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">
                  Announcement Message (Telegram Markdown Supported)
                </label>
                <textarea
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                  rows={4}
                  placeholder={`✨ Exciting Update!\nWe have added FLUX.1 Schnell model for ultra-realistic art generation!\n\nTry sending a prompt now.`}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              {broadcastStats && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center justify-between">
                  <span>✅ Broadcast sent: <strong>{broadcastStats.sent}</strong> delivered, <strong>{broadcastStats.failed}</strong> failed/blocked.</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">
                  Sends as a direct message from the bot to every user in your database.
                </span>
                <button
                  type="submit"
                  disabled={isBroadcasting || !broadcastText.trim()}
                  className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-semibold px-5 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-sky-500/25 flex items-center gap-2"
                >
                  {isBroadcasting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Dispatch Broadcast</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Admin Commands Cheatsheet (1 Col) */}
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>Telegram Chat Admin Commands</span>
            </h3>
            <p className="text-xs text-slate-400">
              When messaging your bot from your configured Admin ID, you can use:
            </p>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-purple-400 font-bold">/admin</span>
                <p className="text-slate-400 text-[11px] font-sans">Open mobile control panel & stats</p>
              </div>
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-purple-400 font-bold">/stats</span>
                <p className="text-slate-400 text-[11px] font-sans">View generation counts & uptime</p>
              </div>
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-purple-400 font-bold">/broadcast &lt;msg&gt;</span>
                <p className="text-slate-400 text-[11px] font-sans">Broadcast message instantly to all users</p>
              </div>
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-purple-400 font-bold">/ban &lt;userId&gt;</span>
                <p className="text-slate-400 text-[11px] font-sans">Suspend user access to the bot</p>
              </div>
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-purple-400 font-bold">/unban &lt;userId&gt;</span>
                <p className="text-slate-400 text-[11px] font-sans">Restore access to suspended user</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Management Directory */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-400" />
              <span>Registered Bot Users & Moderation</span>
            </h3>
            <p className="text-xs text-slate-400">Manage user tiers, moderation status, and quotas</p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search user ID or handle..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <button
              onClick={fetchUsers}
              disabled={loadingUsers}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs border border-slate-700 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Telegram User</th>
                <th className="px-4 py-3">Numeric ID</th>
                <th className="px-4 py-3">Generations</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last Active</th>
                <th className="px-4 py-3 text-right">Moderation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No users recorded yet. Users appear automatically once they start or message the bot.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isAdminUser = String(user.id) === String(status?.config?.adminId);

                  return (
                    <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-200">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-sky-400 font-bold text-xs">
                            {user.firstName ? user.firstName.charAt(0) : 'U'}
                          </div>
                          <div>
                            <span className="block font-semibold">
                              {user.firstName || 'Anonymous'} {user.lastName || ''}
                            </span>
                            {user.username && (
                              <span className="text-[11px] text-sky-400">@{user.username}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400">{user.id}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-100">{user.totalGenerations}</span> images
                      </td>
                      <td className="px-4 py-3">
                        {isAdminUser ? (
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                            Supreme Admin
                          </span>
                        ) : user.isVip ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                            VIP Unlimited
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px]">
                            Standard
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {user.isBanned ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-semibold flex items-center gap-1 w-fit">
                            <Ban className="w-3 h-3" />
                            Banned
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" />
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {new Date(user.lastActive).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isAdminUser && (
                            <>
                              <button
                                onClick={() => handleUserAction(user.id, 'vip', user.isVip)}
                                title={user.isVip ? 'Revoke VIP' : 'Grant VIP'}
                                className={`p-1.5 rounded-lg border transition-colors ${
                                  user.isVip
                                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-amber-300'
                                }`}
                              >
                                <Star className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleUserAction(user.id, 'ban', user.isBanned)}
                                title={user.isBanned ? 'Unban User' : 'Ban User'}
                                className={`p-1.5 rounded-lg border transition-colors ${
                                  user.isBanned
                                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-rose-300'
                                }`}
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
