/**
 * ============================================================================
 * PASS TRACK | MULTI-PURPOSE ACCESS & NOTIFICATION SERVICE
 * Google Apps Script Email Engine
 *
 * Supported Email Types:
 *  1. 'staff'                 - Staff Scanning Authorization & Password
 *  2. 'collaborator'          - Event Collaborator Invitation & Access Code
 *  3. 'membership_welcome'    - Member Activation & Dues Paid Notice
 *  4. 'membership_renewal'    - Membership Expiration & Renewal Reminder
 *  5. 'ticket_confirmation'   - Ticket Booking Confirmation & Code
 *  6. 'merch_order'           - Merchandise Purchase Receipt
 *  7. 'announcement'          - Official Organization Broadcast Notice
 *  8. 'participant'/'voucher' - Attendee Event Access Voucher with QR Link
 *  9. 'reimbursement'         - Treasury Reimbursement Claim Approval / Update
 * 10. 'certificate'           - Verified Participation Certificate Issuance
 * 11. 'wallet_pass'           - Digital Membership Wallet Card Access
 * ============================================================================
 */

// ---------------- SECURITY & BRANDING CONFIG ----------------
const SECURITY_TOKEN = "PT_SECURE_2026";
const BRAND_NAME = "PassTrack Security";

/**
 * Helper: Validates email format
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Health check handler for browser GET requests
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "active",
    service: "PassTrack Email Gateway",
    version: "2.5.0",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Main Webhook POST Handler
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Empty request body");
    }

    const data = JSON.parse(e.postData.contents);

    // Optional Security Token Check (permits open calls if token not enforced)
    if (data.security_token && data.security_token !== SECURITY_TOKEN) {
      throw new Error("Unauthorized request: Invalid Security Token");
    }

    // Email Address Validation
    if (!data.to_email || !isValidEmail(data.to_email)) {
      throw new Error("Invalid or missing recipient email address: " + (data.to_email || "none"));
    }

    let subject = "";
    let htmlBody = "";

    // =========================================================================
    // 1. STAFF SCANNER AUTHORIZATION
    // =========================================================================
    if (data.type === "staff") {
      subject = `[Internal] Staff Scanning Authorization | ${data.event_name || 'Event'}`;

      htmlBody = `
      <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; width:100%; max-width:580px; margin:0 auto; border:1px solid #e2e8f0; border-radius:18px; background:#ffffff; box-sizing:border-box;">
        <div style="background:#1e293b; padding:28px 20px 24px; text-align:center; border-radius:18px 18px 0 0;">
          <h1 style="margin:0; color:#ffffff; font-size:20px; font-weight:700;">🛡️ Staff Authorization</h1>
          <p style="margin:6px 0 0; color:#cbd5e1; font-size:14px;">Scanning & Verification Credentials</p>
        </div>
        <div style="padding:24px 20px; color:#334155; line-height:1.65;">
          <p style="margin:0 0 16px; font-size:15px;">Hello Team Member,</p>
          <p style="margin:0 0 20px; font-size:14px; color:#475569;">
            You have been authorized as a gate verification staff member for <strong>${data.event_name || 'the event'}</strong>.
            Use the credentials below to log into the scanner portal:
          </p>
          <div style="background:#f8fafc; padding:16px 14px; border-radius:14px; border:1px dashed #cbd5e1; margin-bottom:24px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size:14px;">
              <tr>
                <td style="color:#64748b; padding:6px 0;">Event ID:</td>
                <td style="text-align:right; font-family:monospace; font-weight:700;">${data.event_id || 'N/A'}</td>
              </tr>
              <tr>
                <td style="color:#64748b; padding:6px 0;">Staff Password:</td>
                <td style="text-align:right; font-family:monospace; font-weight:700; color:#6366f1;">${data.staff_password || 'N/A'}</td>
              </tr>
            </table>
          </div>
          ${data.portal_url ? `
          <div style="text-align:center; margin:24px 0;">
            <a href="${data.portal_url}" style="background:#1e293b; color:#ffffff; text-decoration:none; padding:14px 28px; border-radius:12px; font-weight:700; font-size:15px; display:inline-block;">
              Launch Staff Scanner
            </a>
          </div>` : ''}
        </div>
        <div style="background:#f1f5f9; padding:14px 20px; text-align:center; border-top:1px solid #e2e8f0; border-radius:0 0 18px 18px;">
          <p style="margin:0; font-size:11px; color:#94a3b8; letter-spacing:0.5px;">${BRAND_NAME.toUpperCase()} &bull; STAFF CREDENTIAL</p>
        </div>
      </div>`;
    }

    // =========================================================================
    // 2. COLLABORATOR INVITATION
    // =========================================================================
    else if (data.type === "collaborator") {
      subject = `[Invitation] Event Collaborator Access | ${data.event_name || 'Event'}`;

      htmlBody = `
      <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; width:100%; max-width:580px; margin:0 auto; border:1px solid #e2e8f0; border-radius:18px; background:#ffffff; box-sizing:border-box;">
        <div style="background:linear-gradient(135deg,#059669,#10b981); padding:28px 20px 24px; text-align:center; border-radius:18px 18px 0 0;">
          <h1 style="margin:0; color:#ffffff; font-size:20px; font-weight:700;">🤝 Collaborator Invitation</h1>
          <p style="margin:6px 0 0; color:rgba(255,255,255,0.9); font-size:14px;">Event Management Access Granted</p>
        </div>
        <div style="padding:24px 20px; color:#334155; line-height:1.65;">
          <p style="margin:0 0 16px; font-size:15px;">Hello,</p>
          <p style="margin:0 0 20px; font-size:14px; color:#475569;">
            You have been invited to collaborate on <strong>${data.event_name || 'the event'}</strong>.
            As a collaborator, you can manage participant registrations, check-in attendees, and view analytics.
          </p>
          <div style="background:#f0fdf4; padding:16px 14px; border-radius:14px; border:1px dashed #86efac; margin-bottom:20px;">
            <p style="margin:0 0 10px; font-size:13px; font-weight:700; color:#059669; text-align:center;">Your Login Credentials</p>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size:14px;">
              <tr>
                <td style="color:#64748b; padding:6px 0;">Email:</td>
                <td style="text-align:right; font-weight:600;">${data.to_email}</td>
              </tr>
              <tr>
                <td style="color:#64748b; padding:6px 0;">Access Code:</td>
                <td style="text-align:right; font-family:monospace; font-weight:700; color:#059669; font-size:16px; letter-spacing:2px;">${data.access_code || 'CODE'}</td>
              </tr>
            </table>
          </div>
          ${data.portal_url ? `
          <div style="text-align:center; margin:20px 0;">
            <a href="${data.portal_url}" style="background:#059669; color:#ffffff; text-decoration:none; padding:14px 28px; border-radius:12px; font-weight:700; font-size:15px; display:inline-block;">
              Open Collaborator Portal
            </a>
          </div>` : ''}
          <div style="background:#f8fafc; padding:14px; border-radius:12px; border:1px solid #e2e8f0; font-size:12px; color:#64748b; line-height:1.7;">
            <strong>How to sign in:</strong> On the login screen, select <em>"Team Member"</em>, enter your email and Access Code above, then proceed to the dashboard.
          </div>
        </div>
        <div style="background:#f0fdf4; padding:14px 20px; text-align:center; border-top:1px solid #bbf7d0; border-radius:0 0 18px 18px;">
          <p style="margin:0; font-size:11px; color:#6b7280; letter-spacing:0.5px;">${BRAND_NAME.toUpperCase()} &bull; TEAM ACCESS</p>
        </div>
      </div>`;
    }

    // =========================================================================
    // 3. MEMBERSHIP WELCOME (DUES PAID & ACTIVE)
    // =========================================================================
    else if (data.type === "membership_welcome") {
      subject = `Welcome to ${data.org_name || 'the Organization'}! Your Membership is Active ✓`;

      htmlBody = `
      <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; width:100%; max-width:580px; margin:0 auto; border:1px solid #e2e8f0; border-radius:18px; background:#ffffff; box-sizing:border-box;">
        <div style="background:linear-gradient(135deg,#059669,#10b981); padding:28px 20px 24px; text-align:center; border-radius:18px 18px 0 0;">
          <h1 style="margin:0; color:#ffffff; font-size:22px; font-weight:700;">🎉 Welcome to ${data.org_name || 'PassTrack'}!</h1>
          <p style="margin:6px 0 0; color:rgba(255,255,255,0.9); font-size:14px;">Membership Activated</p>
        </div>
        <div style="padding:24px 20px; color:#334155; line-height:1.65;">
          <p style="font-size:15px; margin:0 0 16px;">Hi <strong>${data.to_name || 'Member'}</strong>,</p>
          <p style="font-size:14px; color:#475569; margin:0 0 20px;">
            Your membership is officially active! Your dues have been confirmed, and you now have access to all exclusive chapter benefits, discount pricing, and voting rights.
          </p>
          <div style="background:#f0fdf4; padding:16px; border-radius:12px; border:1px dashed #86efac; margin:20px 0;">
            <p style="margin:0 0 6px; font-size:14px; color:#059669;"><strong>Status:</strong> ACTIVE</p>
            ${data.end_date ? `<p style="margin:0; font-size:14px; color:#059669;"><strong>Valid Until:</strong> ${data.end_date}</p>` : ''}
          </div>
          ${data.pass_url ? `
          <div style="text-align:center; margin:24px 0;">
            <a href="${data.pass_url}" style="background:#059669; color:#ffffff; padding:14px 28px; border-radius:12px; font-weight:700; text-decoration:none; display:inline-block;">
              View Digital Membership Card
            </a>
          </div>` : ''}
        </div>
        <div style="background:#f8fafc; padding:14px 20px; text-align:center; border-top:1px solid #e2e8f0; border-radius:0 0 18px 18px;">
          <p style="margin:0; font-size:11px; color:#94a3b8; letter-spacing:0.5px;">MEMBER DIRECTORY &bull; ${BRAND_NAME.toUpperCase()}</p>
        </div>
      </div>`;
    }

    // =========================================================================
    // 4. MEMBERSHIP RENEWAL REMINDER
    // =========================================================================
    else if (data.type === "membership_renewal") {
      subject = `[${data.org_name || 'PassTrack'}] Membership Renewal Reminder ⏳`;

      htmlBody = `
      <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; width:100%; max-width:580px; margin:0 auto; border:1px solid #e2e8f0; border-radius:18px; background:#ffffff; box-sizing:border-box;">
        <div style="background:linear-gradient(135deg,#d97706,#f59e0b); padding:28px 20px 24px; text-align:center; border-radius:18px 18px 0 0;">
          <h1 style="margin:0; color:#ffffff; font-size:22px; font-weight:700;">Membership Expiring Soon</h1>
          <p style="margin:6px 0 0; color:rgba(255,255,255,0.9); font-size:14px;">${data.org_name || 'Chapter Membership'}</p>
        </div>
        <div style="padding:24px 20px; color:#334155; line-height:1.65;">
          <p style="font-size:15px; margin:0 0 16px;">Hi <strong>${data.to_name || 'Member'}</strong>,</p>
          <p style="font-size:14px; color:#475569; margin:0 0 20px;">
            This is a friendly reminder that your membership with <strong>${data.org_name || 'our organization'}</strong> is expiring soon.
          </p>
          <div style="background:#fefce8; padding:16px; border-radius:12px; border:1px dashed #fde047; margin:20px 0;">
            <p style="margin:0; font-size:14px; color:#a16207;"><strong>Expiration Date:</strong> ${data.end_date || 'Upcoming'}</p>
          </div>
          <p style="font-size:14px; color:#475569;">
            Please contact your organization committee to renew your membership and continue enjoying uninterrupted benefits.
          </p>
        </div>
        <div style="background:#f8fafc; padding:14px 20px; text-align:center; border-top:1px solid #e2e8f0; border-radius:0 0 18px 18px;">
          <p style="margin:0; font-size:11px; color:#94a3b8; letter-spacing:0.5px;">RENEWALS &bull; ${BRAND_NAME.toUpperCase()}</p>
        </div>
      </div>`;
    }

    // =========================================================================
    // 5. TICKET CONFIRMATION
    // =========================================================================
    else if (data.type === "ticket_confirmation") {
      subject = `Your Ticket for ${data.event_name || 'Event'} 🎟️`;

      htmlBody = `
      <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; width:100%; max-width:580px; margin:0 auto; border:1px solid #e2e8f0; border-radius:18px; background:#ffffff; box-sizing:border-box;">
        <div style="background:linear-gradient(135deg,#2563eb,#3b82f6); padding:28px 20px 24px; text-align:center; border-radius:18px 18px 0 0;">
          <h1 style="margin:0; color:#ffffff; font-size:22px; font-weight:700;">Ticket Confirmed!</h1>
          <p style="margin:6px 0 0; color:rgba(255,255,255,0.9); font-size:14px;">${data.event_name || 'Event Booking'}</p>
        </div>
        <div style="padding:24px 20px; color:#334155; line-height:1.65;">
          <p style="font-size:15px; margin:0 0 16px;">Hi <strong>${data.to_name || 'Attendee'}</strong>,</p>
          <p style="font-size:14px; color:#475569; margin:0 0 20px;">Your ticket for <strong>${data.event_name || 'the event'}</strong> is confirmed.</p>
          <div style="background:#f1f5f9; padding:20px; border-radius:12px; text-align:center; margin:20px 0;">
            <p style="margin:0 0 6px; font-size:12px; color:#64748b; font-weight:600; text-transform:uppercase;">Ticket Code</p>
            <h2 style="margin:0; color:#1e293b; font-family:monospace; letter-spacing:4px; font-size:26px;">${data.ticket_code || 'TICKET'}</h2>
          </div>
          <table style="width:100%; border-collapse:collapse; margin-bottom:20px; font-size:14px; color:#475569;">
            <tr>
              <td style="padding:8px 0; border-bottom:1px solid #e2e8f0;"><strong>Ticket Tier:</strong></td>
              <td style="padding:8px 0; border-bottom:1px solid #e2e8f0; text-align:right;">${data.ticket_type || 'Standard'}</td>
            </tr>
            <tr>
              <td style="padding:8px 0; border-bottom:1px solid #e2e8f0;"><strong>Quantity:</strong></td>
              <td style="padding:8px 0; border-bottom:1px solid #e2e8f0; text-align:right;">${data.quantity || 1}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;"><strong>Total Paid:</strong></td>
              <td style="padding:8px 0; text-align:right; font-weight:bold; color:#1e293b; font-size:16px;">₹${data.total_paid || 0}</td>
            </tr>
          </table>
          ${data.qr_link ? `
          <div style="text-align:center; margin:24px 0;">
            <a href="${data.qr_link}" style="background:#2563eb; color:#ffffff; padding:14px 28px; border-radius:12px; font-weight:700; text-decoration:none; display:inline-block;">
              View Digital Pass
            </a>
          </div>` : ''}
        </div>
        <div style="background:#f8fafc; padding:14px 20px; text-align:center; border-top:1px solid #e2e8f0; border-radius:0 0 18px 18px;">
          <p style="margin:0; font-size:11px; color:#94a3b8; letter-spacing:0.5px;">TICKETS &bull; ${BRAND_NAME.toUpperCase()}</p>
        </div>
      </div>`;
    }

    // =========================================================================
    // 6. MERCHANDISE ORDER CONFIRMATION
    // =========================================================================
    else if (data.type === "merch_order") {
      subject = `Order Confirmed | ${data.product_name || 'Merchandise'} 👕`;

      htmlBody = `
      <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; width:100%; max-width:580px; margin:0 auto; border:1px solid #e2e8f0; border-radius:18px; background:#ffffff; box-sizing:border-box;">
        <div style="background:linear-gradient(135deg,#c026d3,#d946ef); padding:28px 20px 24px; text-align:center; border-radius:18px 18px 0 0;">
          <h1 style="margin:0; color:#ffffff; font-size:22px; font-weight:700;">Order Confirmed!</h1>
          <p style="margin:6px 0 0; color:rgba(255,255,255,0.9); font-size:14px;">${data.product_name || 'Merchandise Store'}</p>
        </div>
        <div style="padding:24px 20px; color:#334155; line-height:1.65;">
          <p style="font-size:15px; margin:0 0 16px;">Hi <strong>${data.to_name || 'Shopper'}</strong>,</p>
          <p style="font-size:14px; color:#475569; margin:0 0 20px;">Your merchandise order has been placed successfully.</p>
          <div style="background:#fdf4ff; padding:20px; border-radius:12px; border:1px dashed #f0abfc; margin-bottom:20px;">
            <table style="width:100%; border-collapse:collapse; font-size:14px; color:#475569;">
              <tr>
                <td style="padding:6px 0;"><strong>Item:</strong></td>
                <td style="padding:6px 0; text-align:right; font-weight:bold;">${data.product_name || 'Item'}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;"><strong>Size:</strong></td>
                <td style="padding:6px 0; text-align:right; font-weight:bold;">${data.size || 'Free Size'}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;"><strong>Quantity:</strong></td>
                <td style="padding:6px 0; text-align:right; font-weight:bold;">${data.quantity || 1}</td>
              </tr>
              <tr>
                <td style="padding:8px 0; border-top:1px solid #f5d0fe;"><strong>Total Paid:</strong></td>
                <td style="padding:8px 0; border-top:1px solid #f5d0fe; text-align:right; font-weight:bold; color:#86198f; font-size:16px;">₹${data.total_paid || 0}</td>
              </tr>
            </table>
          </div>
          <p style="margin:0; font-size:13px; color:#64748b; text-align:center;">You will receive an update once your item is ready for pickup.</p>
        </div>
        <div style="background:#f8fafc; padding:14px 20px; text-align:center; border-top:1px solid #e2e8f0; border-radius:0 0 18px 18px;">
          <p style="margin:0; font-size:11px; color:#94a3b8; letter-spacing:0.5px;">STOREFRONT &bull; ${BRAND_NAME.toUpperCase()}</p>
        </div>
      </div>`;
    }

    // =========================================================================
    // 7. ANNOUNCEMENT BROADCAST
    // =========================================================================
    else if (data.type === "announcement") {
      const title = data.title || data.announcement_title || "Official Announcement";
      const content = data.body || data.announcement_content || "Important update from organization leadership.";
      subject = `[${data.org_name || 'Notice'}] 📢 ${title}`;

      htmlBody = `
      <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; width:100%; max-width:580px; margin:0 auto; border:1px solid #e2e8f0; border-radius:18px; background:#ffffff; box-sizing:border-box;">
        <div style="background:linear-gradient(135deg, #ea580c 0%, #f97316 100%); padding:28px 20px 24px; text-align:center; border-radius:18px 18px 0 0;">
          <h1 style="margin:0; color:#ffffff; font-size:21px; font-weight:700; line-height:1.3;">${title}</h1>
          <p style="margin:6px 0 0; color:rgba(255,255,255,0.9); font-size:14px;">${data.org_name || 'Official Organization Notice'}</p>
        </div>
        <div style="padding:24px 20px; color:#1e293b; line-height:1.65;">
          <p style="font-size:15px; margin:0 0 16px;">Hello <strong>${data.to_name || 'Member'}</strong>,</p>
          <div style="font-size:14px; color:#334155; margin:0 0 20px; white-space:pre-wrap; background:#f8fafc; padding:18px; border-radius:12px; border:1px solid #e2e8f0; line-height:1.7;">
${content}
          </div>
          ${data.author_name ? `<p style="font-size:12px; color:#64748b; margin:12px 0 0;">Published by: <strong>${data.author_name}</strong></p>` : ''}
        </div>
        <div style="background:#f8fafc; padding:14px 20px; text-align:center; border-top:1px solid #e2e8f0; border-radius:0 0 18px 18px;">
          <p style="margin:0; font-size:10px; color:#94a3b8; letter-spacing:0.5px;">NOTICE BOARD &bull; ${BRAND_NAME.toUpperCase()}</p>
        </div>
      </div>`;
    }

    // =========================================================================
    // 8. EVENT PARTICIPANT / ACCESS VOUCHER
    // =========================================================================
    else if (data.type === "participant" || data.type === "voucher") {
      subject = `Your Access Voucher | ${data.event_name || 'PassTrack'}`;

      htmlBody = `
      <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; width:100%; max-width:580px; margin:0 auto; border:1px solid #e2e8f0; border-radius:18px; background:#ffffff; box-sizing:border-box;">
        <div style="background:linear-gradient(135deg,#6a11cb,#2575fc); padding:30px 20px 26px; text-align:center; border-radius:18px 18px 0 0;">
          <h1 style="margin:0; color:#ffffff; font-size:22px; font-weight:700;">Authorization Issued ✓</h1>
          <p style="margin:6px 0 0; color:rgba(255,255,255,0.9); font-size:14px;">${data.event_name || 'Digital Pass'}</p>
        </div>
        <div style="padding:24px 20px; color:#1e293b; line-height:1.65;">
          <p style="font-size:15px; margin:0 0 16px;">Hi <strong>${data.to_name || 'Attendee'}</strong>,</p>
          <p style="font-size:14px; color:#475569; margin:0 0 20px;">
            Your digital access voucher has been generated successfully. Present this voucher at the gate for fast QR scanning.
          </p>
          ${data.qr_link ? `
          <div style="text-align:center; margin:26px 0;">
            <a href="${data.qr_link}" style="background:#6a11cb; color:#ffffff; text-decoration:none; padding:14px 28px; border-radius:12px; font-weight:700; font-size:15px; display:inline-block;">
              View Digital Token
            </a>
          </div>` : ''}
        </div>
        <div style="background:#f8fafc; padding:14px 20px; text-align:center; border-top:1px solid #e2e8f0; border-radius:0 0 18px 18px;">
          <p style="margin:0; font-size:10px; color:#94a3b8; letter-spacing:0.5px;">DIGITALLY SECURED BY ${BRAND_NAME.toUpperCase()}</p>
        </div>
      </div>`;
    }

    // =========================================================================
    // 9. REIMBURSEMENT STATUS UPDATE
    // =========================================================================
    else if (data.type === "reimbursement") {
      const isApproved = data.status === "approved";
      subject = `[Treasury] Reimbursement Claim ${isApproved ? "Approved ✓" : "Update"} | ₹${data.amount || 0}`;

      htmlBody = `
      <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; width:100%; max-width:580px; margin:0 auto; border:1px solid #e2e8f0; border-radius:18px; background:#ffffff; box-sizing:border-box;">
        <div style="background:${isApproved ? '#059669' : '#dc2626'}; padding:28px 20px 24px; text-align:center; border-radius:18px 18px 0 0;">
          <h1 style="margin:0; color:#ffffff; font-size:20px; font-weight:700;">
            ${isApproved ? 'Claim Approved & Reimbursed' : 'Claim Status Update'}
          </h1>
          <p style="margin:6px 0 0; color:rgba(255,255,255,0.9); font-size:14px;">${data.event_name || 'Treasury Ledger'}</p>
        </div>
        <div style="padding:24px 20px; color:#1e293b; line-height:1.65;">
          <p style="font-size:15px; margin:0 0 16px;">Hi <strong>${data.to_name || 'Volunteer'}</strong>,</p>
          <p style="font-size:14px; color:#475569; margin:0 0 20px;">
            Your reimbursement claim of <strong>₹${data.amount || 0}</strong> for <em>${data.category || 'Expense'}</em> has been reviewed.
          </p>
          <div style="background:#f8fafc; padding:16px; border-radius:12px; border:1px solid #e2e8f0; font-size:14px; margin-bottom:20px;">
            <p style="margin:0 0 6px;"><strong>Status:</strong> <span style="color:${isApproved ? '#059669' : '#dc2626'}; font-weight:700;">${(data.status || 'PROCESSED').toUpperCase()}</span></p>
            <p style="margin:0 0 6px;"><strong>Disbursement UPI:</strong> <code>${data.payout_upi || 'On Record'}</code></p>
            ${data.notes ? `<p style="margin:0;"><strong>Reviewer Note:</strong> ${data.notes}</p>` : ''}
          </div>
        </div>
        <div style="background:#f8fafc; padding:14px 20px; text-align:center; border-top:1px solid #e2e8f0; border-radius:0 0 18px 18px;">
          <p style="margin:0; font-size:10px; color:#94a3b8; letter-spacing:0.5px;">TREASURY &bull; ${BRAND_NAME.toUpperCase()}</p>
        </div>
      </div>`;
    }

    // =========================================================================
    // 10. CERTIFICATE ISSUANCE
    // =========================================================================
    else if (data.type === "certificate") {
      subject = `[Credential] Verified Certificate of Participation | ${data.event_name || 'Event'}`;

      htmlBody = `
      <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; width:100%; max-width:580px; margin:0 auto; border:1px solid #e2e8f0; border-radius:18px; background:#ffffff; box-sizing:border-box;">
        <div style="background:linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); padding:28px 20px 24px; text-align:center; border-radius:18px 18px 0 0;">
          <h1 style="margin:0; color:#fbbf24; font-size:22px; font-weight:700;">🎓 Certificate Awarded</h1>
          <p style="margin:6px 0 0; color:#cbd5e1; font-size:14px;">${data.event_name || 'Official Credential'}</p>
        </div>
        <div style="padding:24px 20px; color:#1e293b; line-height:1.65;">
          <p style="font-size:15px; margin:0 0 16px;">Dear <strong>${data.to_name || 'Participant'}</strong>,</p>
          <p style="font-size:14px; color:#475569; margin:0 0 20px;">
            Congratulations! Your verified certificate of participation has been issued.
          </p>
          ${data.verify_url ? `
          <div style="text-align:center; margin:24px 0;">
            <a href="${data.verify_url}" style="background:#4f46e5; color:#ffffff; padding:14px 28px; border-radius:12px; font-weight:700; text-decoration:none; display:inline-block;">
              View & Download Certificate
            </a>
          </div>` : ''}
          ${data.cert_id ? `
          <div style="background:#f8fafc; padding:14px; border-radius:12px; border:1px dashed #cbd5e1; font-size:13px; text-align:center;">
            <strong>Credential ID:</strong> <code>${data.cert_id}</code>
          </div>` : ''}
        </div>
        <div style="background:#f8fafc; padding:14px 20px; text-align:center; border-top:1px solid #e2e8f0; border-radius:0 0 18px 18px;">
          <p style="margin:0; font-size:10px; color:#94a3b8; letter-spacing:0.5px;">VERIFIED CREDENTIALS &bull; ${BRAND_NAME.toUpperCase()}</p>
        </div>
      </div>`;
    }

    // =========================================================================
    // 11. DIGITAL MEMBERSHIP WALLET PASS
    // =========================================================================
    else if (data.type === "wallet_pass") {
      subject = `[PassTrack] Digital Membership Card | ${data.org_name || 'Student Club'}`;

      htmlBody = `
      <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; width:100%; max-width:580px; margin:0 auto; border:1px solid #e2e8f0; border-radius:18px; background:#ffffff; box-sizing:border-box;">
        <div style="background:linear-gradient(135deg, #090d16 0%, #1e1b4b 100%); padding:28px 20px 24px; text-align:center; border-radius:18px 18px 0 0;">
          <h1 style="margin:0; color:#ffffff; font-size:20px; font-weight:700;">💳 Digital Membership Pass</h1>
          <p style="margin:6px 0 0; color:#a5b4fc; font-size:14px;">${data.org_name || 'PassTrack Member Pass'}</p>
        </div>
        <div style="padding:24px 20px; color:#1e293b; line-height:1.65;">
          <p style="font-size:15px; margin:0 0 16px;">Hello <strong>${data.to_name || 'Member'}</strong>,</p>
          <p style="font-size:14px; color:#475569; margin:0 0 20px;">
            Your active digital membership pass is ready. Use this digital wallet pass for fast door verification, student discounts, and member privileges.
          </p>
          ${data.pass_url ? `
          <div style="text-align:center; margin:24px 0;">
            <a href="${data.pass_url}" style="background:#6366f1; color:#ffffff; padding:14px 28px; border-radius:12px; font-weight:700; text-decoration:none; display:inline-block;">
              Open Digital Wallet Pass
            </a>
          </div>` : ''}
        </div>
        <div style="background:#f8fafc; padding:14px 20px; text-align:center; border-top:1px solid #e2e8f0; border-radius:0 0 18px 18px;">
          <p style="margin:0; font-size:10px; color:#94a3b8; letter-spacing:0.5px;">SECURE DIGITAL PASS &bull; ${BRAND_NAME.toUpperCase()}</p>
        </div>
      </div>`;
    }

    // =========================================================================
    // 12. FALLBACK DEFAULT
    // =========================================================================
    else {
      subject = `Your Access Voucher | ${data.event_name || BRAND_NAME}`;

      htmlBody = `
      <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; width:100%; max-width:580px; margin:0 auto; border:1px solid #e2e8f0; border-radius:18px; background:#ffffff; box-sizing:border-box;">
        <div style="background:linear-gradient(135deg,#6a11cb,#2575fc); padding:30px 20px 26px; text-align:center; border-radius:18px 18px 0 0;">
          <h1 style="margin:0; color:#ffffff; font-size:21px; font-weight:700;">Authorization Issued</h1>
          <p style="margin:6px 0 0; color:rgba(255,255,255,0.9); font-size:14px;">${data.event_name || 'PassTrack Access'}</p>
        </div>
        <div style="padding:24px 20px; color:#1e293b; line-height:1.65;">
          <p style="font-size:15px; margin:0 0 16px;">Hi <strong>${data.to_name || 'Attendee'}</strong>,</p>
          <p style="font-size:14px; color:#475569; margin:0 0 20px;">Your digital access voucher has been generated successfully.</p>
          ${data.qr_link ? `
          <div style="text-align:center; margin:26px 0;">
            <a href="${data.qr_link}" style="display:inline-block; background:#6a11cb; color:#ffffff; text-decoration:none; padding:14px 28px; border-radius:12px; font-weight:700; font-size:15px;">
              View Digital Token
            </a>
          </div>` : ''}
        </div>
        <div style="background:#f8fafc; padding:14px 20px; text-align:center; border-top:1px solid #e2e8f0; border-radius:0 0 18px 18px;">
          <p style="margin:0; font-size:10px; color:#94a3b8; letter-spacing:0.5px;">DIGITALLY SECURED BY ${BRAND_NAME.toUpperCase()}</p>
        </div>
      </div>`;
    }

    // Send Email
    MailApp.sendEmail({
      to: data.to_email,
      subject: subject,
      htmlBody: htmlBody,
      name: BRAND_NAME
    });

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Email sent successfully to " + data.to_email,
      type: data.type
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    console.error("PassTrack Mail Error:", err);
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
