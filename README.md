<div align="center">
  <img src="https://img.shields.io/badge/Made%20for-Odoo%20x%20NMIT%20Hackathon-6a11cb?style=for-the-badge" alt="Hackathon Badge">
  <img src="https://img.shields.io/badge/Status-Production%20Hardened%202026-00b894?style=for-the-badge" alt="Production Badge">
  <img src="https://img.shields.io/badge/Security-Strict%20Defense%20in%20Depth-0984e3?style=for-the-badge" alt="Security Badge">
  <img src="https://img.shields.io/badge/Architecture-Zero%20Frontend%20Secrets-fdcb6e?style=for-the-badge" alt="Zero Secrets Badge">
  
  <br><br>
  <h1>🚀 PassTrack | Student Organization Operating System</h1>
  <p><strong>The unified digital platform engineered to eliminate chaotic spreadsheets, lost cash, and disjointed messaging groups across campus clubs.</strong></p>
  <p><em>Designed & Developed by <strong>Team ByteSmiths for Odoo</strong></em></p>
</div>

<hr>

## 👥 Meet Team ByteSmiths
Proudly conceptualized, engineered, and hardened by:
* **Ananya Chandra**
* **Yusuf Amjherawala**
* **Anjali Bibra**
* **Mitali Rana**

---

## 🎯 The Vision & Architecture
Running a student organization often involves coordinating dozens of active members, planning large-scale ticketed events, selling club merchandise, handling funds in physical cash boxes, and broadcasting updates across fragmented messaging chats.

**PassTrack** replaces this friction with a unified, elegant, and secure cloud platform. From multi-checkpoint event admissions and dynamic dues management to real-time treasury accounting, live merchandise stores, and broadcast email dispatches, PassTrack empowers student leaders to operate campus organizations with enterprise-grade precision.

```
                           ┌────────────────────────────┐
                           │      PassTrack Portal      │
                           │     (Vanilla JS + CSS3)    │
                           └──────────────┬─────────────┘
                                          │
                 ┌────────────────────────┼────────────────────────┐
                 │                        │                        │
                 ▼                        ▼                        ▼
       ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
       │ Public Services  │     │ Organizer Hub    │     │ Security Layer   │
       │  • Tickets Store │     │  • Directory     │     │  • Zero Secrets  │
       │  • Merch Store   │     │  • Treasury      │     │  • XSS Defense   │
       │  • Join/Pay Dues │     │  • Tasks Board   │     │  • Firestore     │
       │  • Notice Board  │     │  • Announcements │     │    Firewall      │
       └─────────┬────────┘     └─────────┬────────┘     └─────────┬────────┘
                 │                        │                        │
                 └────────────────────────┼────────────────────────┘
                                          │
                                          ▼
                               ┌─────────────────────┐
                               │   Cloud Firestore   │
                               │  + Firebase Auth    │
                               │  + UPI Gateway Sim  │
                               └─────────────────────┘
```

---

## 🛡️ Enterprise Security & Threat Defense Model

PassTrack implements a multi-layered **Defense-in-Depth** model specifically hardened against web vulnerabilities:

