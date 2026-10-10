/**
 * PASS TRACK | MULTI-PURPOSE ACCESS SERVICE
 * Mobile-optimized professional email templates
 * Functionality unchanged
 */

// ---------------- SECURITY CONFIG ----------------
const SECURITY_TOKEN = "PT_SECURE_2026";
const BRAND_NAME = "Pass Track Security";

/**
 * Helper: Validates email format
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ---------------- MAIN HANDLER ----------------
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Empty request body");
    }

    const data = JSON.parse(e.postData.contents);

    // Security Validation
    if (data.security_token && data.security_token !== SECURITY_TOKEN) {
      throw new Error("Unauthorized request: Invalid Security Token");
    }

    // Email Validation
    if (!data.to_email || !isValidEmail(data.to_email)) {
      throw new Error("Invalid or missing email address");
    }

    let subject = "";
    let htmlBody = "";

    // ================= STAFF TEMPLATE =================
    if (data.type === "staff") {
      subject = `[Internal] Staff Scanning Authorization | ${data.event_name}`;

      htmlBody = `
      <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; width:100%; max-width:580px; margin:0 auto; border:1px solid #e2e8f0; border-radius:18px; background:#ffffff; box-sizing:border-box;">

        <!-- Header -->
        <div style="background:#1e293b; padding:28px 20px 24px; text-align:center; border-radius:18px 18px 0 0;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td align="center">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:52px; height:52px; border-radius:50%; background:rgba(255,255,255,0.12); text-align:center; vertical-align:middle;">
                      <span style="font-size:24px; line-height:52px;">🛡️</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top:14px;">
                <h1 style="margin:0; color:#ffffff; font-size:20px; font-weight:700; line-height:1.3;">
                  Staff Authorization
                </h1>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top:6px;">
                <p style="margin:0; color:#cbd5e1; font-size:14px; line-height:1.4;">
                  Scanning & Verification Credentials
                </p>
              </td>
            </tr>
          </table>
        </div>

        <!-- Body -->
        <div style="padding:24px 20px; color:#334155; line-height:1.65;">
          <p style="margin:0 0 16px; font-size:15px;">
            Hello Team,
          </p>

          <p style="margin:0 0 20px; font-size:14px; color:#475569;">
            You have been authorized as a staff member for 
            <strong>${data.event_name}</strong>. Use the portal below to scan and verify access tokens.
          </p>

          <!-- CTA -->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0;">
            <tr>
              <td align="center">
                <a href="${data.portal_url}"
                   style="display:inline-block; min-width:200px; max-width:100%;
                   background:#1e293b; color:#ffffff; text-decoration:none;
                   padding:14px 28px; border-radius:12px; font-weight:700; font-size:15px;
                   text-align:center; box-sizing:border-box;">
                  Launch Staff Scanner
                </a>
              </td>
            </tr>
          </table>

          <!-- Credentials -->
          <div style="background:#f8fafc; padding:16px 14px; border-radius:14px; border:1px dashed #cbd5e1;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size:14px;">
              <tr>
                <td style="color:#64748b; padding:6px 0; vertical-align:middle;">Event ID</td>
                <td style="text-align:right; font-family:'Courier New',monospace; font-weight:700; padding:6px 0; vertical-align:middle; word-break:break-all;">
                  ${data.event_id}
                </td>
              </tr>
              <tr>
                <td style="color:#64748b; padding:6px 0; vertical-align:middle;">Staff Access Key</td>
                <td style="text-align:right; font-family:'Courier New',monospace; font-weight:700; color:#6a11cb; padding:6px 0; vertical-align:middle; word-break:break-all;">
                  ${data.staff_password}
                </td>
              </tr>
            </table>
          </div>

          <p style="margin:18px 0 0; font-size:12px; color:#94a3b8; text-align:center;">
            <strong>Confidential:</strong> For authorized staff only
          </p>
        </div>

        <!-- Footer -->
        <div style="background:#f1f5f9; padding:14px 20px; text-align:center; border-top:1px solid #e2e8f0; border-radius:0 0 18px 18px;">
          <p style="margin:0; font-size:11px; color:#94a3b8; letter-spacing:0.5px;">
            ${BRAND_NAME.toUpperCase()} · STAFF SYSTEM
          </p>
        </div>
      </div>
      `;
    }

    // ================= COLLABORATOR TEMPLATE =================
    else if (data.type === "collaborator") {
      subject = `[Invitation] Event Collaborator Access | ${data.event_name}`;

      htmlBody = `
      <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; width:100%; max-width:580px; margin:0 auto; border:1px solid #e2e8f0; border-radius:18px; background:#ffffff; box-sizing:border-box;">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#059669,#10b981); padding:28px 20px 24px; text-align:center; border-radius:18px 18px 0 0;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td align="center">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:52px; height:52px; border-radius:50%; background:rgba(255,255,255,0.18); text-align:center; vertical-align:middle;">
                      <span style="font-size:24px; line-height:52px;">🤝</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top:14px;">
                <h1 style="margin:0; color:#ffffff; font-size:20px; font-weight:700; line-height:1.3;">
                  You're Invited to Collaborate
                </h1>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top:6px;">
                <p style="margin:0; color:rgba(255,255,255,0.9); font-size:14px; line-height:1.4;">
                  Event Management Access Granted
                </p>
              </td>
            </tr>
          </table>
        </div>

        <!-- Body -->
        <div style="padding:24px 20px; color:#334155; line-height:1.65;">
          <p style="margin:0 0 16px; font-size:15px;">
            Hello,
          </p>

          <p style="margin:0 0 20px; font-size:14px; color:#475569;">
            You have been invited to collaborate on <strong>${data.event_name}</strong>. 
            As a collaborator, you can register participants, manage tokens, and help manage the event.
          </p>

          <!-- CTA -->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0;">
            <tr>
              <td align="center">
                <a href="${data.portal_url}"
                   style="display:inline-block; min-width:200px; max-width:100%;
                   background:#059669; color:#ffffff; text-decoration:none;
                   padding:14px 28px; border-radius:12px; font-weight:700; font-size:15px;
                   text-align:center; box-sizing:border-box;">
                  Open Collaborator Portal
                </a>
              </td>
            </tr>
          </table>

          <!-- Credentials -->
          <div style="background:#f0fdf4; padding:16px 14px; border-radius:14px; border:1px dashed #86efac;">
            <p style="margin:0 0 12px; font-size:13px; font-weight:700; color:#059669; text-align:center;">
              Your Login Credentials
            </p>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size:14px;">
              <tr>
                <td style="color:#64748b; padding:6px 0; vertical-align:middle;">Email</td>
                <td style="text-align:right; font-weight:600; padding:6px 0; vertical-align:middle; word-break:break-all;">
                  ${data.to_email}
                </td>
              </tr>
              <tr>
                <td style="color:#64748b; padding:6px 0; vertical-align:middle;">Access Code</td>
                <td style="text-align:right; font-family:'Courier New',monospace; font-weight:700; color:#059669; font-size:16px; padding:6px 0; vertical-align:middle; letter-spacing:2px;">
                  ${data.access_code}
                </td>
              </tr>
            </table>
          </div>

          <!-- Instructions -->
          <div style="background:#f8fafc; padding:14px; border-radius:12px; margin-top:16px; border:1px solid #e2e8f0;">
            <p style="margin:0 0 8px; font-size:12px; font-weight:700; color:#475569;">
              How to Login:
            </p>
            <ol style="margin:0; padding-left:18px; font-size:12px; color:#64748b; line-height:1.7;">
              <li style="padding:2px 0;">Select "Team Member" tab on login page</li>
              <li style="padding:2px 0;">Enter your email and access code</li>
              <li style="padding:2px 0;">Click Sign In to access assigned events</li>
            </ol>
          </div>

          <p style="margin:18px 0 0; font-size:12px; color:#94a3b8; text-align:center;">
            <strong>Note:</strong> Keep your access code confidential
          </p>
        </div>

        <!-- Footer -->
        <div style="background:#f0fdf4; padding:14px 20px; text-align:center; border-top:1px solid #bbf7d0; border-radius:0 0 18px 18px;">
          <p style="margin:0; font-size:11px; color:#6b7280; letter-spacing:0.5px;">
            ${BRAND_NAME.toUpperCase()} · COLLABORATOR ACCESS
          </p>
        </div>
      </div>
      `;
    }

    // ================= MEMBERSHIP WELCOME TEMPLATE =================
    else if (data.type === "membership_welcome") {
      subject = `Welcome to ${data.org_name}! Your Membership is Active`;
      htmlBody = `
      <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; width:100%; max-width:580px; margin:0 auto; border:1px solid #e2e8f0; border-radius:18px; background:#ffffff; box-sizing:border-box; padding:24px;">
        <h1 style="color:#059669; margin-top:0;">Welcome to ${data.org_name}!</h1>
        <p style="color:#334155; line-height:1.6;">Hi <strong>${data.to_name}</strong>,</p>
        <p style="color:#475569; line-height:1.6;">Your membership is now active. You have successfully paid your dues and can now access member perks, store discounts, and exclusive event pricing!</p>
        <div style="background:#f0fdf4; padding:16px; border-radius:12px; border:1px dashed #86efac; margin:20px 0;">
          <p style="margin:0; font-size:14px; color:#059669;"><strong>Membership valid until:</strong> ${data.end_date}</p>
        </div>
      </div>`;
    }

    // ================= MEMBERSHIP RENEWAL TEMPLATE =================
    else if (data.type === "membership_renewal") {
      subject = `[${data.org_name}] Membership Renewal Reminder`;
      htmlBody = `
      <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; width:100%; max-width:580px; margin:0 auto; border:1px solid #e2e8f0; border-radius:18px; background:#ffffff; box-sizing:border-box; padding:24px;">
        <h1 style="color:#eab308; margin-top:0;">Membership Expiring Soon</h1>
        <p style="color:#334155; line-height:1.6;">Hi <strong>${data.to_name}</strong>,</p>
        <p style="color:#475569; line-height:1.6;">This is a reminder that your membership with <strong>${data.org_name}</strong> is expiring soon.</p>
        <div style="background:#fefce8; padding:16px; border-radius:12px; border:1px dashed #fde047; margin:20px 0;">
          <p style="margin:0; font-size:14px; color:#a16207;"><strong>Expiration Date:</strong> ${data.end_date}</p>
        </div>
        <p style="color:#475569; line-height:1.6;">Please contact the organization to renew your membership and continue enjoying your benefits.</p>
      </div>`;
    }

    // ================= TICKET CONFIRMATION TEMPLATE =================
    else if (data.type === "ticket_confirmation") {
      subject = `Your Ticket for ${data.event_name}`;
      htmlBody = `
      <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; width:100%; max-width:580px; margin:0 auto; border:1px solid #e2e8f0; border-radius:18px; background:#ffffff; box-sizing:border-box; padding:24px;">
        <h1 style="color:#2563eb; margin-top:0;">Ticket Confirmed! 🎟️</h1>
        <p style="color:#334155; line-height:1.6;">Hi <strong>${data.to_name}</strong>,</p>
        <p style="color:#475569; line-height:1.6;">Your ticket(s) for <strong>${data.event_name}</strong> have been confirmed.</p>
        
        <div style="background:#f1f5f9; padding:20px; border-radius:12px; text-align:center; margin:24px 0;">
          <p style="margin:0 0 8px; font-size:13px; color:#64748b; font-weight:600; text-transform:uppercase;">Your Ticket Code</p>
          <h2 style="margin:0; color:#1e293b; font-family:'Courier New',monospace; letter-spacing:4px; font-size:28px;">${data.ticket_code}</h2>
        </div>

        <table style="width:100%; border-collapse:collapse; margin-bottom:20px; font-size:14px; color:#475569;">
          <tr>
            <td style="padding:8px 0; border-bottom:1px solid #e2e8f0;"><strong>Ticket Type:</strong></td>
            <td style="padding:8px 0; border-bottom:1px solid #e2e8f0; text-align:right;">${data.ticket_type}</td>
          </tr>
          <tr>
            <td style="padding:8px 0; border-bottom:1px solid #e2e8f0;"><strong>Quantity:</strong></td>
            <td style="padding:8px 0; border-bottom:1px solid #e2e8f0; text-align:right;">${data.quantity}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;"><strong>Total Paid:</strong></td>
            <td style="padding:8px 0; text-align:right; font-weight:bold; color:#1e293b;">₹${data.total_paid}</td>
          </tr>
        </table>
        
        <p style="margin:0; font-size:13px; color:#64748b; text-align:center;">Please show this ticket code at the entrance.</p>
      </div>`;
    }

    // ================= MERCH ORDER TEMPLATE =================
    else if (data.type === "merch_order") {
      subject = `Order Confirmed | ${data.product_name}`;
      htmlBody = `
      <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; width:100%; max-width:580px; margin:0 auto; border:1px solid #e2e8f0; border-radius:18px; background:#ffffff; box-sizing:border-box; padding:24px;">
        <h1 style="color:#d946ef; margin-top:0;">Order Received! 👕</h1>
        <p style="color:#334155; line-height:1.6;">Hi <strong>${data.to_name}</strong>,</p>
        <p style="color:#475569; line-height:1.6;">Your order for <strong>${data.product_name}</strong> has been received successfully.</p>
        
        <div style="background:#fdf4ff; padding:20px; border-radius:12px; border:1px dashed #f0abfc; margin:24px 0;">
          <table style="width:100%; border-collapse:collapse; font-size:14px; color:#475569;">
            <tr>
              <td style="padding:6px 0;"><strong>Size:</strong></td>
              <td style="padding:6px 0; text-align:right; font-weight:bold;">${data.size}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;"><strong>Quantity:</strong></td>
              <td style="padding:6px 0; text-align:right; font-weight:bold;">${data.quantity}</td>
            </tr>
            <tr>
              <td style="padding:6px 0; padding-top:12px; border-top:1px solid #f5d0fe;"><strong>Total Paid:</strong></td>
              <td style="padding:6px 0; padding-top:12px; border-top:1px solid #f5d0fe; text-align:right; font-weight:bold; color:#86198f; font-size:16px;">₹${data.total_paid}</td>
            </tr>
          </table>
        </div>
        <p style="margin:0; font-size:14px; color:#64748b; text-align:center;">We will notify you when your item is ready for collection.</p>
      </div>`;
    }

    // ================= ANNOUNCEMENT TEMPLATE =================
    else if (data.type === "announcement") {
      subject = `[${data.org_name}] Announcement: ${data.title}`;
      htmlBody = `
      <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; width:100%; max-width:580px; margin:0 auto; border:1px solid #e2e8f0; border-radius:18px; background:#ffffff; box-sizing:border-box; padding:24px;">
        <div style="border-bottom:2px solid #e2e8f0; padding-bottom:16px; margin-bottom:20px;">
          <h1 style="color:#0f172a; margin:0 0 8px; font-size:22px;">${data.title}</h1>
          <p style="margin:0; color:#64748b; font-size:13px;">Posted by: <strong>${data.author_name}</strong> | ${data.org_name}</p>
        </div>
        
        <div style="color:#334155; line-height:1.7; font-size:15px; white-space:pre-wrap;">${data.body}</div>
        
        <div style="margin-top:30px; padding-top:16px; border-top:1px solid #e2e8f0; text-align:center;">
          <p style="margin:0; font-size:11px; color:#94a3b8;">You are receiving this email because you are a registered member of ${data.org_name}.</p>
        </div>
      </div>`;
    }

    // ================= PARTICIPANT TEMPLATE =================
    else {
      subject = `Your Access Voucher | ${data.event_name}`;

      htmlBody = `
      <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; width:100%; max-width:580px; margin:0 auto; border:1px solid #e2e8f0; border-radius:18px; background:#ffffff; box-sizing:border-box;">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#6a11cb,#2575fc); padding:30px 20px 26px; text-align:center; border-radius:18px 18px 0 0;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td align="center">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:52px; height:52px; border-radius:50%; background:rgba(255,255,255,0.18); text-align:center; vertical-align:middle;">
                      <span style="font-size:24px; line-height:52px; display:inline-block;">✔️</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top:14px;">
                <h1 style="margin:0; color:#ffffff; font-size:21px; font-weight:700; line-height:1.3;">
                  Authorization Issued
                </h1>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top:6px;">
                <p style="margin:0; color:rgba(255,255,255,0.9); font-size:14px; line-height:1.4;">
                  ${data.event_name}
                </p>
              </td>
            </tr>
          </table>
        </div>

        <!-- Body -->
        <div style="padding:24px 20px; color:#1e293b; line-height:1.65;">
          <p style="margin:0 0 16px; font-size:15px;">
            Hi <strong>${data.to_name}</strong>,
          </p>

          <p style="margin:0 0 20px; font-size:14px; color:#475569;">
            Your digital access voucher has been generated successfully. This token grants you access to assigned stations and resources during the event.
          </p>

          <!-- CTA -->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:26px 0;">
            <tr>
              <td align="center">
                <a href="${data.qr_link}"
                   style="display:inline-block; min-width:200px; max-width:100%;
                   background:#6a11cb; color:#ffffff; text-decoration:none;
                   padding:14px 28px; border-radius:12px; font-weight:700; font-size:15px;
                   text-align:center; box-sizing:border-box;">
                  View Digital Token
                </a>
              </td>
            </tr>
          </table>

          <!-- Instructions -->
          <div style="background:#f8fafc; padding:16px 14px; border-radius:14px; border:1px solid #e2e8f0;">
            <p style="margin:0 0 10px; font-size:13px; font-weight:700; color:#6a11cb;">
              Instructions
            </p>
            <ul style="margin:0; padding-left:20px; font-size:13px; color:#64748b; line-height:1.7;">
              <li style="padding:2px 0;">Present the QR code at checkpoints</li>
              <li style="padding:2px 0;">Increase screen brightness</li>
              <li style="padding:2px 0;">Each token is unique and secure</li>
            </ul>
          </div>

          <!-- Fallback -->
          <p style="margin:22px 0 0; font-size:11px; color:#94a3b8; text-align:center; line-height:1.6;">
            If the button does not work, use this link:<br>
            <a href="${data.qr_link}" style="color:#2575fc; text-decoration:none; word-break:break-all;">
              ${data.qr_link}
            </a>
          </p>
        </div>

        <!-- Footer -->
        <div style="background:#f8fafc; padding:14px 20px; text-align:center; border-top:1px solid #e2e8f0; border-radius:0 0 18px 18px;">
          <p style="margin:0; font-size:10px; color:#94a3b8; letter-spacing:0.5px;">
            DIGITALLY SECURED BY ${BRAND_NAME.toUpperCase()}
          </p>
        </div>
      </div>
      `;
    }

    // ---------------- SEND EMAIL ----------------
    MailApp.sendEmail({
      to: data.to_email,
      subject,
      htmlBody,
      name: BRAND_NAME
    });

    return ContentService.createTextOutput("Success");

  } catch (err) {
    console.error("PassTrack Error:", err);
    return ContentService.createTextOutput("Error: " + err.message);
  }
}
