"use client";
import { BarChart3, RefreshCw } from "lucide-react";
import { useLiveResults } from "./client";
import { Empty, Notice, ElectionBadge, dateTime } from "./ui";

export default function LiveResults() {
  const live = useLiveResults(),
    data = live.data;
  const label = {
    connecting: "Connecting…",
    live: "Updates connected",
    reconnecting: "Reconnecting · totals may be out of date",
    paused: "Updates paused",
    "signed-out": "Session ended · sign in again",
  }[live.status];
  return (
    <section aria-labelledby="results-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">THE ELECTION, AS IT HAPPENS</span>
          <h2 id="results-title">
            {data?.election.state === "closed"
              ? "Voting closed · results"
              : "Live results"}
          </h2>
          <p className="muted">
            Candidate totals for everyone. Individual students’ choices stay out
            of this view.
          </p>
        </div>
        <BarChart3 className="section-icon" size={32} aria-hidden="true" />
      </div>
      <div className="results-status">
        <span
          className={`connection ${live.status === "live" ? "connected" : ""}`}
          role="status"
        >
          <span className="status-dot" aria-hidden="true" />
          {label}
        </span>
        <button className="button secondary compact" onClick={live.retry}>
          <RefreshCw size={15} aria-hidden="true" />
          Refresh
        </button>
      </div>
      <Notice error>
        {live.error}
        {live.status === "signed-out" && (
          <>
            {" "}
            <a href="/">Return to sign in</a>
          </>
        )}
      </Notice>
      {!data ? (
        !live.error && (
          <p className="loading" role="status">
            Fetching authoritative totals…
          </p>
        )
      ) : (
        <>
          <div className="stats-grid">
            <div>
              <span>Students participating</span>
              <strong>{data.stats.uniqueVoters.toLocaleString()}</strong>
              <small>At least one office submitted</small>
            </div>
            <div>
              <span>Selections accepted</span>
              <strong>{data.stats.totalVotesCast.toLocaleString()}</strong>
              <small>Across all offices</small>
            </div>
            <div>
              <span>Registered accounts</span>
              <strong>{data.stats.registeredStudents.toLocaleString()}</strong>
              <small>{data.stats.participationRate}% have participated</small>
            </div>
          </div>
          <div className="snapshot-meta">
            <ElectionBadge election={data.election} />
            <span>
              Observed {dateTime(data.observedAt, true)} · snapshot{" "}
              {data.version}
            </span>
          </div>
          <p className="small muted">
            {data.election.state === "closed"
              ? "Voting has ended. These totals are not a certification by your school."
              : "Provisional totals · every accepted selection counts. Counts update about every five seconds while this page is visible."}
          </p>
          <div className="result-grid">
            {data.results.map((office) => {
              const highest = Math.max(
                0,
                ...office.candidates.map((c) => c.vote_count),
              );
              const tied =
                highest > 0 &&
                office.candidates.filter((c) => c.vote_count === highest)
                  .length > 1;
              return (
                <section
                  className="panel result-office"
                  key={office.id}
                  aria-labelledby={`result-${office.id}`}
                >
                  <div className="office-heading">
                    <h3 id={`result-${office.id}`}>{office.name}</h3>
                    <span className="small muted">
                      {office.totalVotes} accepted
                    </span>
                  </div>
                  {!office.candidates.length ? (
                    <Empty title="No approved candidates">
                      No ballots are available for this office.
                    </Empty>
                  ) : (
                    <>
                      <ul className="result-list">
                        {office.candidates.map((candidate) => (
                          <li key={candidate.id}>
                            <div className="result-label">
                              <strong>{candidate.name}</strong>
                              <span>
                                {candidate.vote_count}{" "}
                                <span className="muted">
                                  ({candidate.percentage}%)
                                </span>
                              </span>
                            </div>
                            <div className="bar-track" aria-hidden="true">
                              <div
                                style={{ width: `${candidate.percentage}%` }}
                              />
                            </div>
                          </li>
                        ))}
                      </ul>
                      {office.totalVotes === 0 && (
                        <p className="small muted">No ballots accepted yet.</p>
                      )}
                      {tied && (
                        <p className="small tie-note">
                          The highest current count is tied.
                        </p>
                      )}
                    </>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
