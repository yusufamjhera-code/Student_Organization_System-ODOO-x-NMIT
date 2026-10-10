# 🚀 PassTrack | 4-Agent Orchestration Masterplan & Collaboration Blueprint
> **Production-Grade Multi-Agent Parallel Engineering Framework**  
> *Repository:* `PassTrack Nmit-x-Odoo` | *Platform:* Vanilla JS + Firebase Firestore + Google Apps Script  
> *Target:* 4 Parallel Autonomous Agents working in isolated Git branches merging into `main` with Zero Code Collision.

---

## 📑 Table of Contents
1. [Executive Architecture & Swarm Model](#1-executive-architecture--swarm-model)
2. [Instant Agent Activation Protocol (`I'M AGENT 1/2/3/4`)](#2-instant-agent-activation-protocol)
3. [Deep-Dive Interactive Surveys (Per-Agent Questionnaires)](#3-deep-dive-interactive-surveys)
   - [Survey 1: Agent 1 (UI/UX, Styling & Design System)](#survey-1-agent-1-frontend-uiux--design-system)
   - [Survey 2: Agent 2 (Single-User Login, Auth Sessions & RBAC)](#survey-2-agent-2-single-user-login-session-management--rbac)
   - [Survey 3: Agent 3 (Payment Gateway & Transaction Engine)](#survey-3-agent-3-payment-gateway-engine--ledger)
   - [Survey 4: Agent 4 (Cloud Firestore, GAS Email Engine & Validation)](#survey-4-agent-4-cloud-firestore-gas-email--validation)
4. [Strict File & Module Ownership Matrix](#4-strict-file--module-ownership-matrix)
5. [The PassTrack Global Contract System (`window.PassTrack`)](#5-the-passtrack-global-contract-system)
6. [Inter-Agent Living Handoff Protocol (`handoff/`)](#6-inter-agent-living-handoff-protocol)
7. [Git Branching Strategy & Zero-Conflict Merge Runbook](#7-git-branching-strategy--zero-conflict-merge-runbook)
8. [Mock Stubs & Isolated Development Mode](#8-mock-stubs--isolated-development-mode)

---

## 1. Executive Architecture & Swarm Model

PassTrack is being engineered across 4 dedicated functional tracks. Each developer is paired with an **Agentic AI IDE** (Antigravity, Cursor, Windsurf, Claude Code, GitHub Copilot).

```
                             ┌─────────────────────────────────────────┐
                             │               main branch               │
                             │      Production-Hardened PassTrack      │
                             └────────────────────┬────────────────────┘
                                                  │
                 ┌────────────────────────────────┼────────────────────────────────┐
                 │                                │                                │
                 ▼                                ▼                                ▼
  ┌─────────────────────────────┐  ┌─────────────────────────────┐  ┌─────────────────────────────┐  ┌─────────────────────────────┐
  │ feature/agent-1-ui          │  │ feature/agent-2-auth        │  │ feature/agent-3-payments    │  │ feature/agent-4-firestore-gas
  ├─────────────────────────────┤  ├─────────────────────────────┤  ├─────────────────────────────┤  ├─────────────────────────────┤
  │ 🎨 AGENT 1: UI / UX         │  │ 🔐 AGENT 2: AUTH & SESSION  │  │ 💳 AGENT 3: PAYMENTS        │  │ 🧱 AGENT 4: DATA & GAS      │
  │ • Unified Design Tokens     │  │ • Single Active Session     │  │ • Dynamic Checkout Modal    │  │ • Strict Firestore Rules   │
  │ • Glassmorphism CSS System  │  │ • Heartbeat Token Guard     │  │ • UPI / Gateway Simulator   │  │ • Apps Script Email Pipeline│
  │ • Micro-interactions & Toast│  │ • Global Route Guards       │  │ • Transaction Integrity     │  │ • Centralized Validator     │
  │ • Responsive Layouts        │  │ • Multi-role RBAC           │  │ • Ledger Entry Automation   │  │ • Schema Migration Scripts  │
  └──────────────┬──────────────┘  └──────────────┬──────────────┘  └──────────────┬──────────────┘  └──────────────┬──────────────┘
                 │                                │                                │                                │
                 └────────────────────────────────┼────────────────────────────────┴────────────────────────────────┘
                                                  │
                                                  ▼
                                    ┌───────────────────────────┐
                                    │    handoff/ sync matrix   │
                                    │ Contract-Driven Interface │
                                    └───────────────────────────┘
```

### The 4 Dedicated Branches:
| Agent | Branch Name | Primary Domain | Core Tech / Deliverables |
| :--- | :--- | :--- | :--- |
| **Agent 1** | `feature/agent-1-ui` | UI, UX, Styling, Design System | Vanilla CSS tokens, glassmorphism, responsive navigation, modals, toasts, skeleton loaders |
| **Agent 2** | `feature/agent-2-auth` | Single-User Login, Session Security, RBAC | Firebase Auth, single-session heartbeat, route guards (`auth-guard.js`), role access management |
| **Agent 3** | `feature/agent-3-payments` | Payment Gateway & Transaction Engine | Production UPI / Gateway flow, UTR/order idempotency, checkout modals, treasury auto-sync |
| **Agent 4** | `feature/agent-4-firestore-gas` | Cloud Firestore, Google Apps Script, Validations | `firestore.rules`, `email-template.gs`, `lib/validator.js`, schema integrity, webhook triggers |

---

## 2. Instant Agent Activation Protocol

When any teammate opens their Agentic AI IDE, they must simply type:

> **`I'M AGENT 1`** *(or `I'M AGENT 2`, `I'M AGENT 3`, `I'M AGENT 4`)*

### Autonomous Behavior for the Agent:
Upon receiving this prompt, the AI assistant MUST execute the following sequence:

1. **Self-Identify Role & Branch:** Check Git branch (`git branch --show-current`). Ensure the workspace is on the correct branch. If not, inform the user or switch to `feature/agent-X-*`.
2. **Read Boundaries:** Acknowledge owned files from [Section 4: Strict File & Module Ownership Matrix](#4-strict-file--module-ownership-matrix). Under NO circumstances may the agent overwrite another agent's dedicated logic files.
3. **Conduct the In-Depth Survey:** Immediately display the corresponding **Survey Questions** from [Section 3](#3-deep-dive-interactive-surveys) directly to the user in a clear, interactive multiple-choice & free-form format.
4. **Save User Choices:** Once the user answers, save their preferences to `handoff/agent-X-specs.json`.
5. **Inspect Cross-Agent Contracts:** Check `handoff/sync-registry.json` and any existing status files in `handoff/` to understand what other agents have produced.
6. **Execute Implementation:** Implement the features iteratively following the canonical `SPEC -> PLAN -> EXECUTE -> VERIFY -> COMMIT` loop.
7. **Publish Living Handoff Update:** Record changes in `handoff/agent-X-status.md` and commit with message: `feat(agent-X): <description>`.

---

## 3. Deep-Dive Interactive Surveys

When an agent is activated, it MUST present these survey questions to the developer to calibrate exact requirements and prevent any late-stage integration conflicts.

---

### SURVEY 1: Agent 1 (Frontend, UI/UX & Design System)
*Trigger Phrase:* **`I'M AGENT 1`**

```markdown
Hello Developer! I am AGENT 1 (UI, Styling & Design System Lead).
Before I refactor or touch any styling or layout, please confirm your architectural preferences:

### Q1.1 Theme & Visual Aesthetic Direction
[ ] Option A (Default Dark Luxury Glassmorphism): Deep slate background (#0a0f1d), glass frosted cards (backdrop-filter: blur(16px)), vivid accents (indigo #6366f1, cyan #06b6d4, violet #8b5cf6).
[ ] Option B (Modern Dual-Theme Light/Dark): System-aware theme toggle with high-contrast neutral backgrounds and clean border-radius cards.
[ ] Option C (Vibrant Campus Club Aesthetic): Saturated primary gradient (#6a11cb to #2575fc), bold typography, high-energy badges.

### Q1.2 Typography & Iconography
[ ] Option A: Google Fonts 'Plus Jakarta Sans' + 'Outfit' headings with pure SVG inline icons (zero external runtime dependencies).
[ ] Option B: 'Inter' + Lucide Icons loaded via unpkg CDN.
[ ] Option C: System font stack (SF Pro / Segoe UI / Roboto) with existing icons.

### Q1.3 Component System & Micro-Interactions
Which interactive UI components should I build into the core design system?
[ ] Toast Notification Hub (top-right animated toasts with auto-dismiss and progress bars)
[ ] Glass Modal Dialog Engine (smooth fade/scale animations, backdrop click dismiss, keyboard ESC)
[ ] Skeleton Loaders (shimmering placeholders for tickets, events, members, and merchandise while loading)
[ ] Mobile Responsive Drawer (hamburger menu for mobile viewport < 768px across all pages)
[ ] Sticky Floating Action Bar for Checkout / Save actions

### Q1.4 Page Modernization Priority
Which pages should receive the first visual overhaul?
[ ] Batch 1: Public Frontdoors (Landing `index.html`, Ticket Store `tickets/buy.html`, Merch Store `merch/store.html`, Member Register `members/register.html`)
[ ] Batch 2: Organizer Command Center (`organizer/dashboard.html`, `organizer/manage-event.html`, `organizer/setup-org.html`)
[ ] Batch 3: Operations & Portals (`distributor/scanner.html`, `treasury/dashboard.html`, `tasks/board.html`, `announcements/board.html`)
[ ] Batch 4: All pages simultaneously adhering strictly to shared `lib/theme.css` tokens.

### Q1.5 CSS Architecture
[ ] Option A: Single global design tokens file `lib/theme.css` + `lib/components.css` imported into existing page stylesheets (prevents breaking page-specific classes).
[ ] Option B: Full replacement of `style.css` and individual page `.css` files into a modular utility-first Vanilla CSS architecture.
```

---

### SURVEY 2: Agent 2 (Single-User Login, Session Management & RBAC)
*Trigger Phrase:* **`I'M AGENT 2`**

```markdown
Hello Developer! I am AGENT 2 (Authentication, Single-User Session & RBAC Lead).
Please calibrate the session and security architecture:

### Q2.1 "Single-User Login" Specification
How strictly should single-user login be enforced?
[ ] Option A (Strict Single-Active-Device Heartbeat): When a user logs in, a unique `activeSessionId` is written to Firestore `/active_sessions/{uid}`. If the same account logs in from another device or browser tab, the previous session is immediately invalidated with a warning toast ("Logged in from another location").
[ ] Option B (Single Admin + Delegated Staff Mode): Only ONE organizer account can hold the active Master Admin role at a time, while door volunteers use time-limited 6-digit access tokens with no persistent session.
[ ] Option C (Unified SSO Portal): All user roles (Organizer, Distributor/Scanner, Club Member, Treasurer) enter through a single login screen (`auth/login.html`) which inspects their role in Firestore and routes them to their authorized dashboard.
[ ] Option D: Combination of A + B + C (Enterprise Production Grade).

### Q2.2 Authentication Provider & Identity Options
Which sign-in methods should be enabled in `auth/login.html`?
[ ] Google OAuth Popup / Redirect (Firebase `GoogleAuthProvider`)
[ ] Email & Password with password reset flow
[ ] College Roll Number / Student ID lookup + OTP or Delegated Access Code
[ ] Anonymous Guest Mode for quick ticket checkouts

### Q2.3 Session Persistence & Idle Inactivity
[ ] `firebase.auth.Auth.Persistence.LOCAL` (Persist session across browser restarts)
[ ] `firebase.auth.Auth.Persistence.SESSION` (Invalidate session when the browser tab is closed)
[ ] Auto-logout after inactivity timer (e.g., 30 minutes of no mouse/keyboard events on organizer dashboard)

### Q2.4 Route Guard Architecture (`lib/auth-guard.js`)
How should unauthorized users be intercepted when accessing protected directories (`/organizer/`, `/treasury/`, `/distributor/`)?
[ ] Immediate hard redirect to `/auth/login.html?redirect=${encodeURIComponent(location.pathname)}`
[ ] Flash a graceful access-denied modal with a 3-second countdown before redirect
[ ] Public read-only preview mode with blurred cards and an "Unlock Organizer Portal" prompt

### Q2.5 User State Contract (`window.PassTrackAuth`)
Should `PassTrackAuth` broadcast reactive custom events to the DOM?
[ ] Yes, dispatch `passtrack:auth:change`, `passtrack:session:revoked`, and `passtrack:role:updated`
[ ] Yes, provide helper methods: `PassTrackAuth.getCurrentUser()`, `PassTrackAuth.hasRole('organizer')`, `PassTrackAuth.requireAuth()`, `PassTrackAuth.logout()`
```

---

### SURVEY 3: Agent 3 (Payment Gateway Engine & Ledger)
*Trigger Phrase:* **`I'M AGENT 3`**

```markdown
Hello Developer! I am AGENT 3 (Payment Gateway, Checkout & Ledger Lead).
Please define the transaction and checkout parameters:

### Q3.1 Gateway Execution Engine
Which payment pipeline should be implemented?
[ ] Option A (Dual-Mode Engine): Production UPI Simulator (with NPCI soundbox chime, dynamic QR generation, UTR verification) + Live Razorpay / Cashfree SDK integration toggleable via `CONFIG.PAYMENT_MODE`.
[ ] Option B (Hardened Dynamic UPI Gateway): Pure dynamic UPI intent links (`upi://pay?pa=...&pn=...&am=...&tr=...`) with QR generation, timer countdown (5:00 min), and manual/automatic UTR reference submission.
[ ] Option C (Razorpay Standard Web Checkout): Razorpay Checkout modal with webhook verification and payment signature validation.

### Q3.2 Checkout Modules to Hook
Which checkout flows must be wired to the payment engine?
[ ] Event Ticket Storefront (`tickets/buy.html`) with tiered ticket pricing (General vs Member discount)
[ ] Club Merchandise Storefront (`merch/store.html`) with size-selection and inventory deduction
[ ] Student Membership Dues (`members/register.html` and `members/directory.html`)

### Q3.3 Inventory & Race Condition Handling
How should ticket and merchandise inventory be guarded against overselling during checkout?
[ ] Optimistic Hold: Decrement temporary stock in Firestore on checkout open for 5 minutes; release stock if abandoned or expired.
[ ] Atomic Commit on Verified Payment: Verify stock availability inside a Firestore atomic transaction (`runTransaction`) right before issuing the ticket/order.
[ ] Soft Inventory: Allow order placement and flag status as `PAYMENT_PENDING` with automated timeout.

### Q3.4 Automated Treasury Ledger Integration
When a transaction succeeds, what financial records should be created?
[ ] Automatically write credit entry to Firestore `/treasury` collection (`type: 'INCOME'`, `category: 'TICKETS' | 'MERCH' | 'DUES'`)
[ ] Update organization cash balance atomically
[ ] Generate an encrypted receipt token stored on `/orders/{orderId}`

### Q3.5 Payment UI & User Feedback
[ ] High-fidelity payment modal with soundbox audio feedback, progress steps, and animated success checkmark
[ ] Printable PDF / HTML Order Receipt with cryptographic QR code for door redemption
```

---

### SURVEY 4: Agent 4 (Cloud Firestore, GAS Email & Validation)
*Trigger Phrase:* **`I'M AGENT 4`**

```markdown
Hello Developer! I am AGENT 4 (Cloud Firestore, Google Apps Script & Validation Lead).
Please define the backend, schema, and validation rules:

### Q4.1 Cloud Firestore Rules Hardening Scope (`firestore.rules`)
Which security rules require tightening?
[ ] Tamper-Proof Pricing: Enforce that ticket prices and merch item unit prices cannot be overwritten by client payloads during order creation.
[ ] Single-Session Document Guard: Restrict write access on `/active_sessions/{uid}` so only the authenticated user can claim a session.
[ ] Dynamic Stock Constraints: Allow public checkouts to decrement stock count without modifying title, description, or base price.
[ ] Multi-Organization Multi-Tenancy: Isolate club data so an organizer of Club A cannot read or write data of Club B.

### Q4.2 Google Apps Script Email Engine (`email-template.gs`)
What automated email templates should be supported?
[ ] Digital Ticket Pass Email (with high-res QR code, event schedule, venue map link, and attendee token)
[ ] Merchandise Purchase Confirmation & Receipt
[ ] Club Membership Activation & Digital ID Card
[ ] Staff Scanner Authorization Key Dispatch
[ ] Treasury Monthly Summary / Payout Notification

### Q4.3 Google Apps Script Integration Architecture
How will the web client trigger the Google Apps Script service?
[ ] Client-Side Direct Fetch (`fetch(GAS_WEBHOOK_URL, { method: 'POST', mode: 'no-cors' })`) with pre-shared security token `SECURITY_TOKEN = "PT_SECURE_2026"`
[ ] Firestore Trigger: Client writes to `/mail_queue/{id}`; an external Google Cloud Function or periodic Apps Script polls the queue and dispatches emails.
[ ] Dual Fallback: Try direct Apps Script fetch; on failure, push to Firestore fallback collection `/email_retry_queue`.

### Q4.4 Input Validation & Sanitization Engine (`lib/validator.js`)
What rules must be enforced in the shared validation library?
[ ] Phone Number: Strict 10-digit Indian Mobile regex (`/^[6-9]\d{9}$/`)
[ ] Email: RFC-5322 sanitized email regex + campus college domain whitelist check (optional)
[ ] Currency & Amount: Non-negative integers, maximum transaction caps (e.g. ₹50,000)
[ ] XSS Sanitization: Coerce and escape all string inputs, block HTML tags from announcement boards and member names
[ ] Cryptographic Ticket Token Verifier: HMAC/SHA-256 validation for scanner check-ins
```

---

## 4. Strict File & Module Ownership Matrix

To prevent merge conflicts, each agent has exclusive write ownership over specific files. If an agent needs a feature from another agent's domain, it **MUST use the Contract Interface** instead of altering the other agent's source files!

```
PassTrack Project Root
├── lib/
│   ├── contracts/
│   │   ├── passtrack-core.js        <-- [SHARED CONTRACT] Defines window.PassTrack namespace
│   │   └── mock-stubs.js            <-- [SHARED CONTRACT] Fallback stubs for isolated testing
│   ├── theme.css                    <-- [AGENT 1 OWNED] Colors, tokens, typography, glassmorphism
│   ├── components.css               <-- [AGENT 1 OWNED] Modals, toasts, buttons, cards, skeletons
│   ├── toast.js                     <-- [AGENT 1 OWNED] Toast notification dispatcher
│   ├── auth-guard.js                <-- [AGENT 2 OWNED] Route protection & session validation
│   ├── session-manager.js           <-- [AGENT 2 OWNED] Single active session enforcement
│   ├── payment-engine.js            <-- [AGENT 3 OWNED] Payment coordinator & transaction state
│   ├── upi-gateway.js / .css        <-- [AGENT 3 OWNED] UPI simulation / checkout modal
│   ├── validator.js                 <-- [AGENT 4 OWNED] Centralized input sanitizer & validation
│   └── db-service.js                <-- [AGENT 4 OWNED] Firestore atomic transaction helpers
├── auth/
│   ├── login.html / .css / .js      <-- [AGENT 2 PRIMARY OWNED] (Agent 1 styles via theme.css)
├── organizer/
│   ├── dashboard.html / .js / .css  <-- [HTML/CSS: AGENT 1] [State/Logic: AGENT 2 & 4]
│   ├── manage-event.html / .js      <-- [HTML/CSS: AGENT 1] [Form Validation: AGENT 4]
│   └── setup-org.html / .js         <-- [HTML/CSS: AGENT 1] [Org Creation: AGENT 4]
├── tickets/
│   ├── buy.html / .css              <-- [HTML/CSS: AGENT 1]
│   └── buy.js                       <-- [AGENT 3: Checkout] [AGENT 4: Stock validation]
├── members/
│   ├── register.html / .css / .js   <-- [HTML/CSS: AGENT 1] [Dues Pay: AGENT 3] [Validation: AGENT 4]
│   └── directory.html / .js         <-- [HTML/CSS: AGENT 1] [Auth: AGENT 2] [Data: AGENT 4]
├── merch/
│   ├── store.html / .css            <-- [HTML/CSS: AGENT 1]
│   └── store.js                     <-- [AGENT 3: Cart & Pay] [AGENT 4: Stock validation]
├── distributor/
│   └── scanner.html / .js           <-- [HTML/CSS: AGENT 1] [Auth: AGENT 2] [Token Check: AGENT 4]
├── treasury/
│   └── dashboard.html / .js         <-- [HTML/CSS: AGENT 1] [Auth: AGENT 2] [Ledger Sync: AGENT 3 & 4]
├── firestore.rules                  <-- [AGENT 4 EXCLUSIVE OWNED]
├── email-template.gs                <-- [AGENT 4 EXCLUSIVE OWNED]
└── handoff/                         <-- [SHARED INTER-AGENT SYNC DIRECTORY]
```

### Conflict Prevention Rules:
1. **Never rename existing DOM IDs:** HTML files contain IDs like `#login-form`, `#google-signin-btn`, `#buy-btn`, `#scanner-container`. Agent 1 must restyle classes without removing or altering functional IDs.
2. **Never inline conflicting Firebase calls:** Use `window.PassTrackDB` or modular functions so schema changes by Agent 4 are consumed uniformly.
3. **Always use CustomEvents for cross-module triggers:** e.g., Agent 3 triggers `document.dispatchEvent(new CustomEvent('passtrack:payment:success', { detail: order }))`, which Agent 4's listener catches to dispatch the confirmation email.

---

## 5. The PassTrack Global Contract System

All 4 agents interact through the unified, collision-free global namespace: **`window.PassTrack`**.

```javascript
// File: lib/contracts/passtrack-core.js
window.PassTrack = window.PassTrack || {
    version: "2026.1.0",

    // ==========================================
    // AGENT 1 CONTRACT: UI & DESIGN SYSTEM
    // ==========================================
    UI: {
        toast: (message, type = 'info', duration = 4000) => {},
        showModal: (modalId, options = {}) => {},
        closeModal: (modalId) => {},
        renderSkeleton: (containerSelector, type = 'card', count = 3) => {},
        setButtonLoading: (buttonElement, isLoading, loadingText = 'Processing...') => {}
    },

    // ==========================================
    // AGENT 2 CONTRACT: AUTH & SESSION ENGINE
    // ==========================================
    Auth: {
        getCurrentUser: () => null,           // Returns Firebase User or null
        getCurrentRole: () => 'guest',         // 'organizer' | 'distributor' | 'member' | 'guest'
        hasRole: (requiredRole) => false,
        requireAuth: (requiredRole = null) => {}, // Redirects to /auth/login.html if unauthorized
        enforceSingleSession: async (uid) => {},   // Heartbeat listener against /active_sessions/{uid}
        logout: async () => {}
    },

    // ==========================================
    // AGENT 3 CONTRACT: PAYMENT & CHECKOUT ENGINE
    // ==========================================
    Payments: {
        initiateCheckout: async ({ amount, description, orderType, metadata, onSuccess, onFailure }) => {},
        verifyPayment: async (transactionReference) => {},
        recordTreasuryIncome: async ({ orgId, amount, category, referenceId }) => {}
    },

    // ==========================================
    // AGENT 4 CONTRACT: DATA, VALIDATION & NOTIFY
    // ==========================================
    DB: {
        createTicketOrderAtomic: async (orderPayload) => {},
        decrementMerchStockAtomic: async (productId, size, quantity) => {},
        fetchEventDetails: async (eventId) => {},
        logAuditTrail: async (action, details) => {}
    },
    Validator: {
        validateEmail: (email) => Boolean,
        validatePhone: (phone) => Boolean,
        sanitizeString: (input) => String,
        validateAmount: (amount) => Boolean
    },
    Notifier: {
        sendTicketEmail: async (orderData) => {},
        sendReceiptEmail: async (receiptData) => {}
    }
};
```

---

## 6. Inter-Agent Living Handoff Protocol

Each agent communicates its progress, exposed DOM hooks, and requirements asynchronously via markdown and JSON files inside `handoff/`.

```
handoff/
├── sync-registry.json          <-- Live state of what functions are available
├── agent-1-status.md           <-- Agent 1's latest UI changes, component classes, DOM IDs
├── agent-2-status.md           <-- Agent 2's auth state, session schema, route guard hooks
├── agent-3-status.md           <-- Agent 3's payment modal triggers, callback signatures
└── agent-4-status.md           <-- Agent 4's Firestore collections, GAS endpoints, validator methods
```

### Format of `handoff/sync-registry.json`:
```json
{
  "updated_at": "2026-10-10T22:00:00Z",
  "agent_1_ui": {
    "status": "IN_PROGRESS",
    "theme_tokens_ready": true,
    "toast_ready": true,
    "modal_ready": true,
    "css_bundle": "lib/theme.css"
  },
  "agent_2_auth": {
    "status": "IN_PROGRESS",
    "single_session_ready": true,
    "auth_guard_ready": true,
    "active_session_collection": "active_sessions"
  },
  "agent_3_payments": {
    "status": "IN_PROGRESS",
    "checkout_engine_ready": true,
    "events_emitted": ["passtrack:payment:success", "passtrack:payment:failed"]
  },
  "agent_4_backend": {
    "status": "IN_PROGRESS",
    "firestore_rules_hardened": true,
    "validator_ready": true,
    "gas_email_ready": true
  }
}
```

### Agent Periodic Sync Rule:
Before starting any sub-task, the agent runs a quick inspection:
1. `git log -n 1 --oneline`
2. Check `handoff/sync-registry.json` and respective `agent-X-status.md` files.
3. If another agent completed a contract (e.g., Agent 4 completed `validateEmail`), the current agent immediately uses the real method instead of a stub.

---

## 7. Git Branching Strategy & Zero-Conflict Merge Runbook

### Step 1: Branch Creation (Run once from `main`)
Execute these commands to generate all 4 isolated feature tracks:

```bash
# Ensure main is clean and up-to-date
git checkout main
git pull origin main

# Create the 4 feature branches
git branch feature/agent-1-ui
git branch feature/agent-2-auth
git branch feature/agent-3-payments
git branch feature/agent-4-firestore-gas

# Push all branches to remote
git push -u origin feature/agent-1-ui
git push -u origin feature/agent-2-auth
git push -u origin feature/agent-3-payments
git push -u origin feature/agent-4-firestore-gas
```

### Step 2: Teammate Working Instructions
Each developer switches to their dedicated branch before opening their AI IDE:
- Developer 1: `git checkout feature/agent-1-ui`
- Developer 2: `git checkout feature/agent-2-auth`
- Developer 3: `git checkout feature/agent-3-payments`
- Developer 4: `git checkout feature/agent-4-firestore-gas`

### Step 3: Atomic Commit Format
Every commit on every branch must follow semantic scoping:
- `feat(ui): implement glassmorphism design tokens in lib/theme.css`
- `feat(auth): add single session heartbeat to lib/session-manager.js`
- `feat(pay): wire UPI checkout modal with audio chime in lib/payment-engine.js`
- `feat(data): harden firestore rules for merchandise stock decrement`

### Step 4: The Canonical 5-Phase Merge Runbook
When all 4 branches complete their tasks, merge into `main` strictly in the following sequence to guarantee zero regression:

```
                          MERGE SEQUENCE TIMELINE

 PHASE 1: FOUNDATION           PHASE 2: AUTH & GUARDS       PHASE 3: PAYMENTS & ENGINE
 ┌──────────────────────┐      ┌──────────────────────┐     ┌──────────────────────┐
 │ Agent 4 (Data & Rules)│ ───► │ Agent 2 (Auth Engine)│ ───►│ Agent 3 (Payment Flow│
 │ • firestore.rules    │      │ • lib/auth-guard.js  │     │ • payment-engine.js  │
 │ • lib/validator.js   │      │ • session-manager.js │     │ • upi-gateway.js     │
 │ • email-template.gs  │      │ • login.html         │     │ • tickets/buy.js     │
 └──────────────────────┘      └──────────────────────┘     └──────────────────────┘
                                                                       │
                                                                       ▼
             PHASE 5: PRODUCTION VERIFICATION              PHASE 4: DESIGN & POLISH
             ┌──────────────────────┐                      ┌──────────────────────┐
             │ End-to-End System Test│ ◄─────────────────── │ Agent 1 (UI System)  │
             │ • Single-login check │                      │ • lib/theme.css      │
             │ • Payment pass test  │                      │ • lib/components.css │
             │ • Email dispatch test│                      │ • HTML visual polish │
             └──────────────────────┘                      └──────────────────────┘
```

#### Detailed Merge Commands:
```bash
# --- PHASE 1: Merge Agent 4 (Data Foundation) ---
git checkout main
git pull origin main
git merge feature/agent-4-firestore-gas -m "merge: integrate Agent 4 (Firestore rules, GAS, validator)"
git push origin main

# --- PHASE 2: Merge Agent 2 (Auth & Session Guard) ---
git checkout feature/agent-2-auth
git rebase main
git checkout main
git merge feature/agent-2-auth -m "merge: integrate Agent 2 (Single-user login, session guard)"
git push origin main

# --- PHASE 3: Merge Agent 3 (Payment Engine) ---
git checkout feature/agent-3-payments
git rebase main
git checkout main
git merge feature/agent-3-payments -m "merge: integrate Agent 3 (Payment engine & checkout)"
git push origin main

# --- PHASE 4: Merge Agent 1 (UI & Design System) ---
git checkout feature/agent-1-ui
git rebase main
git checkout main
git merge feature/agent-1-ui -m "merge: integrate Agent 1 (Design tokens, components & layout)"
git push origin main

# --- PHASE 5: Verification & Tag ---
git tag -a v2026.1.0-production -m "PassTrack production multi-agent release"
git push origin --tags
```

---

## 8. Mock Stubs & Isolated Development Mode

To allow **Agent 1** (UI) or **Agent 3** (Payments) to develop and test immediately without waiting for **Agent 2** or **Agent 4** to finish, `lib/contracts/mock-stubs.js` provides automatic mock fallbacks when live Firebase services or credentials are not yet merged.

### Safe Fallback Logic:
- If `window.firebase` is uninitialized, `PassTrack.Auth` returns a mocked Organizer profile (`{ uid: "mock-organizer-01", email: "organizer@nmit.ac.in", role: "organizer" }`).
- If `PassTrack.Payments` is triggered in test mode, it generates simulated NPCI UTR numbers without failing.
- If `PassTrack.Validator` is called before Agent 4 commits, built-in standard regexes handle inputs safely.

---

## 🏁 Summary Checklist for Developers

- [ ] All 4 teammates have cloned the repository.
- [ ] Developer 1 runs: `git checkout feature/agent-1-ui` -> Prompt: `I'M AGENT 1`
- [ ] Developer 2 runs: `git checkout feature/agent-2-auth` -> Prompt: `I'M AGENT 2`
- [ ] Developer 3 runs: `git checkout feature/agent-3-payments` -> Prompt: `I'M AGENT 3`
- [ ] Developer 4 runs: `git checkout feature/agent-4-firestore-gas` -> Prompt: `I'M AGENT 4`
- [ ] Each AI IDE surveys the developer, saves answers in `handoff/`, and begins execution.
- [ ] Merge in order: **Agent 4 -> Agent 2 -> Agent 3 -> Agent 1**.
