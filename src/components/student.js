"use client";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ArrowRight, ShieldCheck } from "lucide-react";
import { acceptanceFor } from "@/lib/client-state";
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

export default function Student({ user }) {
  const ballot = useResource("/api/positions");
  const [view, setView] = useState("ballot");
  const election = ballot.data?.election;
  const accepted = ballot.data?.acceptedPositions || [];
  return (
    <>
      <header className="page-heading">
        <div>
          <p className="muted greeting">Welcome, {user.name}</p>
          <h1>{election?.title || "Your election workspace"}</h1>
          {election && (
            <div className="context-line">
              <ElectionBadge election={election} />
              {election.closes_at && (
                <span>Closes {dateTime(election.closes_at)}</span>
              )}
              {election.state === "scheduled" && (
                <span>Opens {dateTime(election.opens_at)}</span>
              )}
            </div>
          )}
        </div>
        {ballot.data && (
          <aside className="participation">
            <h2>Your participation</h2>
            <div>
              <span>Offices submitted</span>
              <strong>
                {accepted.length} of {ballot.data.positions.length}
              </strong>
            </div>
            <progress
              value={accepted.length}
              max={ballot.data.positions.length || 1}
              aria-label="Offices submitted"
            />
          </aside>
        )}
      </header>
      <Tabs
        label="Student workspace"
        value={view}
        onChange={(next) => {
          setView(next);
          ballot.reload().catch(() => {});
        }}
        items={[
          ["ballot", "Voting ballot"],
          ["results", "Live results"],
          ["candidacy", "My candidacy"],
        ]}
      />
      {view === "results" ? (
        <LiveResults />
      ) : (
        <ResourceState resource={ballot}>
          {ballot.data &&
            (view === "ballot" ? (
              <Ballot resource={ballot} userId={user.id} />
            ) : (
              <Candidacy
                positions={ballot.data.positions}
                election={election}
              />
            ))}
        </ResourceState>
      )}
    </>
  );
}
function Ballot({ resource, userId }) {
  const { positions, acceptedPositions, election } = resource.data;
  const pendingKey = `apexvote:pending-office:${userId}`;
  const [restoredOffice] = useState(() => {
    try {
      const id = Number(sessionStorage.getItem(pendingKey));
      if (positions.some((p) => p.id === id) && !acceptedPositions.includes(id))
        return id;
      sessionStorage.removeItem(pendingKey);
    } catch {}
    return null;
  });
  const [officeId, setOfficeId] = useState(restoredOffice),
    [selection, setSelection] = useState(null),
    [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(Boolean(restoredOffice)),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const [acknowledged, setAcknowledged] = useState([]),
    [attemptVersions, setAttemptVersions] = useState({});
  function markPending(id) {
    try {
      sessionStorage.setItem(pendingKey, String(id));
    } catch {
      /* Session storage may be unavailable; the in-memory recovery remains active. */
    }
  }
  function clearPending() {
    try {
      sessionStorage.removeItem(pendingKey);
    } catch {}
  }
  const reviewHeading = useRef(null),
    reviewButton = useRef(null),
    statusHeading = useRef(null);
  const office = positions.find((p) => p.id === officeId) || positions[0];
  const candidate = office?.candidates.find((c) => c.id === selection);
  const accepted =
    office &&
    (acceptanceFor(resource.data, office.id) ||
      acknowledged.includes(office.id));
  useEffect(() => {
    if (review) reviewHeading.current?.focus();
  }, [review]);
  useEffect(() => {
    if (accepted) {
      setSelection(null);
      setReview(false);
      setUncertain(false);
    }
  }, [accepted]);
  function chooseOffice(id) {
    setOfficeId(id);
    setSelection(null);
    setReview(false);
    setMessage("");
    setError("");
  }
  function changeChoice() {
    setReview(false);
    requestAnimationFrame(() => reviewButton.current?.focus());
  }
  async function reconcile() {
    setBusy(true);
    setError("");
    try {
      const status = await api("/api/votes/reconcile", {
        method: "POST",
        body: JSON.stringify({ positionId: office.id }),
      });
      if (status.accepted) {
        clearPending();
        setAcknowledged((ids) => [...ids, office.id]);
        setUncertain(false);
        setSelection(null);
        setReview(false);
        setMessage(
          "Your ballot for this office was accepted. Your choice is not included in your account history.",
        );
      } else {
        // The server revoked all previous generations, including a POST still travelling over the network.
        clearPending();
        setAttemptVersions((old) => ({
          ...old,
          [office.id]: status.attemptVersion,
        }));
        setUncertain(false);
        setSelection(null);
        setReview(false);
        setMessage(
          "No ballot was accepted for this office. The earlier submission is cancelled. You can safely select again.",
        );
      }
      resource.reload().catch(() => {});
    } catch (error) {
      setUncertain(true);
      setError(`We could not confirm acceptance. ${error.message}`);
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    if (busy || !candidate || accepted) return;
    setBusy(true);
    setError("");
    markPending(office.id);
    try {
      await api("/api/votes/cast", {
        method: "POST",
        body: JSON.stringify({
          positionId: office.id,
          candidateId: candidate.id,
          attemptVersion:
            attemptVersions[office.id] ??
            resource.data.attemptVersions?.[office.id] ??
            0,
        }),
      });
      // Explicit acknowledgement is sufficient, even if the following refresh fails.
      clearPending();
      setAcknowledged((ids) => [...ids, office.id]);
      setMessage(
        "Your ballot was accepted. Your choice is not included in your account history.",
      );
      setSelection(null);
      setReview(false);
      setUncertain(false);
      // Refresh failure does not undo an explicit acceptance acknowledgement.
      resource.reload().catch(() => {});
      requestAnimationFrame(() => statusHeading.current?.focus());
    } catch (error) {
      if (error.status && error.status < 500) {
        clearPending();
        setError(error.message);
        setUncertain(false);
        resource.reload().catch(() => {});
      } else {
        setUncertain(true);
        setError(
          "The submission outcome needs checking. Keep this page open; do not choose a different candidate.",
        );
      }
    } finally {
      setBusy(false);
    }
  }
  if (!office)
    return (
      <Empty title="No offices available">
        Your administrator has not prepared the ballot.
      </Empty>
    );
  return (
    <div className="ballot-layout">
      <aside className="office-nav">
        <h2>Offices</h2>
        <nav aria-label="Choose an office">
          {positions.map((position) => (
            <button
              key={position.id}
              aria-current={position.id === office.id ? "page" : undefined}
              disabled={busy || uncertain}
              onClick={() => chooseOffice(position.id)}
            >
              <span>{position.name}</span>
              {acceptedPositions.includes(position.id) && (
                <CheckCircle2 size={17} aria-label="Submitted" />
              )}
            </button>
          ))}
        </nav>
        <p className="small">One accepted selection per office.</p>
      </aside>
      <section className="ballot-content">
        <Notice>{message}</Notice>
        <Notice error>{error}</Notice>
        <div className="panel ballot-panel">
          <div className="office-heading">
            <div>
              <span className="eyebrow">YOUR BALLOT</span>
              <h2>{office.name}</h2>
            </div>
            <span className="office-number">
              {positions.indexOf(office) + 1} / {positions.length}
            </span>
          </div>
          <p className="muted">{office.description}</p>
          {accepted ? (
            <div className="accepted-state">
              <CheckCircle2 size={32} aria-hidden="true" />
              <h3 tabIndex={-1} ref={statusHeading}>
                Ballot accepted
              </h3>
              <p>
                Your participation is recorded for this office. Your chosen
                candidate is not shown in account history.
              </p>
            </div>
          ) : uncertain ? (
            <div className="recovery">
              <h3>Confirming your submission</h3>
              <p>
                A slow connection can interrupt the acknowledgement. Checking
                status confirms acceptance or cancels the earlier attempt before
                allowing a new selection. Retrying the same submission can only
                accept one ballot.
              </p>
              <div className="actions">
                <button className="button" disabled={busy} onClick={reconcile}>
                  {busy ? "Checking…" : "Check acceptance status"}
                </button>
                {candidate && (
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={submit}
                  >
                    Retry same submission
                  </button>
                )}
              </div>
            </div>
          ) : election.state !== "open" ? (
            <Empty
              title={
                election.state === "draft"
                  ? "Voting has not opened"
                  : election.state === "scheduled"
                    ? "Voting is scheduled"
                    : "Voting is closed"
              }
            >
              {election.state === "scheduled"
                ? `Opens ${dateTime(election.opens_at)}.`
                : "Your administrator controls the voting window."}
            </Empty>
          ) : !office.candidates.length ? (
            <Empty title="No approved candidates">
              There is no ballot to submit for this office.
            </Empty>
          ) : review && candidate ? (
            <section className="review" aria-labelledby="review-title">
              <span className="eyebrow">BEFORE YOU SUBMIT</span>
              <h3 ref={reviewHeading} tabIndex={-1} id="review-title">
                Review your selection
              </h3>
              <p>
                You selected <strong>{candidate.name}</strong> for{" "}
                <strong>{office.name}</strong>.
              </p>
              <p className="small">
                After acceptance, this selection cannot be changed. Your
                participation history will show only that you submitted.
              </p>
              <div className="actions">
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={changeChoice}
                >
                  Change selection
                </button>
                <button className="button" disabled={busy} onClick={submit}>
                  {busy ? "Submitting…" : "Submit final ballot"}
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            </section>
          ) : (
            <>
              <fieldset className="candidate-options">
                <legend>Select one candidate for {office.name}</legend>
                {office.candidates.map((c) => (
                  <label
                    className={`candidate-option ${selection === c.id ? "selected" : ""}`}
                    key={c.id}
                  >
                    <input
                      type="radio"
                      name={`office-${office.id}`}
                      value={c.id}
                      checked={selection === c.id}
                      disabled={busy}
                      onChange={() => setSelection(c.id)}
                    />
                    <span>
                      <strong>{c.name}</strong>
                      <span className="candidate-statement">{c.manifesto}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
              <div className="ballot-actions">
                <button
                  className="text-button"
                  onClick={() => setSelection(null)}
                  disabled={!selection || busy}
                >
                  Clear selection
                </button>
                <button
                  ref={reviewButton}
                  className="button"
                  onClick={() => setReview(true)}
                  disabled={!selection || busy}
                >
                  Review selection <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            </>
          )}
        </div>
        <div className="privacy-note">
          <ShieldCheck size={20} aria-hidden="true" />
          <p>
            Only aggregate candidate totals appear in live results.
            Participation history contains no selected candidate. In small
            elections, changes in live counts can still allow inferences.
          </p>
        </div>
      </section>
    </div>
  );
}
function Candidacy({ positions, election }) {
  const applications = useResource("/api/candidates/apply");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget,
      input = Object.fromEntries(new FormData(form));
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api("/api/candidates/apply", {
        method: "POST",
        body: JSON.stringify({
          ...input,
          positionId: Number(input.positionId),
        }),
      });
      form.reset();
      setMessage("Application submitted for review.");
      await applications.reload();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="two-column">
      <section className="panel">
        <span className="eyebrow">STEP FORWARD</span>
        <h2>Apply for an office</h2>
        <p className="muted">
          Tell fellow students what you would bring to the role.
        </p>
        <Notice error>{error}</Notice>
        <Notice>{message}</Notice>
        {election.state !== "draft" ? (
          <Empty title="Applications are closed">
            Candidate setup is locked once the election opens.
          </Empty>
        ) : (
          <form onSubmit={submit}>
            <Field
              as="select"
              label="Office"
              name="positionId"
              required
              defaultValue=""
            >
              <option value="" disabled>
                Choose an office
              </option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Field>
            <Field
              as="textarea"
              label="Your statement"
              name="manifesto"
              required
              minLength={20}
              maxLength={1500}
              rows={7}
              hint="20–1,500 characters. Explain your priorities in your own words."
            />
            <button className="button" disabled={busy}>
              {busy ? "Submitting…" : "Submit application"}
            </button>
          </form>
        )}
      </section>
      <section>
        <h2>My applications</h2>
        <ResourceState resource={applications}>
          {applications.data &&
            (applications.data.applications.length ? (
              <ul className="application-list">
                {applications.data.applications.map((a) => (
                  <li className="panel" key={a.id}>
                    <div className="office-heading">
                      <h3>{a.position_name}</h3>
                      <span className="badge">{a.status}</span>
                    </div>
                    <p className="preserve-text">{a.manifesto}</p>
                    <p className="small muted">
                      Submitted {dateTime(a.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty title="No applications yet">
                Your submitted applications will appear here.
              </Empty>
            ))}
        </ResourceState>
      </section>
    </div>
  );
}
