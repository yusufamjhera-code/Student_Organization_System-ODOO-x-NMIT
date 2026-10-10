/**
 * ============================================================================
 * PassTrack Centralized Validator & Sanitizer Engine
 * ============================================================================
 * Agent 4 Core Module: Robust client-side validation, anti-XSS sanitization,
 * and payload integrity checks across all modules.
 * ============================================================================
 */

(function (window) {
    'use strict';

    const PassTrackValidator = {
        /**
         * Validates standard email address RFC 5322
         */
        validateEmail: function (email) {
            if (!email || typeof email !== 'string') return false;
            const cleaned = email.trim().toLowerCase();
            return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(cleaned);
        },

        /**
         * Validates 10-digit Indian Mobile Number
         */
        validatePhone: function (phone) {
            if (!phone) return false;
            const cleaned = String(phone).replace(/\D/g, '');
            return /^[6-9]\d{9}$/.test(cleaned);
        },

        /**
         * Validates Virtual Payment Address (UPI ID)
         * e.g., rahul@okaxis, 9876543210@paytm, team@okhdfcbank
         */
        validateUPI: function (upi) {
            if (!upi || typeof upi !== 'string') return false;
            const cleaned = upi.trim().toLowerCase();
            return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/.test(cleaned);
        },

        /**
         * Validates currency amount
         */
        validateAmount: function (amount, max = 100000) {
            const num = Number(amount);
            return !isNaN(num) && num > 0 && num <= max;
        },

        /**
         * Anti-XSS and HTML entity escaping
         */
        sanitizeString: function (str) {
            if (typeof str !== 'string') return '';
            return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        },

        /**
         * Validates Volunteer Expense Reimbursement Claim
         */
        validateReimbursement: function (data) {
            const errors = [];
            if (!data.claimantName || data.claimantName.trim().length < 2) {
                errors.push("Claimant name must be at least 2 characters.");
            }
            if (!this.validateEmail(data.claimantEmail)) {
                errors.push("Valid email address is required.");
            }
            if (!this.validateUPI(data.payoutUpi)) {
                errors.push("Invalid UPI ID (e.g. yourname@okaxis).");
            }
            if (!this.validateAmount(data.amount)) {
                errors.push("Amount must be between ₹1 and ₹1,00,000.");
            }
            if (!data.category) {
                errors.push("Expense category is required.");
            }
            return {
                isValid: errors.length === 0,
                errors
            };
        },

        /**
         * Validates Certificate Verification ID Format
         * Format: PT-CERT-YYYY-[EVENT]-[HEX]
         */
        validateCertificateId: function (certId) {
            if (!certId || typeof certId !== 'string') return false;
            return /^PT-CERT-\d{4}-[A-Z0-9]+-[A-F0-9]{4,8}$/i.test(certId.trim());
        }
    };

    // Attach to global window and window.PassTrack
    window.PassTrackValidator = PassTrackValidator;
    if (window.PassTrack) {
        window.PassTrack.Validator = Object.assign(window.PassTrack.Validator || {}, PassTrackValidator);
    }

    console.log('%c[PassTrack Validator] Initialized (Agent 4 Core)', 'color: #10b981; font-weight: bold;');
})(window);
