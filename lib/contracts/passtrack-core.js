/**
 * PassTrack Unified Global Contract Interface
 * Core namespace shared across all 4 agents
 */
window.PassTrack = window.PassTrack || {
    version: "2026.1.0",

    // ==========================================
    // AGENT 1 CONTRACT: UI & DESIGN SYSTEM
    // ==========================================
    UI: {
        toast: (message, type = 'info', duration = 4000) => {
            if (window.PassTrackToast && typeof window.PassTrackToast.show === 'function') {
                return window.PassTrackToast.show(message, type, duration);
            }
            console.log(`[PassTrack Toast] [${type}] ${message}`);
        },
        showModal: (modalId, options = {}) => {
            const el = document.getElementById(modalId);
            if (!el) return;
            el.classList.add('pt-modal--active');
            el.setAttribute('aria-hidden', 'false');
            document.body.classList.add('pt-modal-open');
        },
        closeModal: (modalId) => {
            const el = document.getElementById(modalId);
            if (!el) return;
            el.classList.remove('pt-modal--active');
            el.setAttribute('aria-hidden', 'true');
            if (!document.querySelector('.pt-modal--active')) {
                document.body.classList.remove('pt-modal-open');
            }
        },
        renderSkeleton: (containerSelector, type = 'card', count = 3) => {
            const container = document.querySelector(containerSelector);
            if (!container) return;
            let html = '';
            for (let i = 0; i < count; i++) {
                html += `<div class="pt-skeleton pt-skeleton--${type}"></div>`;
            }
            container.innerHTML = html;
        },
        setButtonLoading: (buttonElement, isLoading, loadingText = 'Processing...') => {
            if (!buttonElement) return;
            if (isLoading) {
                buttonElement.dataset.originalText = buttonElement.innerHTML;
                buttonElement.disabled = true;
                buttonElement.classList.add('btn--loading');
                buttonElement.innerHTML = `<span class="pt-spinner"></span> ${loadingText}`;
            } else {
                buttonElement.disabled = false;
                buttonElement.classList.remove('btn--loading');
                if (buttonElement.dataset.originalText) {
                    buttonElement.innerHTML = buttonElement.dataset.originalText;
                }
            }
        }
    },

    // ==========================================
    // AGENT 2 CONTRACT: AUTH & SESSION ENGINE
    // ==========================================
    Auth: {
        getCurrentUser: () => (window.firebase && firebase.auth ? firebase.auth().currentUser : null),
        getCurrentRole: () => 'guest',
        hasRole: (requiredRole) => false,
        requireAuth: (requiredRole = null) => {},
        enforceSingleSession: async (uid) => {},
        logout: async () => {
            if (window.firebase && firebase.auth) {
                await firebase.auth().signOut();
                window.location.href = '/auth/login.html';
            }
        }
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
        validateEmail: (email) => {
            return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        validatePhone: (phone) => {
            return typeof phone === 'string' && /^[6-9]\d{9}$/.test(phone.replace(/\D/g, ''));
        },
        sanitizeString: (input) => {
            if (typeof input !== 'string') return '';
            return input.replace(/[&<>"']/g, (m) => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            }[m]));
        },
        validateAmount: (amount) => {
            const num = Number(amount);
            return !isNaN(num) && num >= 0 && num <= 50000;
        }
    },
    Notifier: {
        sendTicketEmail: async (orderData) => {},
        sendReceiptEmail: async (receiptData) => {}
    },

    // ==========================================
    // SHARED EVENT BUS
    // ==========================================
    events: {
        on: (eventName, cb) => window.addEventListener(eventName, cb),
        emit: (eventName, detail) => window.dispatchEvent(new CustomEvent(eventName, { detail }))
    }
};
