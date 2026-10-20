"use client";
import { Children, useEffect, useId, useRef, useState } from "react";
import { Vote, LogOut, ArrowUpRight } from "lucide-react";
import { api, useResource } from "./client";

export function Brand() {
  return (
    <a className="brand" href="/" aria-label="ApexVote home">
      <span className="brand-mark">
        <Vote size={23} aria-hidden="true" />
      </span>
      <span>
        APEX<span className="brand-green">VOTE</span>
      </span>
    </a>
  );
}
export function Notice({ children, error = false }) {
  const content = Children.toArray(children).filter(
    (child) => typeof child !== "string" || child.trim().length > 0,
  );
  return content.length ? (
    <div
      className={`notice ${error ? "notice-error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {children}
    </div>
  ) : null;
}
export function Field({ label, hint, as: Tag = "input", children, ...props }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <Tag
        id={id}
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...props}
      >
        {children}
      </Tag>
      {hint && (
        <span className="hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
    </div>
  );
}
export function Empty({ title, children }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}
export function ResourceState({ resource, children }) {
  return (
    <>
      {resource.error && (
        <Notice error>
          {resource.error}{" "}
          {resource.data && "Displayed information may be out of date."}{" "}
          <button
            className="text-button"
            onClick={() => resource.reload().catch(() => {})}
          >
            Try again
          </button>
        </Notice>
      )}
      {!resource.data
        ? resource.loading && (
            <p role="status" className="loading">
              Loading…
            </p>
          )
        : children}
    </>
  );
}
export function Tabs({ items, value, onChange, label }) {
  return (
    <nav className="tabs" aria-label={label}>
      {items.map(([key, name]) => (
        <button
          type="button"
          key={key}
          aria-current={key === value ? "page" : undefined}
          className={key === value ? "active" : ""}
          onClick={() => onChange(key)}
        >
          {name}
        </button>
      ))}
    </nav>
  );
}
export function ElectionBadge({ election }) {
  const names = {
    draft: "Preparing election",
    scheduled: "Scheduled",
    open: "Voting open",
    closed: "Voting closed",
  };
  return (
    <span className={`badge state-${election.state}`}>
      <span className="status-dot" aria-hidden="true" />
      {names[election.state] || "Status unavailable"}
    </span>
  );
}
export function dateTime(value, seconds = false) {
  // SQLite CURRENT_TIMESTAMP is UTC but omits its zone suffix.
  const normalized =
    typeof value === "string" && /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(value)
      ? value.replace(" ", "T") + "Z"
      : value;
  return value
    ? new Date(normalized).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: seconds ? "medium" : "short",
      })
    : "Not set";
}

export function Portal({ admin = false, children }) {
  const session = useResource("/api/auth/me");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const user = session.data?.user;
  async function logout() {
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/logout", { method: "POST" });
      await session.reload();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  if (!session.data)
    return (
      <div className="auth-page">
        <Brand />
        <div className="panel auth-card">
          <ResourceState resource={session} />
        </div>
      </div>
    );
  if (!user) return <Auth admin={admin} onSuccess={() => session.reload()} />;
  const allowed = admin
    ? ["admin", "subadmin"].includes(user.role)
    : user.role === "student";
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <div className="account">
            <div>
              <strong>{user.name}</strong>
              <span className="hint">
                {user.role === "student"
                  ? "Student voter"
                  : user.role === "admin"
                    ? "Administrator"
                    : "Election staff"}
              </span>
            </div>
            <button
              className="button secondary compact"
              onClick={logout}
              disabled={busy}
            >
              <LogOut size={16} aria-hidden="true" />
              <span>{busy ? "Signing out…" : "Sign out"}</span>
            </button>
          </div>
        </div>
      </header>
      <main id="main" className="workspace">
        <Notice error>{error || session.error}</Notice>
        {allowed ? (
          children(user)
        ) : (
          <div className="panel">
            <h1>{admin ? "Student account" : "Staff account"}</h1>
            <p>
              Your account uses the {admin ? "student" : "administration"}{" "}
              portal.
            </p>
            <a className="button" href={admin ? "/" : "/admin"}>
              Open your portal <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </div>
        )}
      </main>
      <footer className="site-footer">
        <span>ApexVote · Student representation</span>
        <span>Individual choices are excluded from account history.</span>
      </footer>
    </>
  );
}
function Auth({ admin, onSuccess }) {
  const [register, setRegister] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const errorRef = useRef(null);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setBusy(true);
    setError("");
    try {
      await api(`/api/auth/${register ? "register" : "login"}`, {
        method: "POST",
        body: JSON.stringify(values),
      });
      form.reset();
      await onSuccess();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <Brand />
      <main className="auth-layout">
        <section className="auth-intro">
          <span className="eyebrow">
            {admin ? "ELECTION ADMINISTRATION" : "YOUR SCHOOL. YOUR VOICE."}
          </span>
          <h1>
            {admin ? (
              <>
                A clear view. <br />A fair election.
              </>
            ) : (
              <>
                Make your <br />
                voice count.
              </>
            )}
          </h1>
          <p>
            {admin
              ? "Prepare the ballot, support students and follow every accepted vote in one place."
              : "Meet the candidates. Make your choice. Follow the election as it happens."}
          </p>
          <div className="intro-rule" />
          <p className="small">
            Live candidate totals. Private individual choices.
          </p>
        </section>
        <section className="panel auth-card">
          <span className="eyebrow">
            {admin ? "STAFF ACCESS" : "STUDENT ACCESS"}
          </span>
          <h2>{register ? "Create your account" : "Welcome back"}</h2>
          <p className="muted">
            {register
              ? "Use the registration code provided by your school."
              : "Sign in to your election workspace."}
          </p>
          <form onSubmit={submit} aria-busy={busy}>
            {error && (
              <div ref={errorRef} tabIndex={-1}>
                <Notice error>{error}</Notice>
              </div>
            )}
            {register && (
              <>
                <Field
                  label="Full name"
                  name="name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={100}
                />
                <Field
                  label="Registration code"
                  name="code"
                  autoComplete="off"
                  spellCheck={false}
                  required
                  minLength={16}
                  maxLength={19}
                  placeholder="ABCD-EF12-3456-7890"
                />
              </>
            )}
            <Field
              label="Username"
              name="username"
              autoComplete="username"
              required
              minLength={3}
              maxLength={50}
              spellCheck={false}
            />
            <Field
              label="Password"
              name="password"
              type="password"
              autoComplete={register ? "new-password" : "current-password"}
              required
              minLength={register ? 12 : 1}
              maxLength={128}
              hint={
                register
                  ? "Use at least 12 characters. Spaces are allowed."
                  : undefined
              }
            />
            <button className="button full" disabled={busy}>
              {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
              <ArrowUpRight size={18} aria-hidden="true" />
            </button>
          </form>
          {!admin && (
            <p className="auth-switch">
              {register
                ? "Already registered?"
                : "Have a school registration code?"}{" "}
              <button
                className="text-button"
                disabled={busy}
                onClick={() => {
                  setRegister(!register);
                  setError("");
                }}
              >
                {register ? "Sign in" : "Create account"}
              </button>
            </p>
          )}
          <a className="portal-link" href={admin ? "/" : "/admin"}>
            {admin ? "Student portal" : "Staff portal"}{" "}
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </section>
      </main>
      <p className="auth-footnote">
        Need help signing in? Contact your school’s election administrator.
      </p>
    </div>
  );
}
