AGENTS.md — Metal Coil Traceability & Sales ERP
Purpose: This file is the source of truth for the coding agent working on this project. Read it fully at the start of every session, then follow the Session-Start Protocol before doing anything else.

Companion documents:

SYSTEM_BLUEPRINT.md — the plain-language description of what the system does. Use this to validate intent before touching code. If a phase's spec here and the blueprint conflict, the blueprint wins — ask the human which one is wrong before proceeding.

README.md — setup, deployment, troubleshooting (updated at Phase 6).

Project state (last updated: start of Phase 2):

Phase 1 (Foundation) — ✅ Complete on main

Phase 2 (Coil Receipt, Production Runs, Traceability) — 🚧 In progress; uncommitted at session start

Phases 3–6 — Not started

⚠️ Git history note: Phase 1 was committed directly to main during initial setup — a legacy state. From Phase 2 onward, all work flows through develop and phase/N-* branches. main is human-owned for final releases only. The Session-Start Protocol below migrates from the legacy state automatically.

🚦 Session-Start Protocol (REQUIRED — run before any work)
Every session begins with these steps, in order. Do not touch code, do not run alembic, do not answer phase questions until this protocol completes.

Step 1 — Read this file and SYSTEM_BLUEPRINT.md end to end.
Step 2 — Detect repository state. Run all four:
bash
git branch -a
git log --oneline -10
git status
git stash list
Step 3 — Classify state using the table.
If you observe…	State	Action
develop exists AND current branch is phase/N-* AND working tree clean or contains only current-phase work	✅ Steady — continue phase	Go to "Continue phase" below
develop exists AND current branch is develop or main	⚠️ Needs phase branch	Ask the human which phase to start, then run "Start a new phase"
develop exists AND working tree has uncommitted work belonging to the current phase	⚠️ Mid-phase, resume	Go to "Continue phase" below
develop does not exist AND main has commits	🚨 Legacy — migrate	Run "One-time migration" below automatically, no gate
Any of backend/.env, frontend/.env.local, .venv/, node_modules/, .next/, __pycache__/ appears in git status	🚨 Secret/artifact leak	STOP. Print the offending paths. Do not proceed even read-only. Wait for human.
Step 4 — Report state and proceed.
Print this block, filling in the bracketed values:

text
### Session state

Branch: [current]
Branches present: [list]
Uncommitted files: [count]
Stashes: [count]
Detected state: [case name from table]
Current phase: [inferred from branch name, or "unknown"]

Plan: [one-line description of what happens next]
Then:

If state is ✅ Steady → continue immediately to "Continue phase" (no gate).

If state is ⚠️ Needs phase branch → ask the human: "develop is ready but I'm on [branch]. Which phase should I start: 2, 3, 4, 5, or 6?" Wait for answer, then run "Start a new phase."

If state is 🚨 Legacy → begin the migration immediately after printing the state block. Do not ask. The migration is designed to be safe (stashes before touching anything, pushes to remote as a backup). If anything during the migration surprises you, abort by running git stash pop and report — do not push a half-finished state.

If state is 🚨 Secret leak → stop and wait.

Continue phase
Determine the phase from the current branch name (phase/N-* → phase N). If the phase is ambiguous, ask the human.

Then run the "Before writing code for a phase" checklist from the "How to work through phases" section below. Report the plan and wait for the human's "go". This is the only approval gate in the phase workflow — once the human says "go", you have full autonomy to build, test, commit, push, merge to develop, and tag, following the Branch-per-phase Git workflow.

🚨 One-time migration (auto-triggered by Session-Start Protocol when develop is missing)
This handles exactly one scenario: Phase 1 (and possibly part of Phase 2) were committed or left uncommitted on main before the branch-per-phase discipline began. Run this once. It will never trigger again because it creates develop.

Run all steps in order. If any step fails, stop immediately and report — do not attempt a workaround.

M1. Record the baseline:

bash
git rev-parse HEAD
git status --porcelain
Save both outputs for the report.

M2. Stash uncommitted work (including untracked files):

bash
git stash push -u -m "WIP pre-migration — auto"
Verify: git stash list shows exactly one entry.

If M1's git status --porcelain was empty (clean working tree), skip M2 and note "no uncommitted work — nothing to stash."

