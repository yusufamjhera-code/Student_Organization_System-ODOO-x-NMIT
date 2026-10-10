<div align="center">
  <img src="https://img.shields.io/badge/Made%20for-Odoo%20x%20NMIT%20Hackathon-6a11cb?style=for-the-badge" alt="Hackathon Badge">
  <img src="https://img.shields.io/badge/Status-Production%20Ready%202026-00b894?style=for-the-badge" alt="Production Badge">
  <img src="https://img.shields.io/badge/Security-Hardened%20Rules-0984e3?style=for-the-badge" alt="Security Badge">
  
  <br><br>
  <h1>🚀 PassTrack | Student Organization System</h1>
  <p><strong>The unified digital operating system engineered to eliminate chaotic spreadsheets, lost cash, and disjointed messaging groups across campus clubs.</strong></p>
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

## 🎯 The Vision & The Challenge
Running a student organization often involves coordinating dozens of active members, planning large-scale ticketed events, selling club merchandise, handling funds in physical cash boxes, and broadcasting updates across fragmented WhatsApp groups.

**PassTrack** replaces this disjointed friction with a single, elegant, and secure cloud platform. From multi-checkpoint event admissions and dynamic dues management to real-time treasury accounting and broadcast email dispatches, PassTrack empowers student leaders to run their organizations like high-functioning enterprises.

---

## ✨ Core Modules & Feature Deep-Dive

### 🙋‍♂️ 1. Smart Member Directory & Lifecycle Management
* **Self-Service Registration:** Dedicated portal (`members/register.html`) with input validation, phone normalization, and dynamic dues status calculation.
* **Granular Status Tracking:** Automatic classification into `Active`, `Pending`, or `Expired` memberships.
* **Bulk Operations & Automated Reminders:** Integrated Google Apps Script email dispatch to send automated renewal warnings and dues reminders directly to members' inboxes with one click.
* **Instant Member Discounts:** System-wide recognition of active member emails for automated discounts across ticket purchases and merchandise orders.

### 🎟️ 2. Dynamic Event Management & Digital Ticketing
* **Tiered Ticket Configurations:** Configure distinct pricing for regular attendees vs. verified club members, seat limits, and scheduled sales windows.
* **Duplicate Purchase Guards:** Real-time email validation prevents duplicate ticket purchases for the same event.
* **Secure Digital Passes:** Generates cryptographically secure QR tokens (`viewer/viewer.html`) containing attendee details and station clearance permissions.
* **Real-Time Revenue Synchronization:** Every ticket purchase automatically increments event attendance, decrements available seats, and records an income transaction in the organization's Treasury.

### 📷 3. High-Speed Multi-Station Door Scanner
* **Camera-Based Web Scanner:** Built on `html5-qrcode` (`distributor/scanner.html`) for ultra-responsive check-ins on mobile and tablet devices.
* **Station Checkpoints:** Supports multi-checkpoint permissions (e.g., Main Entrance, Dinner/Food Counter, Backstage, VIP Area).
* **Anti-Passback & Duplicate Prevention:** Passes already validated at a specific station trigger instant audio-visual warnings (`Already Used`) with previous check-in timestamps.
* **Offline-Tolerant Delegated Access:** Staff sign in with event-specific access codes, removing the need to distribute master Firebase organizer credentials to volunteer door teams.

### 📢 4. Centralized Announcement Board & Mailing Dispatch
* **Rich Markdown Support:** Formatted club announcements with headings, lists, code blocks, and emphasis.
* **XSS Sanitization:** Powered by `DOMPurify` to ensure sanitized rendering of member-facing announcements.
* **Instant Email Broadcasts:** Organizers can broadcast announcements to all active members via Google Apps Script with automated batch delivery and exponential pacing.

### 👕 5. Club Merchandise Store & Inventory Control
* **Public Catalog & Member Pricing:** Responsive showcase (`merch/store.html`) allowing members and general students to browse merchandise 24/7 with automatic member discount perks.
* **Live Stock Decrementing:** Atomic Firestore transactions prevent race conditions and overselling during peak product drops (e.g., club hoodies).
* **Automated Ledger Entries:** Each fulfilled order generates automated records directly inside the treasury ledger.

### 📋 6. Volunteer Task Board & Kanban Workflow
* **Visual Kanban Columns:** Organize volunteer efforts into `To Do`, `In Progress`, and `Completed` swimlanes (`tasks/board.html`).
* **Volunteer Assignment:** Assign tasks to specific members with due date tracking and real-time status progression.
* **Fundraiser Coordination:** Eliminates lost details for complex campus initiatives like bake sales, sponsorship drives, and hackathons.

### 💰 7. Transparent Treasury & Financial Ledger
* **Comprehensive Dashboard:** Real-time visibility into Total Revenue, Expenses, Net Balance, and Cash Flow (`treasury/dashboard.html`).
* **Automated + Manual Entries:** Ingests automated revenue from tickets and merchandise sales alongside manual expense logs (e.g., venue booking, supplies).
* **Visual Categorization:** Breakdown by category (Event Sales, Dues, Merchandise, Logistics, Food, Marketing) for end-of-semester reporting.

---

## 🔒 Security Architecture & Firestore Rules

PassTrack incorporates a multi-layered security model built for student environments:

