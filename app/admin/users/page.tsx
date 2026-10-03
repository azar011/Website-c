'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import {
  ShieldCheck,
  UserPlus,
  Users,
  Trash2,
  Edit2,
  FileQuestion,
  Loader2,
  CheckCircle2,
  LogOut,
  Check,
  Plus,
} from 'lucide-react';

export default function MasterAdminSimplePage() {
  const router = useRouter();
  const { success, error } = useToast();

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentAdmin, setCurrentAdmin] = useState<any | null>(null);

  // Selected Admin State (for viewing conducted quizzes count & list)
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);
  const [adminDetailData, setAdminDetailData] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Create Admin Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'ADMIN' | 'SUPER_ADMIN'>('ADMIN');
  const [creating, setCreating] = useState(false);

  // Edit Admin Modal State
  const [editAdmin, setEditAdmin] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'ADMIN' | 'SUPER_ADMIN'>('ADMIN');
  const [updating, setUpdating] = useState(false);

  // Delete Admin State
  const [adminToDelete, setAdminToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch Master Data
  const fetchAdminsData = async (initialSelect: boolean = false) => {
    setLoading(true);
    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      if (!meData.authenticated || meData.admin?.role !== 'SUPER_ADMIN') {
        error('Unauthorized: Master Admin privileges required.');
        router.push('/admin');
        return;
      }
      setCurrentAdmin(meData.admin);

      const res = await fetch('/api/master-admin/admins');
      const json = await res.json();
      if (res.ok) {
        setData(json);
        if (json.admins && json.admins.length > 0) {
          const targetId = selectedAdminId || json.admins[0].id;
          if (initialSelect || !selectedAdminId) {
            setSelectedAdminId(targetId);
            loadAdminReport(targetId);
          }
        }
      } else {
        error(json.error || 'Failed to load administrator accounts');
      }
    } catch {
      error('Network error loading administrators');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminsData(true);
  }, []);

  // Fetch Individual Admin Conducted Quizzes
  const loadAdminReport = async (adminId: string) => {
    setSelectedAdminId(adminId);
    setLoadingDetail(true);

    try {
      const res = await fetch(`/api/master-admin/admins/${adminId}`);
      const json = await res.json();
      if (res.ok) {
        setAdminDetailData(json);
      } else {
        error(json.error || 'Failed to load administrator details');
      }
    } catch {
      error('Failed to load administrator details');
    } finally {
      setLoadingDetail(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        success('Logged out successfully');
        window.location.href = '/admin/login';
      } else {
        error('Failed to logout');
      }
    } catch {
      error('An error occurred during logout');
    }
  };

  // Handle Create Admin
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword) {
      error('Please fill in all fields');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/master-admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim().toLowerCase(),
          password: newPassword,
          role: newRole,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        success(`Administrator "${newName}" created successfully!`);
        setShowCreateModal(false);
        setNewName('');
        setNewEmail('');
        setNewPassword('');
        setNewRole('ADMIN');
        fetchAdminsData();
        if (json.admin?.id) {
          loadAdminReport(json.admin.id);
        }
      } else {
        error(json.error || 'Failed to create administrator');
      }
    } catch {
      error('An error occurred creating administrator');
    } finally {
      setCreating(false);
    }
  };

  // Handle Edit Admin
  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAdmin) return;

    setUpdating(true);
    try {
      const res = await fetch(`/api/master-admin/admins/${editAdmin.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim().toLowerCase(),
          password: editPassword || undefined,
          role: editRole,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        success('Administrator updated successfully!');
        setEditAdmin(null);
        fetchAdminsData();
        if (selectedAdminId === editAdmin.id) {
          loadAdminReport(editAdmin.id);
        }
      } else {
        error(json.error || 'Failed to update administrator');
      }
    } catch {
      error('An error occurred updating administrator');
    } finally {
      setUpdating(false);
    }
  };

  // Handle Delete Admin
  const handleDeleteAdmin = async () => {
    if (!adminToDelete) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/master-admin/admins/${adminToDelete.id}`, {
        method: 'DELETE',
      });

      const json = await res.json();
      if (res.ok) {
        success(json.message || 'Administrator account deleted.');
        if (selectedAdminId === adminToDelete.id) {
          setSelectedAdminId(null);
          setAdminDetailData(null);
        }
        setAdminToDelete(null);
        fetchAdminsData();
      } else {
        error(json.error || 'Failed to delete administrator');
      }
    } catch {
      error('An error occurred deleting administrator');
    } finally {
      setDeleting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          <p className="text-xs font-semibold text-slate-400">Loading Master Admin...</p>
        </div>
      </div>
    );
  }

  const selectedAdmin =
    data?.admins?.find((a: any) => a.id === selectedAdminId) || adminDetailData?.admin;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* SIMPLE HEADER BAR */}
      <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white font-bold shadow">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-tight">QuizMaster</span>
              <span className="ml-2 text-[10px] uppercase font-bold text-purple-300 bg-purple-950 border border-purple-500/40 px-2 py-0.5 rounded">
                Master Admin
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              {currentAdmin?.email || 'azar.admin@gmail.com'}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-400 text-xs font-semibold transition border border-rose-500/20"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN SINGLE SCREEN CONTENT */}
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full space-y-6">
        {/* Top Title & Add Admin Button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
          <div>
            <h1 className="text-lg font-bold text-white">Administrator Accounts</h1>
            <p className="text-xs text-slate-400">
              Manage administrators and click any account to view the quizzes they have conducted.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add New Admin</span>
          </button>
        </div>

        {/* 1. ADMINISTRATORS LIST TABLE */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span>Administrator Accounts ({data?.admins?.length || 0})</span>
            </span>
            <span className="text-xs text-slate-500">Click any row to view conducted quizzes</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3">Administrator</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3 text-center">Quizzes Conducted</th>
                  <th className="px-5 py-3 text-center">Total Submissions</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {data?.admins?.map((admin: any) => {
                  const isSelected = selectedAdminId === admin.id;
                  return (
                    <tr
                      key={admin.id}
                      onClick={() => loadAdminReport(admin.id)}
                      className={`transition cursor-pointer ${
                        isSelected
                          ? 'bg-purple-950/40 border-l-4 border-purple-500'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-white flex items-center gap-2">
                          <span className={isSelected ? 'text-purple-300 font-extrabold' : ''}>
                            {admin.name}
                          </span>
                          {admin.isCurrentSession && (
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-500/30">
                              You
                            </span>
                          )}
                          {isSelected && (
                            <span className="text-[9px] font-bold text-purple-300 bg-purple-900 px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                              <Check className="w-2.5 h-2.5" />
                              <span>Selected</span>
                            </span>
                          )}
                        </div>
                        <span className="text-slate-400 font-mono text-[11px] block">{admin.email}</span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            admin.role === 'SUPER_ADMIN'
                              ? 'bg-purple-950 text-purple-300 border border-purple-500/40'
                              : 'bg-indigo-950 text-indigo-300 border border-indigo-500/40'
                          }`}
                        >
                          {admin.role}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-center font-mono font-bold text-white text-sm">
                        <span className="px-2.5 py-0.5 rounded bg-slate-800 border border-slate-700">
                          {admin.quizzesCount} {admin.quizzesCount === 1 ? 'Quiz' : 'Quizzes'}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-center font-mono font-bold text-purple-400 text-sm">
                        {admin.attemptsCount}
                      </td>

                      <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => loadAdminReport(admin.id)}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                              isSelected
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-800 hover:bg-purple-600 text-slate-300 hover:text-white'
                            }`}
                          >
                            {isSelected ? 'Viewing' : 'Select'}
                          </button>

                          <button
                            onClick={() => {
                              setEditAdmin(admin);
                              setEditName(admin.name);
                              setEditEmail(admin.email);
                              setEditPassword('');
                              setEditRole(admin.role);
                            }}
                            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            disabled={data?.admins?.length <= 1}
                            onClick={() => setAdminToDelete(admin)}
                            className="p-1.5 rounded bg-rose-950/40 hover:bg-rose-900 text-rose-400 transition disabled:opacity-30"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. SELECTED ADMIN CONDUCTED QUIZZES SUMMARY */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FileQuestion className="w-4 h-4 text-purple-400" />
                <span>
                  Quizzes Conducted by: <span className="text-purple-300">{selectedAdmin?.name || 'Administrator'}</span>
                </span>
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">{selectedAdmin?.email}</span>
            </div>

            {adminDetailData && (
              <div className="flex items-center gap-4 text-xs">
                <div className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700">
                  <span className="text-slate-400">Total Quizzes: </span>
                  <span className="font-bold text-white font-mono">{adminDetailData.stats?.totalQuizzes || 0}</span>
                </div>
                <div className="px-3 py-1 rounded-lg bg-purple-950/50 border border-purple-800">
                  <span className="text-purple-300">Total Submissions: </span>
                  <span className="font-bold text-purple-200 font-mono">{adminDetailData.stats?.totalAttempts || 0}</span>
                </div>
              </div>
            )}
          </div>

          {loadingDetail ? (
            <div className="py-8 flex items-center justify-center text-slate-400 text-xs gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
              <span>Loading quizzes...</span>
            </div>
          ) : adminDetailData?.quizzes?.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              This administrator has not conducted any quizzes yet.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5">Quiz Title</th>
                    <th className="px-4 py-2.5">Code</th>
                    <th className="px-4 py-2.5">Subject</th>
                    <th className="px-4 py-2.5 text-center">Questions</th>
                    <th className="px-4 py-2.5 text-center">Submissions</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {adminDetailData?.quizzes?.map((quiz: any) => (
                    <tr key={quiz.id} className="hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 font-semibold text-white">
                        {quiz.title}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-purple-400 font-bold">
                        {quiz.publicCode}
                      </td>
                      <td className="px-4 py-2.5 text-slate-400">
                        {quiz.subject || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono text-slate-300">
                        {quiz.totalQuestions}
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono font-bold text-purple-300">
                        {quiz.totalAttempts}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            quiz.status === 'PUBLISHED'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                              : 'bg-amber-950 text-amber-400 border border-amber-500/40'
                          }`}
                        >
                          {quiz.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* CREATE ADMIN MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-purple-400" />
                <span>Add New Administrator</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Prof. Alan Turing"
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Login Email</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="alan@institution.edu"
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Password (min 6 chars)</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Role</label>
                <select
                  value={newRole}
                  onChange={(e: any) => setNewRole(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="ADMIN">Standard Administrator (Quiz Admin)</option>
                  <option value="SUPER_ADMIN">Super Administrator (Master Admin)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ADMIN MODAL */}
      {editAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-purple-400" />
                <span>Edit Administrator</span>
              </h3>
              <button
                onClick={() => setEditAdmin(null)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateAdmin} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Login Email</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  New Password (leave blank to keep unchanged)
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Leave blank to keep unchanged"
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Role</label>
                <select
                  value={editRole}
                  onChange={(e: any) => setNewRole(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="ADMIN">Standard Administrator</option>
                  <option value="SUPER_ADMIN">Super Administrator</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditAdmin(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE ADMIN CONFIRMATION */}
      <ConfirmationDialog
        isOpen={!!adminToDelete}
        onClose={() => setAdminToDelete(null)}
        onConfirm={handleDeleteAdmin}
        isLoading={deleting}
        isDangerous={true}
        title="Delete Administrator Account?"
        message={`Are you sure you want to delete "${adminToDelete?.name}" (${adminToDelete?.email})?`}
        confirmText="Delete Admin"
      />
    </div>
  );
}
