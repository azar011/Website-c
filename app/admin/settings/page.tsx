'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { useToast } from '@/components/ui/Toast';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import {
  Settings,
  Shield,
  History,
  Key,
  Database,
  Lock,
  Server,
  User,
  CheckCircle,
  Save,
  Loader2,
  Mail,
  Eye,
  EyeOff,
  UserPlus,
  Users,
  Trash2,
  Edit2,
  Layers,
  Award,
  BarChart2,
  ExternalLink,
  Plus,
  X,
} from 'lucide-react';

export default function AdminSettingsPage() {
  const [adminUser, setAdminUser] = useState<any | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile Edit State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Super Admin Management State
  const [allAdmins, setAllAdmins] = useState<any[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  // Selected Admin Drilldown / Conducted Quizzes State
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);
  const [adminDetailData, setAdminDetailData] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Create Admin Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newRole, setNewRole] = useState<'ADMIN' | 'SUPER_ADMIN'>('ADMIN');
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  // Edit Admin Modal State
  const [editAdmin, setEditAdmin] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAdminPassword, setEditAdminPassword] = useState('');
  const [editRole, setEditRole] = useState<'ADMIN' | 'SUPER_ADMIN'>('ADMIN');
  const [updatingAdmin, setUpdatingAdmin] = useState(false);

  // Delete Admin State
  const [adminToDelete, setAdminToDelete] = useState<any | null>(null);
  const [deletingAdmin, setDeletingAdmin] = useState(false);

  const { success, error } = useToast();

  const fetchSettings = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/auth/me').then((r) => r.json()),
      fetch('/api/admin/audit-logs').then((r) => r.json()),
    ])
      .then(([authData, logData]) => {
        if (authData.admin) {
          setAdminUser(authData.admin);
          setName(authData.admin.name || '');
          setEmail(authData.admin.email || '');

          if (authData.admin.role === 'SUPER_ADMIN') {
            fetchSuperAdminList();
          }
        }
        if (logData.logs) setAuditLogs(logData.logs);
      })
      .catch((err) => console.error('Error loading settings:', err))
      .finally(() => setLoading(false));
  };

  const fetchSuperAdminList = () => {
    setLoadingAdmins(true);
    fetch('/api/master-admin/admins')
      .then((r) => r.json())
      .then((data) => {
        if (data.admins) setAllAdmins(data.admins);
      })
      .catch((err) => console.error('Error loading all admins:', err))
      .finally(() => setLoadingAdmins(false));
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Fetch Conducted Quizzes for Selected Admin
  const openAdminDetail = async (adminId: string) => {
    setSelectedAdminId(adminId);
    setLoadingDetail(true);
    setAdminDetailData(null);

    try {
      const res = await fetch(`/api/master-admin/admins/${adminId}`);
      const json = await res.json();
      if (res.ok) {
        setAdminDetailData(json);
      } else {
        error(json.error || 'Failed to load administrator report');
      }
    } catch {
      error('Failed to load administrator report');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      error('Name and email are required');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        success('Profile updated successfully!');
        setAdminUser(data.admin);
      } else {
        error(data.error || 'Failed to update profile');
      }
    } catch {
      error('An error occurred updating profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      error('Please enter your current password');
      return;
    }
    if (newPassword.length < 6) {
      error('New password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      error('New password and confirmation do not match');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        success('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        error(data.error || 'Failed to change password');
      }
    } catch {
      error('An error occurred changing password');
    } finally {
      setSavingPassword(false);
    }
  };

  // Create Admin
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newAdminPassword) {
      error('Please complete all required fields');
      return;
    }

    setCreatingAdmin(true);
    try {
      const res = await fetch('/api/master-admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim().toLowerCase(),
          password: newAdminPassword,
          role: newRole,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        success(`Administrator "${newName}" created successfully!`);
        setShowCreateModal(false);
        setNewName('');
        setNewEmail('');
        setNewAdminPassword('');
        setNewRole('ADMIN');
        fetchSuperAdminList();
      } else {
        error(json.error || 'Failed to create administrator');
      }
    } catch {
      error('An error occurred creating administrator');
    } finally {
      setCreatingAdmin(false);
    }
  };

  // Edit Admin
  const handleUpdateOtherAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAdmin) return;

    setUpdatingAdmin(true);
    try {
      const res = await fetch(`/api/master-admin/admins/${editAdmin.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim().toLowerCase(),
          password: editAdminPassword || undefined,
          role: editRole,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        success('Administrator details updated successfully!');
        setEditAdmin(null);
        fetchSuperAdminList();
        if (selectedAdminId === editAdmin.id) {
          openAdminDetail(editAdmin.id);
        }
      } else {
        error(json.error || 'Failed to update administrator');
      }
    } catch {
      error('An error occurred updating administrator');
    } finally {
      setUpdatingAdmin(false);
    }
  };

  // Delete Admin
  const handleDeleteAdmin = async () => {
    if (!adminToDelete) return;

    setDeletingAdmin(true);
    try {
      const res = await fetch(`/api/master-admin/admins/${adminToDelete.id}`, {
        method: 'DELETE',
      });

      const json = await res.json();
      if (res.ok) {
        success(json.message || 'Administrator account deleted.');
        if (selectedAdminId === adminToDelete.id) {
          setSelectedAdminId(null);
        }
        setAdminToDelete(null);
        fetchSuperAdminList();
      } else {
        error(json.error || 'Failed to delete administrator');
      }
    } catch {
      error('An error occurred deleting administrator');
    } finally {
      setDeletingAdmin(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs font-semibold text-slate-500">Loading Settings...</p>
        </div>
      </div>
    );
  }

  const isSuperAdmin = adminUser?.role === 'SUPER_ADMIN';

  return (
    <div className="flex-1 flex flex-col pb-16">
      <AdminHeader
        title="Settings & Account Management"
        subtitle="Manage administrator profile, credentials, and system audit logs."
      />

      <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto w-full">
        {/* ========================================================================= */}
        {/* SUPER ADMIN: SYSTEM ADMINISTRATORS MANAGEMENT SECTION                    */}
        {/* ========================================================================= */}
        {isSuperAdmin && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Administrator Accounts</span>
                    <span className="text-[10px] uppercase font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-full">
                      Super Admin
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Add new administrators and click any admin to inspect the quizzes they have conducted.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow transition shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Admin User</span>
              </button>
            </div>

            {/* Administrators Table */}
            {loadingAdmins ? (
              <div className="py-8 flex items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Administrator</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3 text-center">Quizzes Conducted</th>
                      <th className="px-4 py-3 text-center">Submissions</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {allAdmins.map((admin) => (
                      <tr
                        key={admin.id}
                        onClick={() => openAdminDetail(admin.id)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer group"
                      >
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition flex items-center gap-2">
                            <span>{admin.name}</span>
                            {admin.id === adminUser?.adminId && (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.2 rounded">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-slate-400 font-mono text-[11px] block">{admin.email}</span>
                        </td>

                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              admin.role === 'SUPER_ADMIN'
                                ? 'bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400'
                                : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400'
                            }`}
                          >
                            {admin.role}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                          {admin.quizzesCount}
                        </td>

                        <td className="px-4 py-3.5 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {admin.attemptsCount}
                        </td>

                        <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openAdminDetail(admin.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-600 hover:text-white text-indigo-600 text-[11px] font-bold transition flex items-center gap-1"
                            >
                              <BarChart2 className="w-3.5 h-3.5" />
                              <span>View Quizzes</span>
                            </button>

                            <button
                              onClick={() => {
                                setEditAdmin(admin);
                                setEditName(admin.name);
                                setEditEmail(admin.email);
                                setEditAdminPassword('');
                                setEditRole(admin.role);
                              }}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                              title="Edit Admin"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              disabled={allAdmins.length <= 1}
                              onClick={() => setAdminToDelete(admin)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-600 transition disabled:opacity-30"
                              title={allAdmins.length <= 1 ? 'Cannot delete only remaining admin' : 'Delete Admin'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Profile Details Form */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  My Profile Details
                </h3>
                <p className="text-xs text-slate-500">Update your display name and login email</p>
              </div>
            </div>

            <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full">
              {adminUser?.role || 'Admin'}
            </span>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name / Display Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Administrator Name"
                    className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Login Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@quizplatform.com"
                    className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow transition disabled:opacity-50"
              >
                {savingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Profile Details</span>
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Change Password
              </h3>
              <p className="text-xs text-slate-500">Update your administrative login password</p>
            </div>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1.5"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPassword ? 'Hide Passwords' : 'Show Passwords'}</span>
              </button>

              <button
                type="submit"
                disabled={savingPassword}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold shadow transition disabled:opacity-50"
              >
                {savingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                <span>Update Password</span>
              </button>
            </div>
          </form>
        </div>

        {/* Audit Logs Trail */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Administrative Audit Trail
              </h3>
            </div>
            <span className="text-xs text-slate-400">Last 30 recorded events</span>
          </div>

          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-800 sticky top-0">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Admin</th>
                  <th className="px-5 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-slate-400">
                      No audit events logged yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="px-5 py-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {log.action}
                      </td>
                      <td className="px-5 py-3 text-slate-700 dark:text-slate-300 font-medium">
                        {log.admin?.name || 'System'}
                      </td>
                      <td className="px-5 py-3 text-slate-500 max-w-xs truncate font-mono text-[11px]">
                        {log.details || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ADMIN DETAIL & CONDUCTED QUIZZES MODAL                                    */}
      {/* ========================================================================= */}
      {selectedAdminId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl overflow-y-auto space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-lg shadow-indigo-600/30">
                  {adminDetailData?.admin?.name?.charAt(0) || 'A'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {adminDetailData?.admin?.name || 'Administrator Report'}
                    </h2>
                    <span className="text-[10px] uppercase font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-full">
                      {adminDetailData?.admin?.role}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    {adminDetailData?.admin?.email} • Joined on{' '}
                    {adminDetailData?.admin?.createdAt
                      ? new Date(adminDetailData.admin.createdAt).toLocaleDateString()
                      : '—'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedAdminId(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <p className="text-xs font-semibold">Loading administrator quiz history & statistics...</p>
              </div>
            ) : adminDetailData ? (
              <div className="space-y-6">
                {/* Aggregate Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      Quizzes Conducted
                    </span>
                    <span className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1 block">
                      {adminDetailData.stats?.totalQuizzes || 0}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      Total Submissions
                    </span>
                    <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-1 block">
                      {adminDetailData.stats?.totalAttempts || 0}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      Overall Pass Rate
                    </span>
                    <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1 block">
                      {adminDetailData.stats?.overallPassRate || '0%'}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      Violations Logged
                    </span>
                    <span className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono mt-1 block">
                      {adminDetailData.stats?.totalViolations || 0}
                    </span>
                  </div>
                </div>

                {/* Quizzes List Conducted by this Admin */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span>Assessments Conducted by {adminDetailData.admin?.name}</span>
                    </h3>
                    <span className="text-xs text-slate-400">
                      {adminDetailData.quizzes?.length || 0} Quizzes
                    </span>
                  </div>

                  {adminDetailData.quizzes?.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 text-xs">
                      This administrator has not created or conducted any quizzes yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-2xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="px-4 py-3">Quiz Title & Code</th>
                            <th className="px-4 py-3">Subject & Dept</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-center">Questions</th>
                            <th className="px-4 py-3 text-center">Submissions</th>
                            <th className="px-4 py-3 text-center">Pass Rate</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {adminDetailData.quizzes.map((quiz: any) => (
                            <tr key={quiz.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                              <td className="px-4 py-3">
                                <div className="font-bold text-slate-900 dark:text-white">{quiz.title}</div>
                                <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                                  {quiz.publicCode}
                                </span>
                              </td>

                              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                                <div>{quiz.subject || '—'}</div>
                                <span className="text-[10px] text-slate-400">
                                  {quiz.department || quiz.targetClass || '—'}
                                </span>
                              </td>

                              <td className="px-4 py-3">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    quiz.status === 'PUBLISHED'
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                                  }`}
                                >
                                  {quiz.status}
                                </span>
                              </td>

                              <td className="px-4 py-3 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
                                {quiz.totalQuestions}
                              </td>

                              <td className="px-4 py-3 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                {quiz.totalAttempts}
                              </td>

                              <td className="px-4 py-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {quiz.passRate}
                              </td>

                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Link
                                    href={`/admin/quizzes/${quiz.id}/responses`}
                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                                    title="View Responses"
                                  >
                                    <Users className="w-3.5 h-3.5" />
                                  </Link>

                                  <Link
                                    href={`/quiz/${quiz.publicCode}`}
                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                                    title="Open Quiz Link"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* CREATE ADMIN MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Add New Administrator</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name / Display Name
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Prof. Alan Turing"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Login Email
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="alan@institution.edu"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Initial Password (min 6 characters)
                </label>
                <input
                  type="password"
                  required
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Role
                </label>
                <select
                  value={newRole}
                  onChange={(e: any) => setNewRole(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ADMIN">Standard Administrator</option>
                  <option value="SUPER_ADMIN">Super Administrator</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingAdmin}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow transition disabled:opacity-50"
                >
                  {creatingAdmin ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Create Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ADMIN MODAL */}
      {editAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Administrator</h3>
              </div>
              <button
                onClick={() => setEditAdmin(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateOtherAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name / Display Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Login Email
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  New Password (leave blank to keep existing)
                </label>
                <input
                  type="password"
                  value={editAdminPassword}
                  onChange={(e) => setEditAdminPassword(e.target.value)}
                  placeholder="Leave blank to keep unchanged"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Role
                </label>
                <select
                  value={editRole}
                  onChange={(e: any) => setNewRole(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ADMIN">Standard Administrator</option>
                  <option value="SUPER_ADMIN">Super Administrator</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditAdmin(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingAdmin}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow transition disabled:opacity-50"
                >
                  {updatingAdmin ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE ADMIN CONFIRMATION DIALOG */}
      <ConfirmationDialog
        isOpen={!!adminToDelete}
        onClose={() => setAdminToDelete(null)}
        onConfirm={handleDeleteAdmin}
        isLoading={deletingAdmin}
        isDangerous={true}
        title="Delete Administrator Account?"
        message={`Are you sure you want to permanently delete "${adminToDelete?.name}" (${adminToDelete?.email})? This action cannot be undone.`}
        confirmText="Permanently Delete Admin"
      />
    </div>
  );
}
