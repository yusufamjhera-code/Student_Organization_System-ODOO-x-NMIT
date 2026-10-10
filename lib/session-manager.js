/**
 * PassTrack Single-User Active Session & Inactivity Heartbeat Manager
 * Role: Agent 2 (Authentication, Single-User Session & RBAC Lead)
 *
 * Implements:
 * 1. Concurrency Control: Single active device/tab session per user.
 * 2. Firestore Heartbeat: Listens on /active_sessions/{uid}. If session ID is overwritten,
 *    current tab is immediately revoked with a notification.
 * 3. Inactivity Guard: 30-minute idle timer with auto-logout on protected portals.
 */

(function (window) {
    'use strict';

    const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
    const SESSION_COLLECTION = 'active_sessions';

    class PassTrackSessionManager {
        constructor() {
            this.currentSessionId = null;
            this.unsubscribeSnapshot = null;
            this.idleTimer = null;
            this.lastActiveTime = Date.now();
            this.isRevoked = false;
        }

        /**
         * Generate a unique cryptographic-like session identifier
         */
        _generateSessionId() {
            return 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 12);
        }

        /**
         * Initialize or claim an active session in Firestore for the given user.
         * @param {string} uid - Firebase user ID
         * @param {object} meta - Optional client metadata (userAgent, role, email)
         * @returns {Promise<string>} sessionId
         */
        async createSession(uid, meta = {}) {
            if (!window.firebase || !firebase.firestore) {
                console.warn('[SessionManager] Firestore not loaded; fallback to local session.');
                this.currentSessionId = this._generateSessionId();
                sessionStorage.setItem('pt_session_id', this.currentSessionId);
                return this.currentSessionId;
            }

            const db = firebase.firestore();
            const sessionId = this._generateSessionId();
            this.currentSessionId = sessionId;
            sessionStorage.setItem('pt_session_id', sessionId);

            try {
                await db.collection(SESSION_COLLECTION).doc(uid).set({
                    activeSessionId: sessionId,
                    email: meta.email || (firebase.auth().currentUser ? firebase.auth().currentUser.email : ''),
                    role: meta.role || sessionStorage.getItem('authType') || 'user',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastHeartbeat: Date.now(),
                    deviceInfo: navigator.userAgent.substring(0, 100)
                }, { merge: true });

                console.log(`[SessionManager] Registered active session: ${sessionId}`);
                this.listenForSessionRevocation(uid);
                return sessionId;
            } catch (err) {
                console.error('[SessionManager] Failed to write active session:', err);
                return sessionId;
            }
        }

        /**
         * Listen to Firestore /active_sessions/{uid} in real-time.
         * If the activeSessionId changes to something else, revoke this session immediately.
         * @param {string} uid
         */
        listenForSessionRevocation(uid) {
            if (this.unsubscribeSnapshot) {
                this.unsubscribeSnapshot();
            }

            if (!window.firebase || !firebase.firestore) return;

            const db = firebase.firestore();
            const localSessionId = this.currentSessionId || sessionStorage.getItem('pt_session_id');

            this.unsubscribeSnapshot = db.collection(SESSION_COLLECTION).doc(uid)
                .onSnapshot((doc) => {
                    if (!doc.exists) return;
                    const data = doc.data();
                    const activeSessionId = data.activeSessionId;

                    if (activeSessionId && localSessionId && activeSessionId !== localSessionId) {
                        console.warn('[SessionManager] Concurrency conflict detected! Session overtaken by newer login.');
                        this.handleRevocation('Logged in from another location or tab.');
                    }
                }, (error) => {
                    console.error('[SessionManager] Snapshot listener error:', error);
                });
        }

        /**
         * Revoke current session, notify user, and sign out
         * @param {string} reason
         */
        async handleRevocation(reason = 'Session has expired or was opened elsewhere.') {
            if (this.isRevoked) return;
            this.isRevoked = true;

            if (this.unsubscribeSnapshot) {
                this.unsubscribeSnapshot();
                this.unsubscribeSnapshot = null;
            }

            // Dispatch global reactive event
            document.dispatchEvent(new CustomEvent('passtrack:session:revoked', {
                detail: { reason, timestamp: Date.now() }
            }));

            // Alert user via Toast if available
            if (window.PassTrack && window.PassTrack.UI && typeof window.PassTrack.UI.toast === 'function') {
                window.PassTrack.UI.toast(`⚠️ ${reason}`, 'warn', 5000);
            } else if (window.PassTrackToast) {
                window.PassTrackToast.warn(`⚠️ ${reason}`, 5000);
            }

            // Clear session data
            sessionStorage.removeItem('pt_session_id');
            sessionStorage.removeItem('authType');
            sessionStorage.removeItem('orgId');

            setTimeout(async () => {
                if (window.firebase && firebase.auth) {
                    try {
                        await firebase.auth().signOut();
                    } catch (e) {}
                }
                // Redirect back to universal login
                const currentPath = window.location.pathname;
                const isAuthPage = currentPath.endsWith('index.html') || currentPath.endsWith('login.html') || currentPath === '/';
                if (!isAuthPage) {
                    window.location.href = `/index.html?reason=session_revoked&redirect=${encodeURIComponent(location.pathname + location.search)}`;
                }
            }, 1200);
        }

        /**
         * Initialize the 30-minute idle inactivity tracker
         */
        initIdleInactivityTracker() {
            const resetTimer = () => {
                this.lastActiveTime = Date.now();
                if (this.idleTimer) clearTimeout(this.idleTimer);
                this.idleTimer = setTimeout(() => {
                    this.handleInactivityTimeout();
                }, IDLE_TIMEOUT_MS);
            };

            const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
            events.forEach(evt => window.addEventListener(evt, resetTimer, { passive: true }));

            resetTimer();
        }

        /**
         * Called when user has been idle for 30 minutes
         */
        handleInactivityTimeout() {
            console.warn('[SessionManager] Idle timeout triggered after 30 minutes.');
            this.handleRevocation('Logged out due to 30 minutes of inactivity.');
        }

        /**
         * Clean up all listeners
         */
        destroy() {
            if (this.unsubscribeSnapshot) {
                this.unsubscribeSnapshot();
                this.unsubscribeSnapshot = null;
            }
            if (this.idleTimer) {
                clearTimeout(this.idleTimer);
                this.idleTimer = null;
            }
        }
    }

    // Expose singleton to window
    window.PassTrackSessionManager = new PassTrackSessionManager();

})(window);
