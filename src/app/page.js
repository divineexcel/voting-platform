'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Vote, LogOut, Key, CheckCircle2, 
  XCircle, Check, Loader2, ShieldAlert, AwardIcon, ChevronRight,
  Info, ShieldCheck, ChevronDown
} from 'lucide-react';

export default function Home() {
  const router = useRouter();

  // Authentication & Session States
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [authView, setAuthView] = useState('login'); // 'login' | 'register'
  
  // Auth Form Inputs
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ code: '', name: '', username: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Student States
  const [positions, setPositions] = useState([]);
  const [userVotes, setUserVotes] = useState({});
  const [studentApplications, setStudentApplications] = useState([]);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [expandedPositionId, setExpandedPositionId] = useState(null);
  const [candidateForm, setCandidateForm] = useState({ positionId: '', manifesto: '' });
  const [applyStep, setApplyStep] = useState(1); // 1: Requirements, 2: Form
  const [studentActionLoading, setStudentActionLoading] = useState(false);
  const [studentMessage, setStudentMessage] = useState({ type: '', text: '' });
  
  // Voting Confirmation Modal States
  const [voteConfirmation, setVoteConfirmation] = useState({ isOpen: false, position: null, candidate: null });

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
          setUser(data.user);
          fetchStudentData();
        } else {
          // Redirect administrators to the secure admin route
          router.push('/admin');
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

  // Student dashboard fetchers
  const fetchStudentData = async () => {
    try {
      // Fetch positions & approved contestants & user votes
      const posRes = await fetch('/api/positions');
      const posData = await posRes.json();
      if (posData.positions) setPositions(posData.positions);
      if (posData.userVotes) setUserVotes(posData.userVotes);

      // Fetch student candidacy application status
      const appRes = await fetch('/api/candidates/apply');
      const appData = await appRes.json();
      if (appData.applications) setStudentApplications(appData.applications);
    } catch (e) {
      console.error('Failed to load student data', e);
    }
  };

  // LOGIN Handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setAuthSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      setUser(data.user);
      setLoginForm({ username: '', password: '' });
      
      if (data.user.role === 'student') {
        fetchStudentData();
      } else {
        router.push('/admin');
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthSubmitting(false);
    }
  };

  // REGISTER Handler
  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setAuthSubmitting(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      
      setAuthSuccess('Account registered successfully! Logging in...');
      setTimeout(() => {
        setUser(data.user);
        setRegisterForm({ code: '', name: '', username: '', password: '' });
        fetchStudentData();
      }, 1500);
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
      setPositions([]);
      setUserVotes({});
      setStudentApplications([]);
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  // STUDENT VOTE Handler
  const confirmVote = (position, candidate) => {
    setVoteConfirmation({
      isOpen: true,
      position,
      candidate
    });
  };

  const handleCastVote = async () => {
    const { position, candidate } = voteConfirmation;
    if (!position || !candidate) return;

    setStudentActionLoading(true);
    setStudentMessage({ type: '', text: '' });
    setVoteConfirmation({ isOpen: false, position: null, candidate: null });

    try {
      const res = await fetch('/api/votes/cast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionId: position.id,
          candidateId: candidate.id
        })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to submit vote');

      setStudentMessage({ type: 'success', text: `Vote cast successfully for ${candidate.name}!` });
      fetchStudentData();
    } catch (err) {
      setStudentMessage({ type: 'error', text: err.message });
    } finally {
      setStudentActionLoading(false);
    }
  };

  // STUDENT CANDIDACY APPLICATION Handler
  const handleApplyCandidacy = async (e) => {
    e.preventDefault();
    if (!candidateForm.positionId || !candidateForm.manifesto) {
      setStudentMessage({ type: 'error', text: 'Please select a position and enter your manifesto' });
      return;
    }

    setStudentActionLoading(true);
    setStudentMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/candidates/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionId: parseInt(candidateForm.positionId, 10),
          manifesto: candidateForm.manifesto
        })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to submit candidacy application');

      setStudentMessage({ type: 'success', text: data.message });
      setCandidateForm({ positionId: '', manifesto: '' });
      setApplyStep(1);
      fetchStudentData();
    } catch (err) {
      setStudentMessage({ type: 'error', text: err.message });
    } finally {
      setStudentActionLoading(false);
    }
  };

  // Render Loader while fetching initial user session
  if (loadingUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f3f6f5]">
        <Loader2 className="w-12 h-12 text-[#0F5A47] animate-spin mb-4" />
        <p className="text-slate-500 font-semibold tracking-wide">Loading ApexVote...</p>
      </div>
    );
  }

  // ==================== AUTH SCREEN ====================
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-[#f3f6f5] relative overflow-hidden">
        {/* Decorative background glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 bg-[#0F5A47]/10 rounded-full blur-3xl animate-pulse-slow pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 w-60 h-60 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-gray-100 shadow-xl relative overflow-hidden">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="p-3.5 bg-[#0F5A47] rounded-2xl shadow-lg shadow-emerald-900/20 animate-float">
              <Vote className="w-8 h-8 text-white" />
            </div>
          </div>

          <div className="text-center mb-8">
            <span className="text-[10px] font-bold text-[#0F5A47] bg-[#e6f2ed] border border-[#0f5a47]/10 px-3 py-1 rounded-full uppercase tracking-widest">
              Voter Portal
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 mb-2 mt-3">
              APEX<span className="text-[#0F5A47]">VOTE</span>
            </h1>
            <p className="text-slate-500 text-sm font-light leading-relaxed">
              {authView === 'login' 
                ? 'Welcome, Student! Log in to view positions and cast your ballot.' 
                : 'Sign up using your student registration code.'}
            </p>
          </div>

          {authError && (
            <div className="mb-5 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-xs flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span className="font-medium">{authError}</span>
            </div>
          )}

          {authSuccess && (
            <div className="mb-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-medium">{authSuccess}</span>
            </div>
          )}

          {authView === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Username</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. john.doe"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#0F5A47] focus:ring-1 focus:ring-[#0F5A47] text-gray-800 text-sm transition-colors placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#0F5A47] focus:ring-1 focus:ring-[#0F5A47] text-gray-800 text-sm transition-colors placeholder-gray-400"
                />
              </div>

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full mt-4 py-3.5 px-4 bg-[#0F5A47] hover:bg-[#0a4133] text-white rounded-2xl font-semibold shadow-lg shadow-emerald-950/10 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {authSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Logging in...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>

              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => { setAuthView('register'); setAuthError(''); }}
                  className="text-xs text-[#0F5A47] hover:text-[#0a4133] font-semibold transition-colors"
                >
                  Have a voter code? Register here
                </button>
              </div>

              <div className="text-center mt-6 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => router.push('/admin')}
                  className="text-xs text-slate-500 hover:text-[#0F5A47] font-semibold transition-colors flex items-center justify-center gap-1.5 mx-auto"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Are you an administrator? Secure Admin Portal →
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Registration Code</label>
                <div className="relative">
                  <Key className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="6-character code (e.g. AB8C9D)"
                    value={registerForm.code}
                    onChange={(e) => setRegisterForm({ ...registerForm, code: e.target.value.toUpperCase() })}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#0F5A47] focus:ring-1 focus:ring-[#0F5A47] text-gray-800 text-sm transition-colors uppercase tracking-wider placeholder-gray-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#0F5A47] focus:ring-1 focus:ring-[#0F5A47] text-gray-800 text-sm transition-colors placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Username</label>
                <input
                  type="text"
                  required
                  placeholder="Choose username"
                  value={registerForm.username}
                  onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#0F5A47] focus:ring-1 focus:ring-[#0F5A47] text-gray-800 text-sm transition-colors placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#0F5A47] focus:ring-1 focus:ring-[#0F5A47] text-gray-800 text-sm transition-colors placeholder-gray-400"
                />
              </div>

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full mt-4 py-3.5 px-4 bg-[#0F5A47] hover:bg-[#0a4133] text-white rounded-2xl font-semibold shadow-lg shadow-emerald-950/10 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {authSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Registering...</span>
                  </>
                ) : (
                  <span>Register & Sign In</span>
                )}
              </button>

              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => { setAuthView('login'); setAuthError(''); }}
                  className="text-xs text-[#0F5A47] hover:text-[#0a4133] font-semibold transition-colors"
                >
                  Already have an account? Sign In
                </button>
              </div>
            </form>
          )}
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
              Student Voter
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

  // ==================== STUDENT DASHBOARD ====================
  return (
    <div className="min-h-screen flex flex-col bg-[#f3f6f5]">
      {renderHeader()}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner Card */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm mb-8 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#e6f2ed]/50 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
          
          <div className="relative z-10 max-w-xl">
            <span className="text-xs font-bold text-[#0F5A47] uppercase tracking-wider bg-[#e6f2ed] px-3 py-1 rounded-full border border-[#0f5a47]/10">
              Voter Portal
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-800 mt-3">
              Welcome, <span className="text-[#0F5A47]">{user.name}</span>
            </h2>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed font-light">
              Exercise your democratic right: cast your secure ballot in active elections, or apply for school leadership positions this term.
            </p>
            
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => { setSelectedPosition(null); setStudentMessage({ type: '', text: '' }); }}
                className={`px-5 py-2.5 rounded-2xl text-xs font-bold tracking-wide transition-all shadow-sm ${
                  !selectedPosition 
                    ? 'bg-[#0F5A47] text-white' 
                    : 'bg-[#e6f2ed] text-[#0F5A47] hover:bg-[#d5e9e0]'
                }`}
              >
                Vote for Candidates
              </button>
              <button
                onClick={() => { setSelectedPosition('apply'); setStudentMessage({ type: '', text: '' }); }}
                className={`px-5 py-2.5 rounded-2xl text-xs font-bold tracking-wide transition-all shadow-sm ${
                  selectedPosition === 'apply' 
                    ? 'bg-[#0F5A47] text-white' 
                    : 'bg-[#e6f2ed] text-[#0F5A47] hover:bg-[#d5e9e0]'
                }`}
              >
                Apply for Candidacy
              </button>
            </div>
          </div>

          {/* SVG ballot box illustration */}
          <div className="relative w-40 h-40 shrink-0 md:mr-4 hidden sm:block">
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
              <circle cx="100" cy="100" r="90" fill="#e6f2ed" />
              <path d="M50 90 L150 90 L160 160 L40 160 Z" fill="#ffffff" stroke="#0F5A47" strokeWidth="4" strokeLinejoin="round" />
              <path d="M40 80 L160 80 L150 90 L50 90 Z" fill="#0F5A47" stroke="#0F5A47" strokeWidth="4" strokeLinejoin="round" />
              <path d="M80 90 L120 90 L125 160 L75 160 Z" fill="#10b981" opacity="0.1" />
              <rect x="85" y="82" width="30" height="4" rx="2" fill="#ffffff" />
              <g transform="translate(85, 45) rotate(-15)">
                <rect width="36" height="24" rx="2" fill="#ffffff" stroke="#0F5A47" strokeWidth="3" />
                <path d="M2 2 L18 14 L34 2" stroke="#0F5A47" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 22 L12 14 M34 22 L24 14" stroke="#0F5A47" strokeWidth="2" strokeLinecap="round" />
              </g>
            </svg>
          </div>
        </div>

        {/* Messages */}
        {studentMessage.text && (
          <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 border ${
            studentMessage.type === 'success' 
              ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
              : 'bg-red-50 border-red-100 text-red-700'
          }`}>
            {studentMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-red-500" />}
            <span className="text-sm font-semibold">{studentMessage.text}</span>
          </div>
        )}

        {/* Tab Content */}
        {!selectedPosition ? (
          // ==================== VOTE SECTION ====================
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
              <AwardIcon className="w-5 h-5 text-[#0F5A47]" />
              Available Positions
            </h3>

            {positions.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center text-slate-400 border border-gray-100 shadow-sm">
                No leadership positions are available for voting at this time.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {positions.map((pos) => {
                  const hasVotedForPosition = userVotes[pos.id] !== undefined;
                  const votedCandidateId = userVotes[pos.id];

                  return (
                    <div key={pos.id} className="bg-white rounded-3xl p-6 flex flex-col justify-between border border-gray-100 shadow-sm relative overflow-hidden">
                      {/* Vote Badge */}
                      {hasVotedForPosition && (
                        <div className="absolute top-0 right-0 bg-emerald-50 border-l border-b border-emerald-100 text-emerald-700 px-3.5 py-1.5 text-xs font-bold rounded-bl-2xl flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          Vote Submitted
                        </div>
                      )}

                      <div>
                        <h4 className="text-xl font-extrabold text-slate-800 tracking-tight mb-2 pr-20">{pos.name}</h4>
                        <p className="text-slate-500 text-sm font-light mb-6 leading-relaxed">{pos.description}</p>
                      </div>

                      {/* Candidates Expansion Button */}
                      <div>
                        <button
                          onClick={() => setExpandedPositionId(expandedPositionId === pos.id ? null : pos.id)}
                          className="w-full flex items-center justify-between py-2.5 px-4 rounded-2xl border border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 text-sm font-bold transition-all text-[#0F5A47]"
                        >
                          <span>{hasVotedForPosition ? 'View Candidates' : `Choose Candidate (${pos.candidates.length})`}</span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${expandedPositionId === pos.id ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Candidates List Inside Accordion */}
                        {expandedPositionId === pos.id && (
                          <div className="mt-4 pt-4 border-t border-gray-100 space-y-4 animate-fadeIn">
                            {pos.candidates.length === 0 ? (
                              <p className="text-slate-400 text-xs text-center py-4">No approved contestants running for this position.</p>
                            ) : (
                              pos.candidates.map((cand) => {
                                const isVoted = votedCandidateId === cand.id;
                                const isLocked = hasVotedForPosition && !isVoted;

                                return (
                                  <div 
                                    key={cand.id} 
                                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                                      isVoted 
                                        ? 'bg-emerald-50/30 border-emerald-100' 
                                        : isLocked 
                                        ? 'opacity-40 border-gray-100 bg-gray-50 pointer-events-none'
                                        : 'bg-gray-50/50 border-gray-100 hover:border-gray-200'
                                    }`}
                                  >
                                    <div className="flex items-start gap-3">
                                      <div className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center font-extrabold text-sm shadow-sm ${
                                        isVoted 
                                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                          : 'bg-[#e6f2ed] text-[#0F5A47] border border-[#0f5a47]/10'
                                      }`}>
                                        {cand.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                      </div>
                                      <div>
                                        <h5 className="font-bold text-slate-800 text-sm">{cand.name}</h5>
                                        <p className="text-slate-500 text-xs mt-1 italic leading-relaxed">"{cand.manifesto}"</p>
                                      </div>
                                    </div>

                                    <div className="shrink-0 flex items-center">
                                      {isVoted ? (
                                        <span className="text-emerald-700 text-xs font-bold px-2.5 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-1.5">
                                          <Check className="w-3.5 h-3.5" />
                                          My Choice
                                        </span>
                                      ) : isLocked ? (
                                        <span className="text-slate-400 text-xs font-light px-2.5 py-1.5 bg-gray-100 rounded-xl">
                                          Deactivated
                                        </span>
                                      ) : (
                                        <button
                                          onClick={() => confirmVote(pos, cand)}
                                          className="w-full sm:w-auto px-4 py-2 bg-[#0F5A47] hover:bg-[#0a4133] text-white rounded-xl text-xs font-bold transition-all active:scale-[0.97]"
                                        >
                                          Vote &gt;
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          // ==================== CONTESTANT APPLICATION SECTION ====================
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Application Form Card */}
            {applyStep === 1 ? (
              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-[#e6f2ed] rounded-2xl border border-[#0f5a47]/10 text-[#0F5A47]">
                    <Info className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-800">Candidacy Requirements</h3>
                </div>

                <p className="text-slate-500 text-sm leading-relaxed mb-6 font-light">
                  To be eligible to run for leadership roles in the school, you must fulfill the academic and behavioral guidelines outlined by the board:
                </p>

                <ul className="space-y-4 mb-8">
                  {[
                    'Must maintain an overall academic grade point average (GPA) above 65%.',
                    'Must have zero active disciplinary suspensions or behavior notes.',
                    'Must be recommended by at least one subject teacher or class advisor.',
                    'Must maintain an exemplary attendance record of 90% or above this term.'
                  ].map((req, idx) => (
                    <li key={idx} className="flex gap-3 text-sm text-slate-600">
                      <CheckCircle2 className="w-5 h-5 text-[#0F5A47] shrink-0 mt-0.5" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => setApplyStep(2)}
                  className="w-full py-3.5 px-4 bg-[#0F5A47] hover:bg-[#0a4133] text-white font-semibold rounded-2xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <span>Proceed to Application</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-extrabold text-slate-800">Submit Application</h3>
                  <button
                    onClick={() => setApplyStep(1)}
                    className="text-xs text-[#0F5A47] hover:text-[#0a4133] font-bold"
                  >
                    Back to Requirements
                  </button>
                </div>

                <form onSubmit={handleApplyCandidacy} className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Target Position</label>
                    <select
                      required
                      value={candidateForm.positionId}
                      onChange={(e) => setCandidateForm({ ...candidateForm, positionId: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#0F5A47] focus:ring-1 focus:ring-[#0F5A47] text-gray-800 text-sm transition-colors"
                    >
                      <option value="" disabled className="bg-white text-gray-400">Select a role</option>
                      {positions.map(pos => (
                        <option key={pos.id} value={pos.id} className="bg-white text-gray-800">{pos.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">My Manifesto / Statement of Intent</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="State why you are running and what changes you plan to bring..."
                      value={candidateForm.manifesto}
                      onChange={(e) => setCandidateForm({ ...candidateForm, manifesto: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#0F5A47] focus:ring-1 focus:ring-[#0F5A47] text-gray-800 text-sm transition-colors placeholder-gray-400 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={studentActionLoading}
                    className="w-full py-3.5 px-4 bg-[#0F5A47] hover:bg-[#0a4133] text-white font-semibold rounded-2xl shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                  >
                    {studentActionLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <span>Submit Application</span>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Status Dashboard Card */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6">My Candidacy History</h3>

              {studentApplications.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-6">You have not submitted any applications for this election cycle.</p>
              ) : (
                <div className="space-y-4">
                  {studentApplications.map((app) => (
                    <div key={app.id} className="p-4 bg-gray-50/50 border border-gray-100 rounded-2xl flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-800 text-sm">{app.position_name}</h4>
                        <p className="text-xs text-slate-500 font-light leading-relaxed">"{app.manifesto}"</p>
                        <p className="text-[10px] text-slate-400 pt-1">Applied: {new Date(app.created_at).toLocaleDateString()}</p>
                      </div>

                      <div>
                        {app.status === 'pending' && (
                          <span className="badge-pending px-2.5 py-1 text-[11px] font-semibold rounded-lg shrink-0">
                            Pending Admin
                          </span>
                        )}
                        {app.status === 'approved' && (
                          <span className="badge-approved px-2.5 py-1 text-[11px] font-semibold rounded-lg shrink-0 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Approved
                          </span>
                        )}
                        {app.status === 'rejected' && (
                          <span className="badge-rejected px-2.5 py-1 text-[11px] font-semibold rounded-lg shrink-0">
                            Rejected
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Voting confirmation Modal */}
      {voteConfirmation.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white border border-gray-100 rounded-3xl p-6 shadow-2xl relative animate-scaleIn">
            <div className="flex items-center gap-3 mb-4 text-amber-500">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h4 className="text-lg font-bold text-slate-800">Confirm Your Vote</h4>
            </div>

            <p className="text-slate-500 text-sm leading-relaxed font-light mb-6">
              You are about to vote for <span className="font-semibold text-slate-800">{voteConfirmation.candidate?.name}</span> for the position of <span className="font-semibold text-slate-800">{voteConfirmation.position?.name}</span>. 
              <br/><br/>
              Once confirmed, <span className="font-semibold text-red-600">you cannot change this vote</span> and all other contestants for this position will be locked.
            </p>

            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setVoteConfirmation({ isOpen: false, position: null, candidate: null })}
                className="px-4 py-2 border border-gray-200 hover:border-gray-300 text-slate-500 hover:text-slate-700 text-xs font-semibold rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCastVote}
                className="px-4 py-2 bg-[#0F5A47] hover:bg-[#0a4133] text-white text-xs font-semibold rounded-xl shadow-md transition-all"
              >
                Confirm Choice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
