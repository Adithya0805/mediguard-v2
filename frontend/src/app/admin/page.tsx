'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { 
  listClinicalStaff, 
  createClinicalStaff, 
  deactivateClinicalStaff, 
  reactivateClinicalStaff,
  getAdminAuditLogs, 
  StaffProfileData,
  AuditLogItem 
} from '@/lib/api';
import { toast } from 'sonner';
import { 
  Building2, Users, FileText, Plus, ShieldCheck, 
  ShieldAlert, Shield, X, Eye, EyeOff, ClipboardList, RotateCcw
} from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const staff = useAuthStore((state) => state.staff);
  const loadFromStorage = useAuthStore((state) => state.loadFromStorage);

  const [staffList, setStaffList] = useState<StaffProfileData[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('physician');
  const [newStaffSpecialization, setNewStaffSpecialization] = useState('');
  const [newStaffEmployeeId, setNewStaffEmployeeId] = useState('');
  const [newStaffKeyphrase, setNewStaffKeyphrase] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdKeyphrase, setCreatedKeyphrase] = useState<string | null>(null);

  // Security authorization check
  useEffect(() => {
    const checkAccess = async () => {
      const active = await loadFromStorage();
      if (!active) {
        router.push('/login');
        return;
      }
      const currentRole = useAuthStore.getState().staff?.role;
      if (currentRole !== 'admin' && currentRole !== 'superadmin') {
        toast.error('Access Denied. Administrator privileges required.');
        router.push('/dashboard');
      }
    };
    checkAccess();
  }, [loadFromStorage, router]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [members, logs] = await Promise.all([
        listClinicalStaff(),
        getAdminAuditLogs(50)
      ]);
      setStaffList(members);
      setAuditLogs(logs);
    } catch (err: any) {
      console.error("Failed to load admin panel details", err);
      toast.error(err.message || "Failed to load admin management details.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (staff && (staff.role === 'admin' || staff.role === 'superadmin')) {
      loadData();
    }
  }, [staff]);

  // Generate a random temporary secure keyphrase for staff creation
  const generateTempKeyphrase = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
    let kp = 'MG-TEMP-';
    for (let i = 0; i < 16; i++) {
      kp += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewStaffKeyphrase(kp);
  };

  const handleOpenAddModal = () => {
    setNewStaffName('');
    setNewStaffEmail('');
    setNewStaffRole('physician');
    setNewStaffSpecialization('');
    setNewStaffEmployeeId('');
    setCreatedKeyphrase(null);
    generateTempKeyphrase();
    setShowAddModal(true);
  };

  const handleCreateStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName || !newStaffEmail || !newStaffKeyphrase) {
      toast.error('Please fill in all required fields.');
      return;
    }
    if (newStaffKeyphrase.length < 12) {
      toast.error('Clinical key phrase must be at least 12 characters.');
      return;
    }

    setIsCreating(true);
    try {
      await createClinicalStaff({
        email: newStaffEmail,
        full_name: newStaffName,
        role: newStaffRole,
        key_phrase: newStaffKeyphrase,
        specialization: newStaffSpecialization || null,
        employee_id: newStaffEmployeeId || null,
        institution_code: staff?.institution_code || ''
      });
      setCreatedKeyphrase(newStaffKeyphrase);
      toast.success('Clinical staff account enrolled successfully!');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to enroll staff member.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeactivate = async (staffId: string, name: string) => {
    if (confirm(`Are you sure you want to deactivate ${name}'s clinical access? This will terminate all active sessions.`)) {
      try {
        await deactivateClinicalStaff(staffId);
        toast.success(`Access deactivated for ${name}`);
        loadData();
      } catch (err: any) {
        toast.error(err.message || 'Deactivation failed.');
      }
    }
  };

  const handleReactivate = async (staffId: string, name: string) => {
    try {
      await reactivateClinicalStaff(staffId);
      toast.success(`Access restored for ${name}`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Reactivation failed.');
    }
  };

  if (!staff || (staff.role !== 'admin' && staff.role !== 'superadmin')) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] text-white flex items-center justify-center">
        <div className="p-8 rounded-xl bg-surface border border-border text-center max-w-md">
          <ShieldAlert className="h-12 w-12 text-danger mx-auto animate-bounce" />
          <h2 className="text-xl font-bold mt-4">Access Interrupted</h2>
          <p className="text-xs text-text-muted mt-2 font-mono">
            This module is restricted to institutional administrators. Unauthorized access attempts are monitored under HIPAA audit guidelines.
          </p>
        </div>
      </div>
    );
  }

  const activeStaffCount = staffList.filter(s => s.is_active).length;

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white pt-24 pb-16 px-6 sm:px-12 select-none">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col text-left">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              Clinical Control Center
            </h1>
            <p className="text-xs text-text-secondary font-mono uppercase mt-1">
              Admin Portal / {staff.institution_name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin/safety')}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1e1b4b] text-white border border-[#4338ca] font-semibold text-sm hover:bg-[#1e1b4b]/80 transition-all shadow-[0_0_12px_rgba(67,56,202,0.2)] focus:outline-none"
            >
              <ShieldCheck className="h-4.5 w-4.5 text-[#818cf8]" />
              <span>Safety Dashboard</span>
            </button>
            <button
              onClick={handleOpenAddModal}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0d9488] text-white font-semibold text-sm hover:bg-[#0d9488]/90 transition-all shadow-[0_0_12px_rgba(13,148,136,0.2)] focus:outline-none"
            >
              <Plus className="h-4.5 w-4.5" />
              <span>Add New Staff</span>
            </button>
          </div>

        </div>

        {/* Section 1: Overview Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="p-6 rounded-2xl bg-[#111827] border border-border/80 flex items-center gap-4 text-left">
            <div className="h-12 w-12 rounded-xl bg-[#0d9488]/10 border border-[#0d9488]/20 text-[#0d9488] flex items-center justify-center">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-text-muted font-mono uppercase tracking-wider">Institution ID</span>
              <span className="text-sm font-semibold mt-0.5">{staff.institution_code}</span>
              <span className="text-[10px] text-text-secondary mt-0.5">MediGuard Tenant Unit</span>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#111827] border border-border/80 flex items-center gap-4 text-left">
            <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
              <Users className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-text-muted font-mono uppercase tracking-wider">Staff Accounts</span>
              <span className="text-lg font-bold mt-0.5">
                {activeStaffCount} <span className="text-xs text-text-secondary font-normal">active / {staffList.length} total</span>
              </span>
              <span className="text-[10px] text-text-secondary mt-0.5">Quota Limit: 50 accounts</span>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#111827] border border-border/80 flex items-center gap-4 text-left">
            <div className="h-12 w-12 rounded-xl bg-accent/10 border border-accent/20 text-accent flex items-center justify-center">
              <Shield className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-text-muted font-mono uppercase tracking-wider">Active Sessions</span>
              <span className="text-lg font-bold mt-0.5">
                {staffList.filter(s => s.last_login_at && (new Date().getTime() - new Date(s.last_login_at).getTime()) < 8 * 3600000).length}
              </span>
              <span className="text-[10px] text-text-secondary mt-0.5">Verified JWT tokens (8hr shifts)</span>
            </div>
          </div>

        </div>

        {/* Section 2: Staff Management table */}
        <div className="p-6 rounded-2xl bg-[#111827] border border-border/80 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <h2 className="text-base font-bold text-left flex items-center gap-2">
              <Users className="h-5 w-5 text-[#0d9488]" />
              <span>Staff Account Directory</span>
            </h2>
            <button 
              onClick={loadData}
              title="Refresh lists"
              className="p-1.5 rounded-lg border border-border hover:bg-surface-raised transition-colors text-text-secondary"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          {isLoading ? (
            <div className="py-20 text-center text-text-muted text-sm font-mono animate-pulse">
              Querying institutional staff accounts...
            </div>
          ) : staffList.length === 0 ? (
            <div className="py-16 text-center text-text-muted text-sm font-mono">
              No staff accounts registered for this institution code.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-border/50 text-[10px] text-text-muted font-mono uppercase tracking-wider">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Specialization</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Last Login</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {staffList.map((member) => (
                    <tr key={member.id} className="hover:bg-background/25 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-text-primary">{member.full_name}</td>
                      <td className="py-3.5 px-4 font-mono text-xs text-text-secondary">{member.email}</td>
                      <td className="py-3.5 px-4 uppercase text-xs font-semibold text-[#0d9488]">{member.role}</td>
                      <td className="py-3.5 px-4 text-xs text-text-secondary">{member.specialization || 'General Practice'}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${
                          member.is_active 
                            ? 'bg-success/10 text-success border border-success/20' 
                            : 'bg-danger/10 text-danger border border-danger/20'
                        }`}>
                          {member.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-text-muted">
                        {member.last_login_at ? new Date(member.last_login_at).toLocaleString() : 'Never'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {member.id === staff.id ? (
                          <span className="text-[10px] text-text-muted italic px-3 py-1 bg-surface-raised rounded-md border border-border">Self</span>
                        ) : member.is_active ? (
                          <button
                            onClick={() => handleDeactivate(member.id, member.full_name)}
                            className="px-3 py-1 text-xs font-semibold text-danger bg-danger/10 border border-danger/20 hover:bg-danger/20 transition-all rounded-lg focus:outline-none"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivate(member.id, member.full_name)}
                            className="px-3 py-1 text-xs font-semibold text-success bg-success/10 border border-success/20 hover:bg-success/20 transition-all rounded-lg focus:outline-none"
                          >
                            Reactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 3: Auth Audit Log table */}
        <div className="p-6 rounded-2xl bg-[#111827] border border-border/80 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <h2 className="text-base font-bold text-left flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-accent" />
              <span>HIPAA Compliance Access Logs</span>
            </h2>
            <span className="text-[10px] text-text-muted font-mono uppercase">Last 50 events</span>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-text-muted text-sm font-mono animate-pulse">
              Retrieving institutional access audit trails...
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="py-10 text-center text-text-muted text-sm font-mono">
              No audit log entries recorded for this institution code.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto pr-1">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border/50 text-[10px] text-text-muted font-mono uppercase tracking-wider">
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">Clinician Email</th>
                    <th className="py-2.5 px-4">Action Event</th>
                    <th className="py-2.5 px-4">IP Address</th>
                    <th className="py-2.5 px-4">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 font-mono">
                  {auditLogs.map((log) => {
                    let actionColor = 'text-text-secondary';
                    let actionText = log.action;
                    let resultBadge = 'SUCCESS';
                    let resultColor = 'bg-success/15 text-success border border-success/30';
                    
                    if (log.action.includes('failed') || log.action.includes('inactive')) {
                      actionColor = 'text-danger';
                      resultBadge = log.failure_reason || 'UNAUTHORIZED';
                      resultColor = 'bg-danger/15 text-danger border border-danger/30';
                    } else if (log.action.includes('invalid')) {
                      actionColor = 'text-warning';
                      resultBadge = 'INVALID_CODE';
                      resultColor = 'bg-warning/15 text-warning border border-warning/30';
                    } else if (log.action === 'account_created') {
                      actionColor = 'text-primary';
                    } else if (log.action === 'logout') {
                      actionColor = 'text-text-muted';
                      resultBadge = 'REVOKED';
                      resultColor = 'bg-surface-raised text-text-secondary border border-border';
                    }

                    return (
                      <tr key={log.id} className="hover:bg-background/20 transition-colors">
                        <td className="py-2.5 px-4 text-text-muted">{new Date(log.created_at).toLocaleString()}</td>
                        <td className="py-2.5 px-4 text-text-secondary">{log.email || 'system-action'}</td>
                        <td className={`py-2.5 px-4 font-semibold uppercase ${actionColor}`}>{actionText}</td>
                        <td className="py-2.5 px-4 text-text-muted">{log.ip_address || 'localhost'}</td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold ${resultColor}`}>
                            {resultBadge}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-background/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#111827] border border-border shadow-2xl overflow-hidden relative">
            <div className="flex items-center justify-between p-6 border-b border-border/50">
              <h3 className="font-bold text-base text-left">Enroll New Clinical Staff</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-text-muted hover:bg-surface-raised transition-colors focus:outline-none"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {!createdKeyphrase ? (
              <form onSubmit={handleCreateStaffSubmit} className="p-6 flex flex-col gap-4 text-left">
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-secondary">Full Name (Required)</label>
                  <input
                    type="text"
                    required
                    disabled={isCreating}
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="Dr. Rajesh Kumar"
                    className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-text-primary text-sm focus:border-[#0d9488] focus:outline-none disabled:opacity-50"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-secondary">Clinical Email Address (Required)</label>
                  <input
                    type="email"
                    required
                    disabled={isCreating}
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    placeholder="rajesh.kumar@mediguard.ai"
                    className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-text-primary text-sm focus:border-[#0d9488] focus:outline-none disabled:opacity-50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-text-secondary">Role Profile</label>
                    <select
                      value={newStaffRole}
                      disabled={isCreating}
                      onChange={(e) => setNewStaffRole(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-text-primary text-sm focus:border-[#0d9488] focus:outline-none"
                    >
                      <option value="physician">Physician</option>
                      <option value="nurse">Nurse</option>
                      <option value="pharmacist">Pharmacist</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-text-secondary">Specialization</label>
                    <input
                      type="text"
                      disabled={isCreating}
                      value={newStaffSpecialization}
                      onChange={(e) => setNewStaffSpecialization(e.target.value)}
                      placeholder="e.g. Cardiology"
                      className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-text-primary text-sm focus:border-[#0d9488] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-secondary">Hospital Employee ID</label>
                  <input
                    type="text"
                    disabled={isCreating}
                    value={newStaffEmployeeId}
                    onChange={(e) => setNewStaffEmployeeId(e.target.value)}
                    placeholder="e.g. EMP-99823"
                    className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-text-primary text-sm focus:border-[#0d9488] focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5 mt-1 bg-background/50 border border-border/80 rounded-xl p-3.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-text-secondary">Generated Key Phrase</label>
                    <button
                      type="button"
                      onClick={generateTempKeyphrase}
                      className="text-[10px] font-mono text-[#0d9488] hover:underline"
                    >
                      Regenerate
                    </button>
                  </div>
                  <span className="font-mono text-xs font-bold select-all tracking-wider text-accent bg-background px-3 py-1.5 rounded-lg border border-border mt-1.5 block">
                    {newStaffKeyphrase}
                  </span>
                  <span className="text-[9px] text-text-muted leading-tight mt-1.5">
                    Temp phrase matches standard complexity rules (min 12 chars).
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full flex items-center justify-center gap-2 mt-4 px-6 py-3 rounded-xl bg-[#0d9488] text-white hover:bg-[#0d9488]/90 font-semibold text-sm shadow-[0_0_12px_rgba(13,148,136,0.2)] disabled:opacity-50 focus:outline-none"
                >
                  {isCreating ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <span>Add Staff Member</span>
                  )}
                </button>

              </form>
            ) : (
              <div className="p-6 flex flex-col gap-6 text-center">
                <div className="h-12 w-12 rounded-full bg-success/15 border border-success/30 text-success flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="font-bold text-lg">Staff Account Created</h4>
                  <p className="text-xs text-text-secondary leading-normal">
                    The account for <span className="font-semibold text-text-primary">{newStaffName}</span> has been enrolled. Provide them with this temporary keyphrase to log in:
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-background border border-border flex flex-col gap-2 relative">
                  <span className="font-mono text-base font-bold text-accent select-all tracking-widest block">
                    {createdKeyphrase}
                  </span>
                  <span className="text-[10px] text-warning leading-normal font-semibold">
                    ⚠️ Save this key phrase — it will not be shown again.
                  </span>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="w-full px-6 py-2.5 rounded-xl bg-surface border border-border text-text-primary hover:bg-surface-raised font-semibold text-sm focus:outline-none"
                >
                  Close panel
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
