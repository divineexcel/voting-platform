// Shared, deterministic decisions used by the live transport and ballot recovery UI.
export function newerSnapshot(current, incoming) {
  if (
    !Number.isSafeInteger(incoming?.version) ||
    !incoming?.election ||
    !incoming?.stats ||
    !Array.isArray(incoming?.results) ||
    !Number.isFinite(Date.parse(incoming.observedAt))
  )
    throw new Error("The results response was incomplete.");
  return current && incoming.version < current.version ? current : incoming;
}
export function retryDelay(failures, random = Math.random()) {
  return (
    Math.min(30000, 5000 * 2 ** Math.min(failures, 3)) +
    Math.floor(random * 500)
  );
}
export function acceptanceFor(snapshot, positionId) {
  if (!Array.isArray(snapshot?.acceptedPositions))
    throw new Error("Participation status could not be confirmed.");
  return snapshot.acceptedPositions.includes(positionId);
}