M3. Create develop from main and push:

bash
git checkout -b develop
git push -u origin develop
Verify: git branch shows * develop.

M4. Determine the phase to work on:

If the human's previous session message indicated a phase, use that.

Otherwise infer from the working tree: if uncommitted files clearly reference production/coils/pieces, it's Phase 2; if they reference transfers, Phase 3; etc.

If ambiguous, default to Phase 2 (the earliest incomplete phase).

Branch names (fixed):

Phase	Branch
2	phase/2-inbound-production
3	phase/3-transfers
4	phase/4-sales-payments
5	phase/5-reporting
6	phase/6-hardening
M5. Create the phase branch:

bash
git checkout -b phase/N-short-name
M6. Restore the stashed work (skip if M2 was skipped):

bash
git stash pop
Verify: git status --porcelain output should match M1's git status --porcelain output. If it does not, stop — do not commit — and report the discrepancy.

M7. Guard scan for forbidden files:

bash
git status --porcelain | grep -E '\.env|node_modules|\.venv|\.next|__pycache__'
(PowerShell: git status --porcelain | Select-String -Pattern '\.env|node_modules|\.venv|\.next|__pycache__')

If any lines return, stop. Print:

text
### 🚨 MIGRATION HALTED — forbidden files in working tree

[list from scan]

.gitignore is incomplete. Please fix it before I proceed.
Wait for the human.

M8. Commit the restored WIP (skip if M2 was skipped):

bash
git add .
git status
Read the git status output — confirm no forbidden files staged. Then:

bash
git commit -m "phase N (WIP): work in progress carried over from main"
M9. Push the phase branch:

bash
git push -u origin phase/N-short-name
M10. Print the migration report:

text
### One-time migration complete

- Baseline commit on main: [sha from M1]
- Uncommitted files carried over: [count from M1]
- develop created and pushed: [sha]
- Phase branch created and pushed: phase/N-short-name
- WIP commit: [sha or "none (clean working tree)"]
- Forbidden-file scan: clean ✅

main is untouched at [sha from M1].
Proceeding with Phase N work on phase/N-short-name.
Then proceed directly to "Continue phase" — build a plan, report it, wait for the human's "go".

