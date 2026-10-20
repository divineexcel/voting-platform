"use client";
import { useEffect, useRef, useState } from "react";
import { api, useResource } from "./client";
import {
  Empty,
  ElectionBadge,
  Field,
  Notice,
  ResourceState,
  Tabs,
  dateTime,
} from "./ui";
import LiveResults from "./live-results";

function useConfirmationFocus(value) {
  const heading = useRef(null);
  useEffect(() => {
    if (!value) return;
    const previous = document.activeElement;
    heading.current?.focus();
    return () => {
      if (previous?.isConnected) previous.focus();
    };
  }, [value]);
  return heading;
}

export default function Admin({ user }) {
  const election = useResource("/api/admin/election");
  const [view, setView] = useState("results");
  const items = [
    ["results", "Live results"],
    ["election", "Election setup"],
    ["candidates", "Applications"],
    ["codes", "Registration codes"],
    ["students", "Students"],
  ];
  if (user.role === "admin")
    items.push(["staff", "Staff access"], ["audit", "Audit trail"]);
  return (
    <>
      <header className="page-heading">
        <div>
          <span className="eyebrow">ELECTION ADMINISTRATION</span>
          <h1>{election.data?.election.title || "Election workspace"}</h1>
          <p className="muted">
            Prepare carefully. Follow the count. Support every student.
          </p>
        </div>
        {election.data && <ElectionBadge election={election.data.election} />}
      </header>
      <Tabs
        label="Administration workspace"
        items={items}
        value={view}
        onChange={setView}
      />
      <Notice error>{election.error}</Notice>
      {view === "results" ? (
        <LiveResults />
      ) : view === "staff" ? (
        <Staff />
      ) : view === "audit" ? (
        <Audit />
      ) : view === "codes" ? (
        <Codes />
      ) : view === "students" ? (
        <Students />
      ) : (
        <ResourceState resource={election}>
          {election.data &&
            (view === "election" ? (
              <Election resource={election} user={user} />
            ) : (
              <Candidates election={election.data.election} />
            ))}
        </ResourceState>
      )}
    </>
  );
}
function DataTable({
  caption,
  columns,
  rows,
  render,
  empty = "No records yet.",
}) {
  const [page, setPage] = useState(0);
  const total = Math.max(1, Math.ceil(rows.length / 10)),
    current = Math.min(page, total - 1);
  if (!rows.length) return <Empty title={empty} />;
  return (
    <>
      <div
        className="table-scroll"
        role="region"
        aria-label={caption}
        tabIndex={0}
      >
        <table>
          <caption>{caption}</caption>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c} scope="col">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(current * 10, current * 10 + 10).map(render)}
          </tbody>
        </table>
      </div>
      {total > 1 && (
        <nav className="pagination" aria-label={`${caption} pages`}>
          <span>
            {rows.length} records · page {current + 1} of {total}
          </span>
          <div className="actions">
            <button
              className="button secondary compact"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
            >
              Previous
            </button>
            <button
              className="button secondary compact"
              disabled={current === total - 1}
              onClick={() => setPage(current + 1)}
            >
              Next
            </button>
          </div>
        </nav>
      )}
    </>
  );
}
function Candidates({ election }) {
  const resource = useResource("/api/admin/candidates");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [filter, setFilter] = useState("all");
  async function review(id, status) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api("/api/admin/candidates", {
        method: "POST",
        body: JSON.stringify({ id, status }),
      });
      setMessage(result.message);
      await resource.reload();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  const rows = (resource.data?.candidates || []).filter(
    (c) => filter === "all" || c.status === filter,
  );
  return (
    <section>
      <div className="section-heading">
        <div>
          <span className="eyebrow">BALLOT PREPARATION</span>
          <h2>Candidate applications</h2>
          <p className="muted">
            Review statements before voting opens. Candidate setup locks when
            the election opens.
          </p>
        </div>
        <Field
          as="select"
          label="Application status"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {["all", "pending", "approved", "rejected"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Field>
      </div>
      <Notice error>{error}</Notice>
      <Notice>{message}</Notice>
      <ResourceState resource={resource}>
        {resource.data && (
          <DataTable
            caption="Candidate applications"
            columns={["Candidate and office", "Statement", "Status", "Review"]}
            rows={rows}
            render={(c) => (
              <tr key={c.id}>
                <th scope="row">
                  {c.name}
                  <span className="table-detail">
                    {c.position_name} · @{c.applicant_username}
                    {!c.active && " · Inactive account"}
                  </span>
                </th>
                <td className="statement-cell">{c.manifesto}</td>
                <td>
                  <span className="badge">{c.status}</span>
                </td>
                <td>
                  {election.state !== "draft" ? (
                    "Setup locked"
                  ) : (
                    <div className="actions">
                      <button
                        className="button secondary compact"
                        aria-label={`Approve ${c.name} for ${c.position_name}`}
                        disabled={busy || !c.active || c.status === "approved"}
                        onClick={() => review(c.id, "approved")}
                      >
                        Approve
                      </button>
                      <button
                        className="button secondary compact"
                        aria-label={`Reject ${c.name} for ${c.position_name}`}
                        disabled={busy || c.status === "rejected"}
                        onClick={() => review(c.id, "rejected")}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            )}
          />
        )}
      </ResourceState>
    </section>
  );
}
function Codes() {
  const resource = useResource("/api/admin/codes");
  const [codes, setCodes] = useState([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  async function generate(event) {
    event.preventDefault();
    if (busy) return;
    const count = Number(new FormData(event.currentTarget).get("count"));
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api("/api/admin/codes", {
        method: "POST",
        body: JSON.stringify({ count }),
      });
      setCodes(result.codes);
      setMessage(result.message);
      await resource.reload();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setMessage("Codes copied. Distribute one code per eligible student.");
    } catch {
      setError(
        "Clipboard access was unavailable. Select and copy the codes below.",
      );
    }
  }
  return (
    <section>
      <div className="section-heading">
        <div>
          <span className="eyebrow">STUDENT ENROLLMENT</span>
          <h2>Registration codes</h2>
          <p className="muted">
            Issue one code per eligible student. Codes expire after seven days
            and can be used once.
          </p>
        </div>
      </div>
      <Notice error>{error}</Notice>
      <Notice>{message}</Notice>
      <form className="inline-form panel" onSubmit={generate}>
        <Field
          label="Number of codes"
          name="count"
          type="number"
          min={1}
          max={100}
          step={1}
          required
          defaultValue={1}
        />
        <button className="button" disabled={busy || codes.length > 0}>
          {busy ? "Generating…" : "Generate codes"}
        </button>
      </form>
      {codes.length > 0 && (
        <section className="panel code-reveal">
          <h3>Save these codes now</h3>
          <p>
            Full codes are shown only in this response. Keep them private. Save
            or copy this set before dismissing it.
          </p>
          <Field
            as="textarea"
            label="New registration codes"
            readOnly
            value={codes.join("\n")}
            rows={Math.min(10, codes.length + 1)}
            className="code-text"
          />
          <div className="actions">
            <button className="button" onClick={copy}>
              Copy codes
            </button>
            <button
              className="button secondary"
              onClick={() => {
                setCodes([]);
                setMessage(
                  "Full codes dismissed. Only masked suffixes remain in the register.",
                );
              }}
            >
              I saved these · dismiss
            </button>
          </div>
        </section>
      )}
      <ResourceState resource={resource}>
        {resource.data && (
          <DataTable
            caption="Issued code register — masked suffixes"
            columns={["Code suffix", "Status", "Expires", "Used by"]}
            rows={resource.data.codes}
            render={(c, i) => (
              <tr key={`${c.created_at}-${i}`}>
                <th scope="row">
                  <code>••••-{c.display_suffix}</code>
                </th>
                <td>
                  {c.consumed
                    ? "Used"
                    : c.expires_at <= Date.now()
                      ? "Expired"
                      : "Available"}
                </td>
                <td>{dateTime(c.expires_at)}</td>
                <td>{c.student_name || "—"}</td>
              </tr>
            )}
          />
        )}
      </ResourceState>
    </section>
  );
}
function Students() {
  const resource = useResource("/api/admin/students");
  const [search, setSearch] = useState(""),
    [confirm, setConfirm] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const confirmationHeading = useConfirmationFocus(confirm);
  async function deactivate() {
    if (busy || !confirm) return;
    setBusy(true);
    setError("");
    try {
      const result = await api("/api/admin/students", {
        method: "DELETE",
        body: JSON.stringify({ id: confirm.id }),
      });
      setMessage(result.message);
      setConfirm(null);
      await resource.reload();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  const rows = (resource.data?.students || []).filter((s) =>
    `${s.name} ${s.username}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <section>
      <div className="section-heading">
        <div>
          <span className="eyebrow">ENROLLMENT REGISTER</span>
          <h2>Students</h2>
          <p className="muted">
            Account controls never remove accepted ballots or reopen used codes.
          </p>
        </div>
        <Field
          label="Find a student"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <Notice error>{error}</Notice>
      <Notice>{message}</Notice>
      {confirm && (
        <section
          className="panel confirmation"
          aria-labelledby="deactivate-title"
        >
          <h3 id="deactivate-title" ref={confirmationHeading} tabIndex={-1}>
            Deactivate {confirm.name}?
          </h3>
          <p>
            This revokes sign-in access and active sessions. Accepted ballots,
            candidacy records and consumed codes will be preserved.
          </p>
          <div className="actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setConfirm(null)}
            >
              Cancel
            </button>
            <button
              className="button danger"
              disabled={busy}
              onClick={deactivate}
            >
              {busy ? "Deactivating…" : "Confirm deactivation"}
            </button>
          </div>
        </section>
      )}
      <ResourceState resource={resource}>
        {resource.data && (
          <DataTable
            caption="Registered student accounts"
            columns={["Student", "Username", "Access", "Registered", "Action"]}
            rows={rows}
            empty="No matching students"
            render={(s) => (
              <tr key={s.id}>
                <th scope="row">{s.name}</th>
                <td>{s.username}</td>
                <td>{s.active ? "Active" : "Deactivated"}</td>
                <td>{dateTime(s.created_at)}</td>
                <td>
                  <button
                    className="button secondary compact"
                    disabled={!s.active || busy}
                    aria-label={`Deactivate ${s.name}`}
                    onClick={() => {
                      setConfirm(s);
                      setError("");
                    }}
                  >
                    Deactivate
                  </button>
                </td>
              </tr>
            )}
          />
        )}
      </ResourceState>
    </section>
  );
}
function localDate(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
function Election({ resource, user }) {
  const election = resource.data.election;
  const [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(null),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const confirmationHeading = useConfirmationFocus(confirm);
  async function change(input) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api("/api/admin/election", {
        method: "POST",
        body: JSON.stringify(input),
      });
      setMessage("Election settings updated.");
      setConfirm(null);
      await resource.reload();
      return result;
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  function configure(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    change({
      action: "configure",
      title: values.title,
      opens_at: values.opens_at
        ? new Date(values.opens_at).toISOString()
        : null,
      closes_at: values.closes_at
        ? new Date(values.closes_at).toISOString()
        : null,
    });
  }
  return (
    <div className="two-column">
      <section className="panel">
        <span className="eyebrow">ELECTION LIFECYCLE</span>
        <h2>Election setup</h2>
        <Notice error>{error}</Notice>
        <Notice>{message}</Notice>
        <form onSubmit={configure}>
          <fieldset
            disabled={
              busy || user.role !== "admin" || election.status !== "draft"
            }
          >
            <legend className="visually-hidden">Election configuration</legend>
            <Field
              label="Election title"
              name="title"
              required
              minLength={3}
              maxLength={120}
              defaultValue={election.title}
            />
            <Field
              label="Opening time (optional)"
              type="datetime-local"
              name="opens_at"
              defaultValue={localDate(election.opens_at)}
              hint="Your browser’s local time. Leave empty to open immediately when activated."
            />
            <Field
              label="Closing time (optional)"
              type="datetime-local"
              name="closes_at"
              defaultValue={localDate(election.closes_at)}
              hint="Your browser’s local time. Without a closing time, an administrator must close voting."
            />
            <button className="button" disabled={busy}>
              Save setup
            </button>
          </fieldset>
        </form>
        {user.role !== "admin" && (
          <p className="small muted">
            Only the administrator can change the voting window.
          </p>
        )}
      </section>
      <section className="panel">
        <h2>Voting window</h2>
        <ElectionBadge election={election} />
        <dl className="detail-list">
          <div>
            <dt>Opens</dt>
            <dd>{dateTime(election.opens_at)}</dd>
          </div>
          <div>
            <dt>Closes</dt>
            <dd>{dateTime(election.closes_at)}</dd>
          </div>
        </dl>
        <p>
          Opening voting locks candidate approval and election setup. Closing
          voting cannot be undone through this application.
        </p>
        {user.role === "admin" && election.status !== "closed" && (
          <button
            className="button"
            disabled={busy}
            onClick={() =>
              setConfirm(election.status === "draft" ? "open" : "close")
            }
          >
            {election.status === "draft"
              ? "Activate voting window"
              : "Close voting"}
          </button>
        )}
        {confirm && (
          <section className="confirmation">
            <h3 ref={confirmationHeading} tabIndex={-1}>
              {confirm === "open"
                ? "Activate this election?"
                : "Close this election?"}
            </h3>
            <p>
              {confirm === "open"
                ? "Candidate setup will be locked. Voting starts at the configured opening time, or immediately if none is set."
                : "No further ballots will be accepted. Existing ballots are preserved. This cannot be reversed."}
            </p>
            <div className="actions">
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => setConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="button"
                disabled={busy}
                onClick={() => change({ action: confirm })}
              >
                {busy
                  ? "Saving…"
                  : confirm === "open"
                    ? "Confirm activation"
                    : "Confirm close"}
              </button>
            </div>
          </section>
        )}
      </section>
    </div>
  );
}
function Staff() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget,
      values = Object.fromEntries(new FormData(form));
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api("/api/admin/subadmins", {
        method: "POST",
        body: JSON.stringify(values),
      });
      form.reset();
      setMessage(result.message);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel narrow">
      <span className="eyebrow">DELEGATED ADMINISTRATION</span>
      <h2>Create election staff access</h2>
      <p className="muted">
        Staff can review applications, issue codes, manage student access and
        view results. Election activation, closing, staff creation and audit
        access remain administrator-only.
      </p>
      <Notice error>{error}</Notice>
      <Notice>{message}</Notice>
      <form onSubmit={submit}>
        <Field
          label="Staff name"
          name="name"
          required
          minLength={2}
          maxLength={100}
          autoComplete="name"
        />
        <Field
          label="Username"
          name="username"
          required
          minLength={3}
          maxLength={50}
          autoComplete="off"
        />
        <Field
          label="Initial password"
          name="password"
          type="password"
          required
          minLength={12}
          maxLength={128}
          autoComplete="new-password"
          hint="At least 12 characters. Share privately with the intended staff member."
        />
        <button className="button" disabled={busy}>
          {busy ? "Creating…" : "Create staff account"}
        </button>
      </form>
    </section>
  );
}
function Audit() {
  const resource = useResource("/api/admin/audit");
  return (
    <section>
      <div className="section-heading">
        <div>
          <span className="eyebrow">ADMINISTRATIVE HISTORY</span>
          <h2>Audit trail</h2>
          <p className="muted">
            The latest 100 administrative events. Ballot choices are excluded.
          </p>
        </div>
        <button
          className="button secondary"
          onClick={() => resource.reload().catch(() => {})}
          disabled={resource.loading}
        >
          Refresh
        </button>
      </div>
      <ResourceState resource={resource}>
        {resource.data && (
          <DataTable
            caption="Recent administrative events"
            columns={["Event", "Actor", "Record", "Time"]}
            rows={resource.data.events}
            render={(e) => (
              <tr key={e.id}>
                <th scope="row">{e.event.replaceAll("_", " ")}</th>
                <td>{e.actor || "System"}</td>
                <td>{e.target_id ?? "—"}</td>
                <td>{dateTime(e.created_at)}</td>
              </tr>
            )}
          />
        )}
      </ResourceState>
    </section>
  );
}
