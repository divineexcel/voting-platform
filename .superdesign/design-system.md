# Proposed design direction and system

Status: School civic direction approved by the user and implemented in the upgrade branch. This document preserves the design brief used for generation. Current identity: ApexVote, forest green `#0F5A47`, mint, pale green-gray canvas, white surfaces, Outfit/Inter, Lucide icons. School identity has not been supplied. Preserve these as provisional brand assets rather than substituting a new institutional identity.

## Direction comparison

| Direction | Feel and visual logic | Trade-off |
| --- | --- | --- |
| **School civic — recommended** | Calm, clear, credible. Existing forest green, warm light canvas, strong readable type, quiet outlines, compact task header and equal candidate rows | Least brand disruption; distinctiveness comes from precise ballot/status design rather than novelty |
| Institutional blue | Assured, formal, structured. Navy base, indigo action, warm white and crisp typographic hierarchy | Matches supplied brief's possible palette but invents a brand change without school evidence |
| Editorial student voice | Welcoming, expressive, focused. Existing green with more editorial headings and authentic approved school/candidate imagery | Requires genuine assets and careful candidate parity; larger imagery increases bandwidth and bias risk |

For students choosing school representatives on small screens and imperfect connections, School civic should feel **calm, clear and credible** through readable content, stable ordering, visible acceptance state and neutral candidate presentation. Live result anticipation should come from truthful collective progress and actual changes in counts.

## Information hierarchy

Student ballot: school/product identity → actual election/office context → participation status → office selection → comparable candidates → selection → review → final submit → acceptance status. Keep candidacy applications distinct. Place live results in a separate selectable view, not beside the ballot choice buttons. Result visibility is approved, but incidental leader pressure can be reduced by task separation.

Admin: election/status context → relevant operational alerts → selected task → truthful data timestamp → accessible table or results. Keep counts clearly named: accepted selections, participants, registered accounts, issued codes. Use `Provisional results` during voting. Do not label a winner before the agreed close/certification policy.

## Foundation tokens (proposed values)

| Role | Proposed value / rule |
| --- | --- |
| Canvas / surface | `#F3F6F5` / `#FFFFFF`; retain current recognizable palette |
| Text / secondary | `#1F2937` / `#4B5563`; avoid faint slate as default body copy |
| Primary / hover | `#0F5A47` / `#0A4133`; white foreground; validate every state |
| Accent surface | `#E6F2ED`; dark green text; avoid color-only selection/status |
| Border | Start `#CBD5D1`; stronger control boundary than decorative separators; measure non-text contrast |
| Focus | Distinct 3px visible outline with offset; proposed `#1D4ED8`, test against adjacent surfaces and forced colors |
| Success | Dark green text plus check icon and explicit accepted-status copy |
| Warning | Dark amber text, pale amber surface; not low-contrast orange body text |
| Error | Dark red text, pale red surface, field-specific explanation and recovery action |
| Typography | Body 16px/1.5 minimum default; supporting text 14px/1.4; headings approximately 20/24/32px. Avoid 10px instructions |
| Fonts | Retain Outfit headings / Inter body initially; verify supplied weights. Consider one family if measured load warrants it |
| Spacing | 4, 8, 12, 16, 24, 32, 48px; use 16px mobile gutters and 24/32px wider gutters |
| Grid | Single column narrow screens; 2 columns where candidate comparison remains readable; max 1152px content, 640px focused ballot/form |
| Breakpoints | Existing Tailwind breakpoints retained; test requested 320/375/768/1024/1440px rather than treating breakpoint names as evidence |
| Radius | 8–12px controls, 16px panels, pills only for compact status; reduce blanket 24px-rounded containers |
| Elevation | Borders for ordinary grouping; one restrained overlay shadow; no glowing security decoration |
| Motion | 120–180ms color/opacity transitions; no count rolling by default; reduced motion disables nonessential effects |

These values require actual rendered contrast and state checks. They are a specification, not WCAG certification. Semantic token names replace misleading names such as accent-indigo that currently refer to green. Scope migration carefully to avoid globally changing every page at once.

## Shared component contracts

| Component | Semantics / interaction | States and content |
| --- | --- | --- |
| Button | Native button; clear action name; visible focus; 44px ergonomic target where practical | Default/hover/focus/disabled/busy; text stays legible; disabled cannot imply success |
| FormField | `label` connected to input ID; hint/error described by IDs; appropriate autocomplete | Empty/entered/invalid/submitting; preserve input on failure; focus first invalid field or error summary |
| CandidateOption | Fieldset/legend per office, native radio, candidate name in accessible label; comparable information space | Unselected/selected/reviewed; selection has text/icon and border; no leader styling or popularity cues on ballot |
| VoteReview | Named review region or accessible dialog; office + choice + finality; change/back action | Pre-submit/submitting/accepted/unknown/rejected; focus behavior documented; choice exists only as needed before submission |
| ParticipationStatus | Status only; no candidate linked to signed-in voter | Not submitted/confirming/accepted/needs recovery; polite live announcement for meaningful changes |
| LiveResults | Named region, office heading, counts plus text/table alternative, stable chart labels | Live/stale/reconnecting/final; server timestamp; values are actual snapshots, not interpolated guesses |
| ResultsTable | Table headers scoped; counts aligned with tabular numerals; ties explicit | Zero ballots/no candidates/loading/error/populated; percentage denominator shown; rounding can sum to 99/101 and is not a tally error |
| AdminDataTable | Caption, scoped headers; controls have row context; scroll region labelled | Loading/empty/error/paginated; sensitive columns omitted; safe archival action with consequence explanation |
| StatusMessage | `role=status` for completion; alert for actionable error; avoid repeated result announcements | Plain language, specific next step, no candidate choice in receipts/history |
| Disclosure/navigation | Native button or links; expanded/selected state exposed programmatically | Keyboard operation, focus remains predictable, meaningful accessible names on icon-only controls |

## Engagement and live feedback

- Show a restrained connection indicator only while updates are arriving successfully; display observation time and a clear reconnect state otherwise.
- Animate an optional subtle outline/opacity change on updated totals; preserve exact values and support reduced motion. Do not announce every count to screen readers; offer a controlled update summary.
- Show progress against an approved electorate only when that denominator exists. Otherwise show participants and accepted selections as separate factual numbers.
- Allow students to open the live view voluntarily. No forced result reveal, manufactured scarcity, fake closeness, celebratory candidate treatment or artificial countdown.
- Fixed candidate ordering during voting; an optional results sort can be clearly labelled. Equal totals are displayed as a tie, not resolved by alphabetical order into a sole leader.
- Small-school live totals can reveal likely choices through timing even without names. Include this limitation in the school's privacy acceptance; never describe aggregate display as absolute anonymity.

## Verification required before approving the implemented design

Complete journeys at requested widths; keyboard and dialog review; screen-reader spot checks; real contrast calculations for text/control/focus; 200% text resize and 400% reflow; reduced motion and forced colors; long name/manifesto layouts; real slow/offline/reconnect states. Measure performance in a production build on representative hardware/network. No real school assets, interviews, usability outcomes or before/after redesign screenshots have been fabricated.
