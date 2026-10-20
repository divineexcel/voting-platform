# Proposed design context export

Target: signed-in student ballot dashboard on `/`, followed by the requested live aggregate view.

Destination: Superdesign hosted design service, project `730d78f6-2d18-4bad-8ca2-c3b2b6f54758`.

Exact proposed text context:

- `src/app/page.js`, lines 233 to end: current UI rendering and page-local layout, including all existing visual branches.
- `src/app/globals.css`: existing CSS/token values.
- `src/app/layout.js`: current root layout and font definitions.
- `.superdesign/design-system.md`: approved design direction and product constraints.

Selected visual reference: the previously captured baseline `student-dashboard-1440.jpg` with disposable synthetic fixture data. That screenshot and an extracted existing portal header are already on the canvas. There is no real school logo asset; the existing Lucide Vote glyph and ApexVote wordmark remain the baseline identity.

Excluded: database files, backend source, credential files, tokens, personal records, environment variables, logs, unrelated repository files and repository history.

The user explicitly approved sending these selected UI files on 20 October 2026. The baseline and refined draft were generated using this exact bundle. The user subsequently approved the concrete green design direction, which is now implemented in the application source. No additional source bundle was sent during implementation. The export excludes all records and credentials listed above.