🌳 Branch-per-phase Git workflow (agent-owned)
This section supersedes every earlier Git rule. The agent owns Git on develop and phase/*. The human owns main.

Hard limits — no exceptions
These are the boundaries that make the automation safe. Violating any is a critical failure.

❌ Never touch main. No git checkout main, git merge ... main, git push origin main. main is deployed, client-facing, and under human control.

❌ Never force-push (--force or --force-with-lease) to any branch.

❌ Never git reset --hard on any branch with unmerged commits.

❌ Never git commit --amend on any commit that has been pushed.

❌ Never auto-resolve merge conflicts. Stop, report conflicting files, wait.

❌ Never skip the pre-merge regression check. Even if the phase "clearly can't affect prior behavior." Schema changes, shared utilities, and event handlers have invisible side effects.

❌ Never commit backend/.env, frontend/.env.local, .venv/, node_modules/, .next/, or __pycache__/. If git status shows any of these staged, unstage with git restore --staged <file> and fix .gitignore before continuing.

❌ Never delete a branch that has an open PR or has been pushed but not merged.

Why this split?
develop is a reversible integration branch. Every action on it — merge, push, tag — can be undone with git revert without affecting users. main is the deployable branch that users (or the client) interact with. Any mistake on main is visible. So the agent gets full automation on develop (safe) and none on main (unsafe). This is the standard gitflow split, adapted for a solo build where the human doesn't want to babysit every commit.

Start a new phase
bash
git checkout develop
git pull origin develop
git checkout -b phase/N-short-name
Confirm git branch shows * phase/N-short-name. Then:

Read the existing code the phase will touch.

Print a plan: "Files I'll create: […]. Files I'll modify: […]. Ambiguities to resolve: […]. Acceptance criteria I'll verify: [list]."

Wait for the human's "go".

Build.

End-of-phase procedure (run at the end of every phase)
E1. Verify acceptance criteria for the current phase. For each item in the phase's checklist:

Run the test (pytest, API call, browser).

Record pass ✅ / fail ❌ with one-line evidence.

If any fail → jump to "On failure" below.

E2. Run regression check on all prior phases. Re-run the acceptance criteria of Phase 1 through N−1. If any prior criterion now fails → jump to "On regression" below.

E3. Commit final phase work:

bash
git add .
git status
Scan for forbidden files one final time. If clean:

bash
git commit -m "phase N: <one-line summary>

- <bullet: what was added>
- <bullet: what was modified in prior code>"
E4. Push the phase branch BEFORE merging:

bash
git push -u origin phase/N-short-name
E5. Merge into develop:

bash
git checkout develop
git pull origin develop
git merge --no-ff phase/N-short-name -m "merge: phase N (short-name)"
git push origin develop
If conflicts occur, stop:

text
### 🚨 MERGE CONFLICT — human review required

Conflicting files: [list]
phase/N-short-name is pushed but not merged. I will not resolve conflicts.
Do not run git merge --abort. Leave the merge in progress so the human can inspect it.

E6. Tag the phase:

bash
git tag -a v0.N-phaseN -m "Phase N complete: <summary>"
git push origin v0.N-phaseN
Use the exact tag names: v0.2-phase2, v0.3-phase3, v0.4-phase4, v0.5-phase5, v0.6-phase6.

E7. Return to the phase branch (for any follow-up fixes):

bash
git checkout phase/N-short-name
E8. Print the phase completion report:

text
### Phase N Completion Report

**Migration:** [ran clean / ran with warnings / failed]
**Tests:** [X passed, Y failed — list failures if any]
**Manual walkthrough:** [passed / blocked at step X]
**Regression check:** [all prior criteria pass ✅ / list regressions]

**Acceptance Criteria:**
- ✅ [criterion 1] — [one-line evidence]
- ✅ [criterion 2] — [...]
- ❌ [criterion 3] — [explanation]

**Files created:** [list]
**Files modified:** [list]
**Deferred / not done:** [anything skipped and why]

### Git operations completed

- Branch: phase/N-short-name (pushed)
- Merge commit on develop: [first 8 chars of merge sha]
- Tag pushed: v0.N-phaseN

**Not done (human owns this):**
- Merge to main — waiting for human sign-off

**Recommendation:** [Ready for human review / Needs fix / Blocked on X]
The human will cross-check against SYSTEM_BLUEPRINT.md and merge develop → main if satisfied.

On failure (during E1)
If a current-phase criterion fails:

Fix it if the fix is clear and safe. Re-run that criterion.

If the fix requires changing a prior phase's schema or API contract → stop and ask the human.

Commit fix-in-progress to phase/N-short-name as you iterate (fix: <description>).

Do not merge to develop until all criteria pass.

Do not proceed to E3–E6 until then.

On regression (during E2)
If any prior-phase criterion fails after a current-phase change:

Do not merge.

Commit the current phase work to phase/N-short-name and push it (preserves the work).

Leave develop unchanged.

Print:

text
### 🚨 REGRESSION DETECTED — merge blocked

Prior criterion that broke: [exact text]
Minimal repro: [steps]
Suspect commit: [first 8 chars]

phase/N-short-name is pushed. develop is unchanged. Waiting for human decision:
  1. Fix the regression on this branch, re-run E1 + E2
  2. Revert the phase branch and restart
  3. Accept the regression (explicit waiver)
Wait for the human.

🧭 How to work through phases
Before writing code for a phase
Read the relevant existing code: models, schemas, routes, frontend pages.

Cross-check the plan against SYSTEM_BLUEPRINT.md — does the flow described in the blueprint match what you're about to build?

Print a plan (files, ambiguities, acceptance criteria you'll verify).

Wait for "go".

While writing code
Follow all General Rules below.

Keep commits small and scoped. One logical change per commit.

Do not modify prior-phase code unless the current phase requires it or you are fixing a bug. If you must, explain why in the plan.

If you spot a bug in prior-phase code during this phase, note it in the plan and ask whether to fix inline or defer to a follow-up commit on develop.

At the end of a phase
Follow the "End-of-phase procedure" in the Branch-per-phase Git workflow above. Do not invent an alternative — the acceptance → regression → commit → push → merge → tag order is required.

Red flags — stop and ask the human
A migration would modify or drop existing tables/columns.

Acceptance criteria are ambiguous or contradictory.

You find a bug in a prior phase that requires redesigning a table or changing an API response shape.

A test would require touching the live Supabase database.

The merge into develop conflicts.

📜 General Rules (apply to every phase, every file)
These are here because they have already caused bugs in Phases 1 and 2.

Email TLDs: Seed/test/fixture data must use valid TLDs (.com, .io, .example.com). Never .local, .test, .invalid — Pydantic's EmailStr rejects them.

Frontend error normalization: Every API-calling form must normalize data.detail:

typescript
const msg = Array.isArray(data.detail)
  ? data.detail.map((d: any) => d.msg).join('; ')
  : (typeof data.detail === 'string' ? data.detail : 'Request failed');
Never setError(data.detail) directly. Prevents [object Object].

Alembic enums: Always sqlalchemy.Enum(..., name="...", create_type=False) and explicitly create the type once with checkfirst=True. Never mix explicit and implicit type creation. Caused DuplicateObject in Phase 1.

Server-side validation of totals: Never trust client-computed totals. Re-compute on the server. For weight tolerance, allow ±0.5%.

Money: Decimal on backend, never float. Quantize to Decimal("0.01") at the end. Serialize to strings in API responses ("128.50", not 128.5). JavaScript floats lose precision on accounting data.

Synchronous SQLAlchemy: SessionLocal pattern only. Do not introduce async sessions or asyncpg.

Double-submit protection: Endpoints with side effects (complete run, create sale, record payment, transfer stock) must be idempotent or reject duplicates. Disable frontend button during request + return 409 Conflict on second call.

README commands must be copy-paste runnable, each starting with an explicit cd backend or cd frontend line.

Do not seed production data unless the phase explicitly says so. Tests create their own data.

Commit messages: Start with phase N: for phase work, fix: for mid-phase fixes. Multi-line with bullets for clarity.

Never commit secrets or build artifacts. If unsure whether a file is safe, ask the human.

Always run git status before committing and paste its output in the phase completion report.

Phase 3 — Warehouse Transfers & Stock Movements
Goal: Let warehouse staff move finished pieces from the main production warehouse to the retail outlet, and give the client a full audit trail of every piece's location history.

Not in scope: sales, payments, revenue reports. Those are Phase 4–5.

Schema changes (migration 0003_phase3_transfers.py)
stock_movements already exists from Phase 1. Add:

transfer_group_id (UUID, nullable, indexed) — correlates the rows of one transfer group.

No new tables.

Backend endpoints
STOCK TRANSFERS

POST /api/v1/stock-transfers

Body: { piece_ids: [uuid], to_warehouse_id: uuid, note: string }

Validates: all pieces exist, all are in IN_MAIN, all currently in a MAIN-type warehouse, target warehouse is OUTLET-type.

For each piece: creates one StockMovement of type TRANSFER with from_warehouse_id, to_warehouse_id, piece_id, weight_kg, shared transfer_group_id.

Updates piece.status = IN_OUTLET, piece.current_warehouse_id = to_warehouse_id.

Atomic — if any piece fails, no changes committed.

Returns { transfer_group_id, moved_count, pieces: [...] }.

Idempotent: second call with same piece_ids already IN_OUTLET → 409 Conflict.

GET /api/v1/stock-transfers?from=&to=&warehouse_id= — grouped by transfer_group_id.

GET /api/v1/pieces/{id}/movements — full audit trail, oldest → newest.

PIECES

GET /api/v1/pieces — verify warehouse_id filter works (added in Phase 2 spec).

Frontend pages
/warehouse/transfers — list with date, piece count, total weight, from → to.

/warehouse/transfers/new — form: select IN_MAIN pieces (search + checkboxes), target outlet warehouse, note, running total "Transferring N pieces, X kg". Submit → confirmation dialog → POST.

/warehouse/pieces — add "Current Location" column + IN_MAIN / IN_OUTLET badge.

/warehouse/pieces/[id] — add "Movement History" card below Source Coil / Produced In cards.

Acceptance criteria
□ Migration 0003_phase3_transfers runs forward and backward cleanly (upgrade head → downgrade -1 → upgrade head).
□ POST /stock-transfers with 3 valid pieces creates exactly 3 StockMovement rows with shared transfer_group_id, updates all 3 to IN_OUTLET.
□ POST /stock-transfers with one piece already IN_OUTLET returns 422, no changes.
□ POST /stock-transfers with non-existent piece returns 404.
□ POST /stock-transfers with SOLD piece returns 422.
□ Second identical POST /stock-transfers returns 409.
□ GET /pieces/{id}/movements returns 3 rows for a piece that went receive → produce → transfer.
□ Frontend /warehouse/transfers/new shows only IN_MAIN pieces.
□ Frontend transfer submit shows confirmation dialog before sending.
□ After successful transfer, piece detail page shows new location and the transfer in Movement History.
□ pytest covers: happy path, one-invalid-piece rollback, double-submit 409, sold-piece rejection.
□ README updated with "Transferring pieces from Main to Outlet" walkthrough.
Phase 4 — Dual-Channel Sales & Payments
Goal: Let sales staff create bulk sales (from main inventory) and retail sales (from outlet inventory), record payments, and view the sale lifecycle.

Not in scope: reports and dashboards (Phase 5).

Schema changes (migration 0004_phase4_sales.py)
sales exists from Phase 1. Extend:

status: new enum sale_status with DRAFT, COMPLETED, PARTIAL, PAID, CANCELLED. Default COMPLETED.

notes: Text, nullable.

created_by_id: UUID FK → users.id, NOT NULL.

completed_at: DateTime(timezone=True), nullable.

sale_line_items — confirm it has sale_id, piece_id, sale_price, created_at. No change.

New table payments:

id UUID PK

sale_id UUID FK → sales.id, NOT NULL

amount Numeric(14,2), NOT NULL

method enum payment_method (CASH, BANK_TRANSFER, CHEQUE, OTHER)

reference String(255), nullable

paid_at DateTime(timezone=True), server_default=now()

recorded_by_id UUID FK → users.id, NOT NULL

Backend endpoints
SALES

POST /api/v1/sales

Body: { sale_type: BULK|RETAIL, customer_name, warehouse_id, line_items: [{piece_id, sale_price}], notes }

Validates: all pieces exist; all in the correct status for the channel (IN_MAIN for BULK, IN_OUTLET for RETAIL); all in the specified warehouse_id; sale_price > 0 per line; no duplicates.

Rejects if a piece's selling_price is null and no sale_price provided.

Server re-computes total_amount = sum(sale_price).

Creates Sale (COMPLETED), SaleLineItem per piece, StockMovement of type SALE per piece.

Updates each piece → SOLD.

Atomic. Returns full sale with piece codes.

GET /api/v1/sales?from=&to=&channel=&status=&customer=

GET /api/v1/sales/{id} — with line items, payments, computed amount_paid and amount_due.

POST /api/v1/sales/{id}/cancel

Only if status != CANCELLED and amount_paid == 0.

Restores pieces to previous warehouse + IN_MAIN/IN_OUTLET status.

Sets sale.status = CANCELLED.

Rejects with 422 if any payment recorded.

PAYMENTS

POST /api/v1/sales/{id}/payments

Body: { amount, method, reference }

Validates amount > 0, amount <= amount_due.

Creates Payment. Recomputes sale status:

amount_paid == 0 → COMPLETED

0 < amount_paid < total → PARTIAL

amount_paid == total → PAID

Rejects 409 if sale already PAID or CANCELLED.

GET /api/v1/payments?from=&to=&method=

Frontend pages
/sales — list with filters (channel, status, date, customer).

/sales/new?channel=bulk — bulk sale: search IN_MAIN pieces, editable sale price (pre-filled from selling_price), customer name, running total.

/sales/new?channel=retail — same but IN_OUTLET. Quick single-piece flow.

/sales/[id] — detail: header, line items table, payments card, actions (Cancel disabled if any payment).

/warehouse/pieces — add SALE filter, show sale reference for SOLD pieces.

Acceptance criteria
□ Migration 0004_phase4_sales runs forward and backward cleanly.
□ POST /sales with 3 valid IN_MAIN pieces → COMPLETED sale, 3 line items, 3 SALE movements, all pieces SOLD, total_amount correct.
□ POST /sales with RETAIL type and an IN_MAIN piece → 422.
□ POST /sales with duplicate piece_id → 422.
□ After sale, transfer or re-sale of any piece → 422.
□ POST /sales/{id}/payments partial → status PARTIAL, amount_due decreases.
□ Full remainder → status PAID.
□ amount > amount_due → 422.
□ Double-click POST /payments → either 409 or frontend prevents + backend has guard. State which in the report.
□ Cancel with payment → 422.
□ Cancel without payment restores pieces; sale status = CANCELLED (not deleted).
□ /sales/new?channel=bulk shows only IN_MAIN; ?channel=retail only IN_OUTLET.
□ /sales/[id] shows payments card, disables Cancel when payment exists.
□ pytest covers: happy bulk, happy retail, wrong-channel rejection, duplicate rejection, partial → full progression, overpayment, cancel-with-payment, cancel-without-payment.
□ README updated with "Recording a bulk sale and full payment" walkthrough.
Phase 5 — Financial Reporting & Pricing
Goal: Daily / weekly / monthly revenue, COGS, profit per coil, inventory valuation. Bulk selling-price update for unsold pieces on market moves.

Not in scope: new tables beyond those listed.

Schema changes (migration 0005_phase5_reporting.py)
New table price_history:

id UUID PK

piece_id UUID FK → produced_pieces.id, NOT NULL

old_price Numeric(14,2), nullable (null on first set)

new_price Numeric(14,2), NOT NULL

changed_by_id UUID FK → users.id, NOT NULL

reason String(255), nullable

changed_at DateTime(timezone=True), server_default=now()

No other schema changes.

Backend endpoints
REPORTS (all accept from, to ISO dates; default current month)

GET /api/v1/reports/revenue?from=&to=&granularity=day|week|month&channel=BULK|RETAIL|both&warehouse_id=

Returns { periods: [{ start, end, revenue, cogs, gross_profit, sale_count }], totals: {...} }

revenue = sum of sale_line_items.sale_price for sales in period

cogs = sum of produced_pieces.allocated_cost for sold pieces in period

gross_profit = revenue - cogs

Only COMPLETED, PARTIAL, PAID sales count. CANCELLED/DRAFT excluded.

GET /api/v1/reports/profit-by-coil?from=&to=

Per-coil: coil_number, coil_cost, pieces_sold_count, pieces_unsold_count, revenue, cogs, gross_profit.

GET /api/v1/reports/inventory-valuation

{ by_warehouse: [...], total_pieces, total_cost_value, total_list_value }

total_cost_value = sum of allocated_cost for unsold pieces

total_list_value = sum of selling_price for unsold pieces (nulls = 0, null_price_count reported)

PRICING

GET /api/v1/pieces/{id}/price-history

POST /api/v1/pieces/bulk-price-update

Body: { filter: { grade?, category?, warehouse_id? }, adjustment: { type: "percent"|"absolute", value }, reason }

Applies only to status != SOLD pieces.

For each matching piece: writes old → new in price_history, updates selling_price.

Returns { affected_count, pieces, skipped_count }.

Atomic. Null selling_price pieces skipped on percent updates, reported.

Frontend pages
/finance — date range picker. Total revenue / cogs / gross profit / margin %. Channel breakdown chart. Top 5 coils by profit.

/finance/revenue — table + line chart, granularity toggle, channel filter. CSV export.

/finance/profit-by-coil — sortable table. CSV export.

/finance/inventory-valuation — table by warehouse + totals. CSV export.

/sales/pricing — bulk update tool: filter controls, preview table, adjustment form, confirmation → POST.

Acceptance criteria
□ Migration 0005_phase5_reporting runs forward and backward cleanly.
□ 5 sales across 3 days; granularity=day returns 3 periods with correct daily sums.
□ granularity=week and granularity=month return correct aggregated periods.
□ CANCELLED sales excluded from revenue and COGS totals.
□ Bulk-only filter = sum of bulk sales only; retail-only = retail sales only.
□ gross_profit = revenue - cogs in every period row.
□ profit-by-coil: coil with 2 sold, 1 unsold shows revenue from 2 sold, COGS from 2 sold, unsold in valuation but not profit.
□ inventory-valuation totals match sum of allocated_cost and selling_price for all unsold pieces.
□ bulk-price-update with percent: 5 on 10 pieces → 10 price_history rows, prices up 5%. SOLD pieces unchanged.
□ Null selling_price pieces skipped, reported in skipped_count.
□ All report money fields returned as strings, not floats.
□ Every report page has working CSV export.
□ /finance date range picker re-fetches correctly.
□ pytest covers: revenue aggregation (day/week/month), cancelled-sale exclusion, profit-by-coil mixed, bulk update percent + absolute, null-price skip.
□ README updated with "Reading daily / weekly / monthly revenue" walkthrough.
Phase 6 — Hardening & Deployment
Goal: Deployable, secure, documented for handoff.

Not in scope: new features.

Work items
Dockerization

docker-compose.yml at repo root with three services: backend (FastAPI, port 8001), frontend (Next.js, port 3001), db (Postgres, local testing only — production uses Supabase).

backend/Dockerfile, frontend/Dockerfile.

docker-compose up starts all services with seeded data.

Environment documentation

backend/.env.example — every variable with a comment: DATABASE_URL, JWT_SECRET (generate via python -c "import secrets; print(secrets.token_urlsafe(64))"), JWT_ALGORITHM, FRONTEND_URL.

frontend/.env.local.example — NEXT_PUBLIC_API_URL.

Security

Remove "change-me" default on jwt_secret in config.py (startup fails if unset).

CORS: allow only FRONTEND_URL (no *).

Rate limit POST /auth/login: 5 attempts/minute/IP. Use slowapi or in-memory counter (document choice).

Passwords: min 8 chars on register (verify).

Export

GET /api/v1/export/{entity}?from=&to= for coils|pieces|sales|payments. CSV. Admin role only.

Documentation

Root README.md with: architecture diagram (ASCII), local setup (both cd prefixes), deployment guide (Vercel + Railway/Render + Supabase), backup instructions, troubleshooting section covering the four historical bugs (IPv6 DNS, bcrypt pin, alembic.ini logging, enum create_type).

Acceptance criteria
□ docker-compose up from a fresh clone starts all services, http://localhost:8001/docs loads with seeded coils.
□ docker-compose down clean, no orphan containers.
□ backend/.env.example and frontend/.env.local.example complete with comments.
□ python -m uvicorn app.main:app fails with a clear error if JWT_SECRET missing.
□ >5 POST /auth/login attempts in 60s from same IP → 429.
□ POST /api/v1/export/coils returns valid CSV.
□ POST /api/v1/export/sales?from=…&to=… filters correctly.
□ Non-admin calling /export/* → 403.
□ README troubleshooting covers all four historical bugs.
□ git log --all -- backend/.env returns nothing.
□ All existing tests from Phases 1–5 still pass.
□ Manual full walkthrough (coil receipt → production → transfer → sale → payment → revenue report) on a fresh DB.
📊 Overall project completion
When all six phases pass their acceptance criteria, hand off:

Deployed frontend URL

Deployed backend URL with /docs accessible

Supabase project transferred (or credentials handed over securely)

README.md with setup, deployment, backup instructions

A 10-minute screen recording of the full workflow:

Receive coil → start production → complete run → verify traceability → transfer to outlet → record bulk sale → record retail sale → record payments → view revenue report

🤝 Final note for the agent
You are building a system that will be used daily by real people handling real money and real inventory. When in doubt:

Choose correctness over speed.

Choose explicit errors over silent fallbacks.

Choose atomic transactions over partial writes.

Choose server-side validation over trust.

Ask the human when the spec is ambiguous. Do not invent business rules.

The client demo happens after Phase 2, once the traceability loop is working end-to-end. Everything after Phase 2 builds on a foundation the client has already approved. Do not let Phase 3–6 changes silently alter the Phase 2 behavior — the pre-merge regression check (E2) is your guardrail. If a Phase 3–6 change would require changing Phase 2's data model or API contract, stop and ask the human before proceeding.

Start now: run the Session-Start Protocol at the top of this file