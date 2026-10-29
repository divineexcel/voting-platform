'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Vote, Users, TrendingUp, LogOut, FileText, CheckCircle2,
  XCircle, Check, Loader2, ShieldAlert, ChevronRight,
  Info, ShieldCheck, RefreshCw, BarChart2, Shield, Lock
} from 'lucide-react';

export default function AdminPortal() {
  const router = useRouter();

  // Authentication & Session States
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Admin States
  const [adminActiveTab, setAdminActiveTab] = useState('results'); // 'results' | 'applications' | 'subadmins' | 'students'
  const [adminStats, setAdminStats] = useState({ registeredStudents: 0, totalVotesCast: 0, uniqueVoters: 0, participationRate: 0 });
  const [adminResults, setAdminResults] = useState([]);
  const [adminApplications, setAdminApplications] = useState([]);
  const [adminStudents, setAdminStudents] = useState([]);
  const [newSubadminForm, setNewSubadminForm] = useState({ email: '', username: '', password: '' });
  const [adminActionLoading, setAdminActionLoading] = useState(false);
  const [adminMessage, setAdminMessage] = useState({ type: '', text: '' });

  // Load user session on mount
  useEffect(() => {
    fetchSession();
  }, []);

  // Fetch session user
  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.user) {
        if (data.user.role === 'student') {
          // Redirect students back to the student portal
          router.push('/');
        } else {
          setUser(data.user);
          fetchAdminData();
        }
      } else {
        setUser(null);
      }
    } catch (e) {
      console.error('Failed to fetch session', e);
    } finally {
      setLoadingUser(false);
    }
  };

  // Admin dashboard fetchers
  const fetchAdminData = async () => {
    try {
      // Results & Stats
      const resRes = await fetch('/api/admin/results');
      const resData = await resRes.json();
      if (resData.stats) setAdminStats(resData.stats);
      if (resData.results) setAdminResults(resData.results);

      // Candidate Applications
      const appsRes = await fetch('/api/admin/candidates');
      const appsData = await appsRes.json();
      if (appsData.candidates) setAdminApplications(appsData.candidates);

      // Registered Students List
      const studentsRes = await fetch('/api/admin/students');
      const studentsData = await studentsRes.json();
      if (studentsData.students) setAdminStudents(studentsData.students);
    } catch (e) {
      console.error('Failed to load admin data', e);
    }
  };

  // LOGIN Handler (Admin specific restriction)
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      if (data.user.role === 'student') {
        // Log out immediately as student logged into admin portal
        await fetch('/api/auth/logout', { method: 'POST' });
        throw new Error('Unauthorized access: Student accounts are restricted from the Administrative Command Center.');
      }

      setUser(data.user);
      setLoginForm({ username: '', password: '' });
      fetchAdminData();
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthSubmitting(false);
    }
  };

  // LOGOUT Handler
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setAdminResults([]);
      setAdminApplications([]);
      router.push('/admin');
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  // ADMIN CREATE SUBADMIN Handler
  const handleCreateSubadmin = async (e) => {
    e.preventDefault();
    setAdminActionLoading(true);
    setAdminMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/admin/subadmins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSubadminForm)
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to create sub-admin');

      setAdminMessage({ type: 'success', text: data.message });
      setNewSubadminForm({ email: '', username: '', password: '' });
      fetchAdminData();
    } catch (err) {
      setAdminMessage({ type: 'error', text: err.message });
    } finally {
      setAdminActionLoading(false);
    }
  };

  // ADMIN REVIEW CANDIDATE Handler
  const handleReviewCandidate = async (applicationId, status) => {
    setAdminActionLoading(true);
    setAdminMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/admin/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: applicationId, status })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to review candidate');

      setAdminMessage({ type: 'success', text: data.message });
      fetchAdminData();
    } catch (err) {
      setAdminMessage({ type: 'error', text: err.message });
    } finally {
      setAdminActionLoading(false);
    }
  };

  // ADMIN DELETE STUDENT Handler
  const handleDeleteStudent = async (studentId) => {
    if (!confirm("Are you sure you want to permanently delete this student account? This will cascade and delete their votes and candidacy applications.")) {
      return;
    }

    setAdminActionLoading(true);
    setAdminMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/admin/students', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: studentId })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to delete student');

      setAdminMessage({ type: 'success', text: data.message });
      fetchAdminData();
    } catch (err) {
      setAdminMessage({ type: 'error', text: err.message });
    } finally {
      setAdminActionLoading(false);
    }
  };

  // Render Loader while fetching initial user session
  if (loadingUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#090d0b]">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
        <p className="text-emerald-600/70 font-semibold tracking-wider text-sm">Validating Security clearance...</p>
      </div>
    );
  }

  // ==================== ADMIN SECURE LOGIN SCREEN ====================
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-[#090d0b] relative overflow-hidden">
        {/* Glow grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b98103_1px,transparent_1px),linear-gradient(to_bottom,#10b98103_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-teal-500/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="w-full max-w-md bg-[#0f1713]/80 border border-emerald-950/60 rounded-3xl p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
          {/* Top subtle lock indicator */}
          <div className="flex justify-center mb-6">
            <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/20 rounded-2xl shadow-lg relative">
              <Lock className="w-7 h-7 text-emerald-400" />
              <Shield className="w-4 h-4 text-emerald-300 absolute -top-1 -right-1 animate-pulse" />
            </div>
          </div>

          <div className="text-center mb-8">
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-500/20 px-3 py-1 rounded-full uppercase tracking-widest">
              Administrative Control
            </span>
            <h1 className="text-2xl font-extrabold tracking-wider text-slate-100 mt-3">
              APEX<span className="text-emerald-400">VOTE</span>
            </h1>
            <p className="text-slate-400 text-xs mt-1.5 font-light leading-relaxed">
              Authorized access only. Enter administrative credentials to manage election parameters.
            </p>
          </div>

          {authError && (
            <div className="mb-5 p-4 rounded-2xl bg-red-950/40 border border-red-900/50 text-red-300 text-xs flex items-start gap-2">
              <XCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <span className="font-medium">{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Admin Username or Email</label>
              <input
                type="text"
                required
                placeholder="Username or email address"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                className="w-full px-4 py-3 bg-[#080c0a] border border-emerald-950 focus:border-emerald-500/40 rounded-2xl focus:outline-none text-slate-100 text-sm transition-all placeholder-slate-600 focus:ring-1 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Secure Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="w-full px-4 py-3 bg-[#080c0a] border border-emerald-950 focus:border-emerald-500/40 rounded-2xl focus:outline-none text-slate-100 text-sm transition-all placeholder-slate-600 focus:ring-1 focus:ring-emerald-500/20"
              />
            </div>

            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full mt-4 py-3.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-2xl font-bold shadow-lg shadow-emerald-900/10 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {authSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Decrypting credentials...</span>
                </>
              ) : (
                <span>Access Command Panel</span>
              )}
            </button>

            <div className="text-center mt-6 pt-4 border-t border-emerald-950/50">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="text-xs text-slate-400 hover:text-emerald-400 font-semibold transition-colors flex items-center justify-center gap-1 mx-auto"
              >
                Go to Student Voter Portal →
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ==================== DASHBOARD HEADER ====================
  const renderHeader = () => (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#0F5A47] rounded-xl shadow-sm">
            <Vote className="w-5 h-5 text-white" />
          </div>
          <span className="font-extrabold text-lg tracking-wider text-slate-800">
            APEX<span className="text-[#0F5A47]">VOTE</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-semibold text-gray-800">{user.name}</span>
            <span className="text-xs font-bold px-2 py-0.5 mt-0.5 rounded-full bg-[#e6f2ed] text-[#0F5A47] border border-[#0F5A47]/10 capitalize">
              {user.role === 'admin' ? 'Super Admin' : 'Admin Officer'}
            </span>
          </div>

          <div className="w-[1px] h-8 bg-gray-200 hidden md:block" />

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-200 hover:border-red-100 transition-all text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );

  // ==================== MAIN ADMIN CONTROL DASHBOARD ================
  return (
    <div className="min-h-screen flex flex-col bg-[#f3f6f5]">
      {renderHeader()}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Title & Navigation Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-800">
              Administrator <span className="text-[#0F5A47]">Panel</span>
            </h2>
            <p className="text-slate-500 text-sm mt-1">Audit, supervise, and control voting processes, sub-admins, and contestant credentials.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAdminData}
              className="p-2.5 border border-gray-200 hover:border-gray-300 text-gray-400 hover:text-gray-600 bg-white shadow-sm rounded-xl transition-all"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Admin Message Banner */}
        {adminMessage.text && (
          <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 border ${
            adminMessage.type === 'success' 
              ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
              : 'bg-red-50 border-red-100 text-red-700'
          }`}>
            {adminMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-red-500" />}
            <span className="text-sm font-semibold">{adminMessage.text}</span>
          </div>
        )}

        {/* Statistics Metric Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Registered Students', value: adminStats.registeredStudents, icon: Users },
            { label: 'Total Votes Cast', value: adminStats.totalVotesCast, icon: Vote },
            { label: 'Unique Voters', value: adminStats.uniqueVoters, icon: Users },
            { label: 'Participation Turnout', value: `${adminStats.participationRate}%`, icon: TrendingUp }
          ].map((stat, idx) => (
            <div key={idx} className="bg-white p-5 rounded-3xl border border-gray-100 flex flex-col justify-between shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</span>
                <div className="p-2 bg-[#e6f2ed] rounded-xl text-[#0F5A47] border border-[#0f5a47]/5">
                  <stat.icon className="w-4 h-4" />
                </div>
              </div>
              <span className="text-2xl lg:text-3xl font-extrabold text-slate-800 tracking-tight mt-4">{stat.value}</span>
            </div>
          ))}
        </div>

        {/* Inner Admin Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-gray-200/60 pb-4 mb-8">
          {[
            { id: 'results', label: 'Election Tallies & Stats', icon: BarChart2 },
            { id: 'students', label: 'Registered Students', icon: Users },
            { id: 'applications', label: 'Contestant Applications', icon: FileText, badge: adminApplications.filter(a => a.status === 'pending').length },
            { id: 'subadmins', label: 'Create Sub-Admin', icon: ShieldCheck, superOnly: true }
          ].map((tab) => {
            if (tab.superOnly && user.role !== 'admin') return null;

            const isActive = adminActiveTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setAdminActiveTab(tab.id); setAdminMessage({ type: '', text: '' }); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold tracking-wide transition-all ${
                  isActive 
                    ? 'bg-[#e6f2ed] text-[#0F5A47] border border-[#0f5a47]/20 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800 border border-transparent'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span className="ml-1 bg-[#0F5A47] text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Admin Tab Content Panel */}
        <div>
          {/* ==================== 1. RESULTS TAB ==================== */}
          {adminActiveTab === 'results' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-700">Live Election Results</h3>
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Updating Live
                </span>
              </div>

              {adminResults.length === 0 ? (
                <div className="bg-white p-10 text-center text-slate-400 border border-gray-100 rounded-3xl shadow-sm">
                  No positions seeded or votes cast yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {adminResults.map((result) => (
                    <div key={result.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                      <div className="flex items-start justify-between border-b border-gray-100 pb-4 mb-4">
                        <div>
                          <h4 className="font-extrabold text-slate-800 text-lg">{result.name}</h4>
                          <p className="text-slate-400 text-xs mt-0.5">{result.description}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-[#0F5A47] bg-[#e6f2ed] px-3 py-1.5 rounded-xl border border-[#0f5a47]/10">
                            {result.totalVotes} Total Votes
                          </span>
                        </div>
                      </div>

                      {result.candidates.length === 0 ? (
                        <p className="text-slate-400 text-xs italic text-center py-6">No approved candidates contesting for this role.</p>
                      ) : (
                        <div className="space-y-4">
                          {result.candidates.map((cand, idx) => {
                            const isLeading = idx === 0 && cand.vote_count > 0;

                            return (
                              <div key={cand.id} className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-800 font-bold">{cand.name}</span>
                                    <span className="text-[10px] text-slate-400 font-light">(@{cand.applicant_username})</span>
                                    {isLeading && (
                                      <span className="text-[10px] bg-amber-50 border border-amber-100 text-amber-700 px-1.5 py-0.5 rounded-lg font-bold">
                                        🏆 Leading
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-slate-500 font-semibold">{cand.vote_count} votes ({cand.percentage}%)</span>
                                </div>

                                <div className="w-full h-3 bg-gray-100 border border-gray-200/60 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      isLeading 
                                        ? 'bg-[#0F5A47]' 
                                        : 'bg-gray-300'
                                    }`}
                                    style={{ width: `${cand.percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== 3. CANDIDATE APPLICATIONS TAB ==================== */}
          {adminActiveTab === 'applications' && (
            <div className="space-y-6 animate-fadeIn">
              <h3 className="text-lg font-bold text-slate-700">Contestant Registry & Reviews</h3>

              <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                        <th className="px-6 py-3.5">Contestant Name</th>
                        <th className="px-6 py-3.5">Target Position</th>
                        <th className="px-6 py-3.5">Manifesto / Objectives</th>
                        <th className="px-6 py-3.5">Status</th>
                        <th className="px-6 py-3.5">Submission Date</th>
                        <th className="px-6 py-3.5 text-right">Review Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-slate-600 text-sm font-light">
                      {adminApplications.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-6 py-8 text-center text-slate-400">No candidacy applications submitted yet.</td>
                        </tr>
                      ) : (
                        adminApplications.map((app) => (
                          <tr key={app.id} className="hover:bg-gray-50/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-800 text-sm">{app.name}</div>
                              <div className="text-xs text-slate-400">@{app.applicant_username}</div>
                            </td>
                            <td className="px-6 py-4 font-bold text-xs text-slate-700">{app.position_name}</td>
                            <td className="px-6 py-4 text-xs font-light max-w-xs truncate italic text-slate-500" title={app.manifesto}>
                              "{app.manifesto}"
                            </td>
                            <td className="px-6 py-4">
                              {app.status === 'pending' && <span className="badge-pending px-2.5 py-0.5 rounded-lg text-xs font-semibold">Pending Review</span>}
                              {app.status === 'approved' && <span className="badge-approved px-2.5 py-0.5 rounded-lg text-xs font-semibold">Approved</span>}
                              {app.status === 'rejected' && <span className="badge-rejected px-2.5 py-0.5 rounded-lg text-xs font-semibold">Rejected</span>}
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-400">{new Date(app.created_at).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex gap-2 justify-end">
                                {app.status !== 'approved' && (
                                  <button
                                    onClick={() => handleReviewCandidate(app.id, 'approved')}
                                    className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100/50 rounded-lg transition-all"
                                  >
                                    Approve
                                  </button>
                                )}
                                {app.status !== 'rejected' && (
                                  <button
                                    onClick={() => handleReviewCandidate(app.id, 'rejected')}
                                    className="px-2.5 py-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 hover:bg-red-100/50 rounded-lg transition-all"
                                  >
                                    Reject
                                  </button>
                                )}
                                {app.status !== 'pending' && (
                                  <button
                                    onClick={() => handleReviewCandidate(app.id, 'pending')}
                                    className="px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 hover:bg-amber-100/50 rounded-lg transition-all"
                                  >
                                    Set Pending
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================== 3.5. STUDENTS TAB ==================== */}
          {adminActiveTab === 'students' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h4 className="font-bold text-slate-800 text-sm">Registered Student Details</h4>
                  <span className="text-xs font-semibold text-slate-500">Total: {adminStudents.length} registered students</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                        <th className="px-6 py-3.5">Account</th>
                        <th className="px-6 py-3.5">Username</th>
                        <th className="px-6 py-3.5">Email</th>
                        <th className="px-6 py-3.5">Registration Date</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-slate-600 text-sm font-light">
                      {adminStudents.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-8 text-center text-slate-400">No student accounts registered in the database.</td>
                        </tr>
                      ) : (
                        adminStudents.map((stud) => (
                          <tr key={stud.id} className="hover:bg-gray-50/30 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-800 text-sm">{stud.name}</td>
                            <td className="px-6 py-4 font-semibold text-xs text-slate-700">@{stud.username}</td>
                            <td className="px-6 py-4 text-xs text-slate-600">{stud.email || 'Not provided'}</td>
                            <td className="px-6 py-4 text-xs text-slate-400">{new Date(stud.created_at).toLocaleString()}</td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => handleDeleteStudent(stud.id)}
                                className="px-2.5 py-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 hover:bg-red-100/50 rounded-lg transition-all"
                              >
                                Delete Account
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================== 4. CREATE SUBADMIN TAB ==================== */}
          {adminActiveTab === 'subadmins' && user.role === 'admin' && (
            <div className="max-w-md mx-auto animate-fadeIn">
              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6 text-[#0F5A47]">
                  <ShieldCheck className="w-6 h-6" />
                  <h3 className="text-xl font-extrabold text-slate-800">Register Sub-Admin</h3>
                </div>

                <form onSubmit={handleCreateSubadmin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email</label>
                    <input
                      type="email"
                      required
                      placeholder="officer@example.com"
                      value={newSubadminForm.email}
                      onChange={(e) => setNewSubadminForm({ ...newSubadminForm, email: e.target.value })}
                      autoComplete="off"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#0F5A47] text-gray-800 text-sm transition-colors placeholder-gray-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Username</label>
                    <input
                      type="text"
                      required
                      placeholder="Choose unique username"
                      value={newSubadminForm.username}
                      onChange={(e) => setNewSubadminForm({ ...newSubadminForm, username: e.target.value })}
                      autoComplete="off"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#0F5A47] text-gray-800 text-sm transition-colors placeholder-gray-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
                    <input
                      type="password"
                      required
                      placeholder="At least 6 characters"
                      value={newSubadminForm.password}
                      onChange={(e) => setNewSubadminForm({ ...newSubadminForm, password: e.target.value })}
                      autoComplete="new-password"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#0F5A47] text-gray-800 text-sm transition-colors placeholder-gray-400"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={adminActionLoading}
                    className="w-full mt-4 py-3.5 px-4 bg-[#0F5A47] hover:bg-[#0a4133] text-white font-semibold rounded-2xl shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                  >
                    {adminActionLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Creating account...</span>
                      </>
                    ) : (
                      <span>Register Admin Officer</span>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