### 1. 🔐 Zero API Secrets on Frontend
* **No Private Keys Exposed:** Static client web applications never include Firebase Admin private keys, service account credentials, database passwords, or Google Cloud IAM secrets.
* **Separation of Configuration:** The repository maintains placeholder configuration in [`lib/firebase-config.js`](file:///e:/D%20Drive/Documents/Projects/PassTrack%20Token%20Distro/PassTrack%20Nmit-x-Odoo/lib/firebase-config.js). During CI/CD builds (e.g., Netlify), [`setup-firebase.js`](file:///e:/D%20Drive/Documents/Projects/PassTrack%20Token%20Distro/PassTrack%20Nmit-x-Odoo/setup-firebase.js) injects environment variables securely into the bundle, ensuring `.env` files and credentials are never committed to version control.

### 2. 🛡️ Protection Against SQL & NoSQL Injections
* **Parameterized Query Execution:** In Cloud Firestore, queries do not construct raw query strings (avoiding classic `' OR '1'='1'` SQL injection flaws). Queries use strict SDK parameter binding.
* **NoSQL Query Poisoning Defense:** All parameters received from URLs and user inputs are strictly coerced into primitive types (`String`, `Number`, `Boolean`), preventing object injection or prototype pollution attacks.

### 3. 🧼 Anti-XSS & Script Injection Shield
* **Universal HTML Escaping:** Dynamic text inserted into the DOM is escaped via dedicated `escapeHtml()` utilities to ensure user-supplied strings cannot execute arbitrary JavaScript.
* **Markdown Sanitization:** Club announcements and rich-text boards utilize `DOMPurify.sanitize()` combined with `marked.js` to strip malicious tags (`<script>`, `<iframe>`, `onerror`, `onload`).
* **Protocol Whitelisting:** External assets (like merchandise images) enforce strict protocol validation (`http://` or `https://` only), eliminating `javascript:` pseudo-protocol attacks.

### 4. 🧱 Cloud Firestore Security Firewall (`firestore.rules`)
Every transaction and write is verified server-side by Firestore rules before persisting:
* **Tamper-Proof Transactions:** Clients cannot alter unit prices, forge discounts, or inject negative revenue.
* **Inventory Stock Decrement Bounds:** Store checkouts are limited to decrementing size quantities atomically without modifying product title, pricing, or club ownership.
* **Role Verification:** Critical actions (editing tasks, deleting merchandise, viewing treasury ledgers, publishing notices) require authenticated organizer privileges.
* **Schema Validation:** Enforces string length limits, numeric bounds, and required metadata fields across all incoming documents.

---

## ✨ Core Modules & Feature Breakdown

### 🙋‍♂️ 1. Member Directory & Lifecycle Management (`members/`)
* **Public Member Registration (`register.html`):** Students can join an organization with instant validation for full name, email, student ID, and 10-digit mobile phone.
* **Dynamic Dues & Activation:** Real-time calculation of membership fees and duration. Free clubs activate immediately; paid clubs support instant UPI simulation or treasurer offline activation.
* **Organizer Control Directory (`directory.html`):** Real-time search, filter by membership status (`Active`, `Pending`, `Expired`), quick dues toggle with automatic treasury ledger sync, edit member modal, and CSV export.
* **Membership Status Lookup:** Students can check their active membership pass, expiry date, and dues status at any time.

### 🎟️ 2. Dynamic Event Management & Digital Ticketing (`tickets/`)
* **Public Ticket Storefront (`buy.html`):** Attendees select between General Admission and Member Tickets with real-time membership verification.
* **Member Eligibility Verification:** Automatically queries the club's active member directory to apply member discounts only to verified, dues-paid students.
* **Duplicate Purchase Guards:** Validates email and event records to prevent accidental duplicate purchases.
* **Digital Pass Generator (`viewer/viewer.html`):** Issues high-resolution cryptographic QR passes with station-specific clearance permissions.
* **Order History / My Tickets:** Attendees can look up their booked passes by entering their email address.

### 👕 3. Club Merchandise Store & Inventory Control (`merch/`)
* **Organizer Catalog Manager (`manage-merch.html`):** Add and manage merchandise with images, category tags, regular pricing, member pricing, and size-specific inventory breakdown (S, M, L, XL, XXL).
* **Public Storefront (`store.html`):** Responsive storefront with real-time stock indicators, member discount recognition, and size selection.
* **Atomic Inventory Decrement:** Uses Firestore atomic transactions to prevent race conditions during merchandise drops.
* **My Orders & History Modal:** Shoppers can track order fulfillment status (`Ordered`, `Ready for Pickup`, `Collected`) using their registered email.

### 📢 4. Centralized Notice Board & Announcements (`announcements/`)
* **Notice Board Admin (`admin.html`):** Create club updates with live Markdown Write/Preview tabs, category badges, and pin-to-top toggles.
* **Public Notice Board (`board.html`):** Clean, accessible bulletin board displaying club news and event briefings.
* **Email Broadcasts:** Integrated with Google Apps Script to deliver announcements directly to active club members.

### 📋 5. Task Board & Volunteer Coordination (`tasks/`)
* **Responsive Kanban (`board.html`):** Organizes team tasks into `To Do`, `In Progress`, and `Completed` columns.
* **Desktop Drag-and-Drop & Mobile Quick-Move:** Full drag-and-drop on desktop, paired with one-tap status move buttons for mobile screens.
* **Task Prioritization:** Color-coded priority badges (`Urgent`, `High`, `Medium`, `Low`) with member assignment and deadline tracking.

### 💰 6. Transparent Treasury & Financial Ledger (`treasury/`)
* **Financial Dashboard (`dashboard.html`):** Real-time income, expense, and net balance calculation.
* **Automated Revenue Ingestion:** Automatically logs ticket sales, merchandise revenue, and member dues directly into the ledger.
* **Interactive Analytics:** Responsive Chart.js visualizations showing revenue by category and monthly cash flow.
* **Export Ledger:** One-click CSV export for official audit reports.

### 📱 7. Realistic UPI Payment Gateway Simulation (`lib/upi-gateway.js`)
* **Interactive Modal Experience:** Generates a realistic UPI payment modal with dynamic QR codes, UPI Intent links, and timer countdowns.
* **Unique Transaction References (UTR):** Issues randomized 12-digit UTR bank references for complete realism and ledger reconciliation.

---

## 🛠️ Technology Stack

| Layer | Technologies & Tools |
|---|---|
| **Frontend Framework** | Pure Vanilla HTML5, Modern CSS3 (Custom Properties & Flex/Grid), Vanilla ES6+ JavaScript |
| **Icons & Typography** | Phosphor Icons (`@phosphor-icons/web`), Google Fonts (Inter, Outfit) |
| **Security & Utilities** | `DOMPurify` (XSS Sanitizer), `marked.js` (Markdown Engine), `Chart.js` (Financial Charts) |
| **Backend & Database** | Google Cloud Firestore (NoSQL), Firebase Authentication (Google OAuth & Delegated Access) |
| **Automation** | Google Apps Script (Automated Gmail API Dispatch Engine) |
| **Deployment** | Netlify (`netlify.toml` build commands and single-page routing) |

---

## 📁 Repository Structure

```plaintext
PassTrack/
├── announcements/            # Notice board & broadcast announcement system
│   ├── admin.html / admin.js # Organizer announcement creation & preview
│   ├── admin.css             # Responsive styling for announcement manager
│   ├── board.html / board.js # Public club bulletin board
│   └── board.css             # Bulletin board styles
├── auth/                     # Authentication & delegated sign-in
│   ├── login.html / login.js # Google OAuth & staff access portal
│   └── login.css             # Authentication styling
├── distributor/              # Mobile ticket scanning module
│   ├── distributor.html      # Scanner station login portal
│   └── scanner.html / js     # Camera-based multi-station QR scanner
├── lib/                      # Core configuration & shared services
│   ├── firebase-config.js    # Client-safe configuration template (No hardcoded secrets)
│   ├── upi-gateway.js        # Realistic simulated UPI payment gateway
│   └── upi-gateway.css       # Payment modal styles & responsive dialogs
├── members/                  # Club membership management
│   ├── directory.html / js   # Organizer member directory, dues, and bulk actions
│   ├── directory.css         # Modern light-theme responsive table/cards
│   ├── register.html / js    # Public self-serve member registration & dues
│   └── register.css          # Registration portal styling
├── merch/                    # Merchandise catalog & inventory
│   ├── manage-merch.html/js  # Product management, size stock & orders dashboard
│   ├── manage-merch.css      # Inventory management stylesheet
│   ├── store.html / store.js # Public student merchandise storefront & order history
│   └── store.css             # Storefront layout & product card styles
├── organizer/                # Core organizer management
│   ├── dashboard.html / js   # Main organizer control center & event hub
│   ├── manage-event.html/js  # Event configuration, station setups & reports
│   └── setup-org.html / js   # Organization profile & dues onboarding
├── tasks/                    # Internal Kanban volunteer delegation
│   ├── board.html / board.js # Drag-and-drop & mobile quick-move task workflow
│   └── board.css             # Kanban columns & card styling
├── tickets/                  # Public ticketing & checkout
│   ├── buy.html / buy.js     # Tiered ticket purchase, member verification & history
│   ├── buy.css               # Ticketing card styles
│   └── view.html             # Organizer attendee sales breakdown
├── treasury/                 # Financial ledger & analytics
│   ├── dashboard.html / js   # Real-time revenue, expense & balance tracking
│   └── dashboard.css         # Light-theme financial charts & ledger styling
├── viewer/                   # Digital attendee access pass
│   └── viewer.html / js      # Responsive ticket QR presentation
├── .env.example              # Example environment variable template
├── firestore.rules           # Production-hardened security rules
├── firebase.json             # Firebase project configuration
├── netlify.toml              # Netlify build configuration
├── setup-firebase.js         # Build script injecting environment variables
└── style.css                 # Universal design system & CSS tokens
```

---

## 🚀 Getting Started & Local Setup

### 1. Clone the Repository
```bash
git clone https://github.com/yusufamjhera-code/Student_Organization_System-ODOO-x-NMIT.git
cd Student_Organization_System-ODOO-x-NMIT
```

### 2. Configure Environment Variables
Create a local `.env` file from the example:
```bash
cp .env.example .env
```
Populate the environment variables:
```env
FIREBASE_API_KEY="your-api-key"
FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
FIREBASE_APP_ID="your-app-id"
FIREBASE_MEASUREMENT_ID="your-measurement-id"
GOOGLE_SCRIPT_URL="https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec"
```

Generate the local client configuration:
```bash
node setup-firebase.js
```

### 3. Deploy Firestore Security Rules
Deploy the hardened rules directly using the Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

### 4. Run Locally
Run any local static development server:
```bash
# Using Python
python -m http.server 8000

# Or using Node.js
npx.cmd serve .
```
Open your browser to `http://localhost:8000`.

---

## 🔒 Firestore Security Rules Reference

Database access control and validation constraints are maintained in [`firestore.rules`](firestore.rules). Deploy them to Firebase with:

```bash
firebase deploy --only firestore:rules
```

### Security Enforcement Summary:
* **`organizers`**: Read/write strictly restricted to the authenticated document owner (`request.auth.uid == uid`).
* **`organizations`**: Public read for active clubs; create/update/delete restricted to authenticated owners.
* **`events`**: Public read for storefronts; creation restricted to authenticated organizers; ticket sales can only increment `seatsSold` in transactions.
* **`users` (Passes)**: Public read for gate scanner & pass viewer; ticket booking validates name, email, token, and payment status; check-in staff can only update station permissions.
* **`members`**: Public read for member discount lookups; registration validates unique email, name, and initial status; dues activation requires verified payment status.
* **`announcements`**: Public read for the notice board; publication and modifications restricted to authenticated club organizers.
* **`merchProducts` & `merchOrders`**: Public catalog browsing and order placement with strict field, price, and quantity validations; order fulfillment status (`ready`, `collected`) restricted to authenticated staff.
* **`tasks` (Kanban)**: Read/write restricted entirely to authenticated organizers and assigned collaborators.
* **`transactions` (Treasury)**: Automated positive revenue logging from ticket, merchandise, and dues checkouts; full ledger view and manual adjustments restricted to authenticated organizers.

---

## 🏆 Hackathon Context
Developed for the **Odoo x NMIT Hackathon** to demonstrate how an integrated, modular digital ecosystem can streamline campus club administration, eliminate human error in ticketing, and deliver complete financial transparency.

<div align="center">
  <p>© 2026 PassTrack. Designed and Developed by <strong>Team ByteSmiths for Odoo</strong>.</p>
</div>