1. **Role-Based Cloud Firestore Rules (`firestore.rules`):**
   * **Organizers:** Authenticated full CRUD across owned events, members, configs, and treasury ledgers.
   * **Ticket Buyers:** Restricted update permissions; unauthenticated clients may **only increment `seatsSold`** without modifying event names, dates, or prices.
   * **Door Scanners:** Field-restricted write access; scanners can **only update `status` and checkpoint `permissions`**, preventing unauthorized pass creation.
   * **Store Checkout:** Shoppers can **only decrement inventory `stock`** without altering product metadata or pricing.
   * **Treasury Guard:** Public clients may only append non-negative income transactions generated from legitimate transactions.
2. **XSS Protection:** Client-side markdown is sanitized through `DOMPurify` prior to DOM injection.
3. **Form Validations:** Universal client-side constraints across all modules (E.164-compatible phone regex, RFC-compliant email checks, positive decimal prices, valid date intervals).
4. **Token Security (`PT_SECURE_2026`):** Mutual authorization token shared between PassTrack web clients and Google Apps Script endpoints to reject spoofed dispatch requests.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | HTML5, Modern Vanilla CSS3, Vanilla JavaScript (ES6+) |
| **Icons & Typography** | Phosphor Icons, Google Fonts (Inter, Outfit) |
| **Libraries** | `html5-qrcode` (Scanner), `DOMPurify` (XSS Sanitizer), `marked.js` (Markdown parser), `qrcodejs` (QR Generator) |
| **Backend & Database** | Firebase Authentication (Google OAuth & Anonymous Delegated), Cloud Firestore |
| **Serverless Dispatch** | Google Apps Script (Automated Gmail API integration) |
| **Hosting & CI/CD** | Netlify (`netlify.toml` SPA redirects and header configs) |

---

## 📁 Repository Structure

```plaintext
PassTrack/
├── announcements/            # Bulletin board & broadcast announcement system
│   ├── admin.html / admin.js # Organizer announcement creation & email dispatcher
│   └── board.html / board.js # Public club bulletin board
├── auth/                     # Authentication & delegated sign-in
│   ├── login.html / login.js # Google OAuth & staff access code portal
├── distributor/              # Mobile ticket scanning module
│   ├── distributor.html      # Scanner login portal
│   └── scanner.html / js     # Camera-based multi-station QR scanner
├── lib/                      # Core configuration & shared services
│   └── firebase-config.js    # Firebase app initialization & script endpoints
├── members/                  # Club membership management
│   ├── directory.html / js   # Organizer member directory, dues, and bulk actions
│   └── register.html / js    # Public self-serve member registration
├── merch/                    # Merchandise catalog & inventory
│   ├── manage-merch.html/js  # Product management & stock dashboard
│   └── store.html / store.js # Public student merchandise storefront
├── organizer/                # Core organizer management
│   ├── dashboard.html / js   # Main organizer control center & event hub
│   ├── manage-event.html/js  # Event configuration, station setups & reports
│   └── setup-org.html / js   # Organization profile & dues onboarding
├── tasks/                    # Internal Kanban volunteer delegation
│   └── board.html / board.js # Drag-and-drop task workflow
├── tickets/                  # Public ticketing & checkout
│   ├── buy.html / buy.js     # Tiered ticket purchase & duplicate verification
│   └── view.html             # Organizer attendee sales breakdown
├── treasury/                 # Financial ledger & analytics
│   ├── dashboard.html / js   # Real-time revenue, expense & balance tracking
├── viewer/                   # Digital attendee access pass
│   └── viewer.html / viewer.js # Responsive ticket QR presentation
├── email-template.gs         # Serverless Google Apps Script email engine
├── firestore.rules           # Production-hardened security rules
├── firebase.json             # Firebase project hosting & rules definition
├── generate_report.py        # Automated assignment & audit report generator
├── index.html / index.js     # Modern hero landing page & module gateway
└── style.css                 # Universal design system & CSS variables
```

---

## 🚀 Getting Started & Local Setup

### 1. Clone the Repository
```bash
git clone https://github.com/yusufamjhera-code/Student_Organization_System-ODOO-x-NMIT.git
cd Student_Organization_System-ODOO-x-NMIT
```

### 2. Configure Firebase
1. Create a project in the [Firebase Console](https://console.firebase.google.com/).
2. Enable **Authentication** (Google Sign-In and Anonymous Sign-In).
3. Enable **Cloud Firestore** in production mode.
4. Update `lib/firebase-config.js` with your Firebase project credentials:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_PROJECT_ID.appspot.com",
     messagingSenderId: "YOUR_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```
5. Deploy the security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

### 3. Configure Google Apps Script (Email Dispatch)
1. Open [Google Apps Script](https://script.google.com/) and create a new project.
2. Copy the contents of [`email-template.gs`](email-template.gs) into your script editor.
3. Deploy as a **Web App** (Execute as: *Me*, Who has access: *Anyone*).
4. Copy the Web App deployment URL and set it in [`lib/firebase-config.js`](lib/firebase-config.js):
   ```javascript
   window.GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";
   ```

### 4. Run Locally
Because PassTrack is built with standard Web APIs and ES modules, you can serve it with any static server:
```bash
# Using Python
python -m http.server 8000

# Or using npx serve
npx serve .
```
Navigate to `http://localhost:8000` in your web browser.

---

## 🏆 Hackathon Context
Developed for the **Odoo x NMIT Hackathon** to demonstrate how an integrated, modular digital ecosystem can streamline campus club administration, eliminate human error in ticketing, and deliver complete financial transparency.

<div align="center">
  <p>© 2026 PassTrack. Designed and Developed by <strong>Team ByteSmiths for Odoo</strong>.</p>
</div>
