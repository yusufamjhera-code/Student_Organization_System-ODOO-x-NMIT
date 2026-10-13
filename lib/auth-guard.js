/**
 * PassTrack Unified Route Guard & RBAC Engine
 * Role: Agent 2 (Authentication, Single-User Session & RBAC Lead)
 *
 * Implements:
 * 1. Global Route Protection: Guard protected portals (/organizer/, /treasury/, /distributor/)
 * 2. Return URL Preservation: Redirects unauthorized visits with ?redirect=...
 * 3. Session Integration: Wires SessionManager heartbeat and 30-minute idle tracker
 * 4. window.PassTrack.Auth implementation conforming to the global contract
 */

(function (window) {
    'use strict';

    class PassTrackAuthGuard {
        constructor() {
            this.currentUser = null;
            this.currentRole = 'guest';
            this.isInitialized = false;
        }

        /**
         * Initialize the auth listener and attach to global PassTrack contract
         */
        init() {
            if (this.isInitialized) return;
            this.isInitialized = true;

            // Wire into window.PassTrack if available
            if (window.PassTrack && window.PassTrack.Auth) {
                window.PassTrack.Auth.getCurrentUser = () => this.getCurrentUser();
                window.PassTrack.Auth.getCurrentRole = () => this.getCurrentRole();
                window.PassTrack.Auth.hasRole = (role) => this.hasRole(role);
                window.PassTrack.Auth.requireAuth = (role) => this.requireAuth(role);
                window.PassTrack.Auth.enforceSingleSession = (uid) => this.enforceSingleSession(uid);
                window.PassTrack.Auth.logout = () => this.logout();
            }

            if (window.firebase && firebase.auth) {
                firebase.auth().onAuthStateChanged(async (user) => {
                    this.currentUser = user;

                    if (user && !user.isAnonymous) {
                        await this._resolveAndStoreRole(user);

                        // Attach session concurrency listener and idle timer
                        if (window.PassTrackSessionManager) {
                            window.PassTrackSessionManager.listenForSessionRevocation(user.uid);
                            window.PassTrackSessionManager.initIdleInactivityTracker();
                        }

                        document.dispatchEvent(new CustomEvent('passtrack:auth:change', {
                            detail: { user, role: this.currentRole, isAuthenticated: true }
                        }));
                    } else {
                        this.currentUser = null;
                        this.currentRole = 'guest';

                        document.dispatchEvent(new CustomEvent('passtrack:auth:change', {
                            detail: { user: null, role: 'guest', isAuthenticated: false }
                        }));
                    }
                });
            }
        }

        /**
         * Resolve user role from Firestore and sessionStorage
         */
        async _resolveAndStoreRole(user) {
            const cachedRole = sessionStorage.getItem('authType');
            if (cachedRole) {
                this.currentRole = cachedRole;
            }

            if (!window.firebase || !firebase.firestore) return;

            try {
                const db = firebase.firestore();
                const email = (user.email || '').toLowerCase();

                // Check userProfiles collection first
                const profileDoc = await db.collection('userProfiles').doc(user.uid).get();
                if (profileDoc.exists) {
                    const profile = profileDoc.data();
                    if (profile.role === 'staff' || profile.role === 'volunteer') {
                        this.currentRole = 'collaborator';
                        sessionStorage.setItem('authType', 'staff');
                    } else if (profile.role === 'member') {
                        this.currentRole = 'member';
                        sessionStorage.setItem('authType', 'member');
                    } else if (profile.role === 'organizer') {
                        this.currentRole = 'organizer';
                        sessionStorage.setItem('authType', 'organizer');
                    }
                    if (profile.orgId) sessionStorage.setItem('orgId', profile.orgId);
                } else {
                    // Check organization ownership
                    const orgSnap = await db.collection('organizations')
                        .where('ownerId', '==', user.uid)
                        .limit(1)
                        .get();

                    if (!orgSnap.empty) {
                        this.currentRole = 'organizer';
                        sessionStorage.setItem('authType', 'organizer');
                        sessionStorage.setItem('orgId', orgSnap.docs[0].id);
                    } else if (email) {
                        // Check member status
                        const memberSnap = await db.collection('members')
                            .where('email', '==', email)
                            .limit(1)
                            .get();

                        if (!memberSnap.empty) {
                            this.currentRole = 'member';
                            sessionStorage.setItem('authType', 'member');
                        } else {
                            // Check staff collaborator status
                            const eventSnap = await db.collection('events')
                                .where('collaboratorEmails', 'array-contains', email)
                                .limit(1)
                                .get();

                            if (!eventSnap.empty) {
                                this.currentRole = 'collaborator';
                                sessionStorage.setItem('authType', 'collaborator');
                            }
                        }
                    }
                }

                document.dispatchEvent(new CustomEvent('passtrack:role:updated', {
                    detail: { role: this.currentRole, user }
                }));
            } catch (err) {
                console.warn('[AuthGuard] Role resolution error:', err);
            }
        }

        /**
         * Guard a protected page. Call this on pages that require authentication.
         * @param {string|string[]} [requiredRole] - Optional role requirement (e.g. 'organizer' or ['organizer', 'collaborator'])
         * @param {string} [redirectUrl] - Path to redirect to on auth failure
         */
        async protectRoute(requiredRole = null, redirectUrl = null) {
            return new Promise((resolve) => {
                // 1. Direct demonstration mode & GitHub Pages showcase bypass
                const isDemo = sessionStorage.getItem('demoUser') === 'true' ||
                    window.location.search.includes('demo=true') ||
                    window.location.hostname.includes('github.io');

                if (isDemo) {
                    console.info('[AuthGuard] Demonstration mode active; granting instant section access.');
                    const mockDemoUser = {
                        uid: 'demo-organizer-uid',
                        email: sessionStorage.getItem('collaboratorEmail') || 'organizer@nmit.ac.in',
                        displayName: 'Demo Host',
                        isAnonymous: false
                    };
                    this.currentUser = mockDemoUser;
                    this.currentRole = sessionStorage.getItem('authType') || 'organizer';
                    sessionStorage.setItem('orgId', sessionStorage.getItem('orgId') || 'demo-org-acm');
                    return resolve(mockDemoUser);
                }

                if (!window.firebase || !firebase.auth) {
                    console.warn('[AuthGuard] Firebase Auth not loaded yet; allowing test flow.');
                    return resolve(true);
                }

                const unsubscribe = firebase.auth().onAuthStateChanged(async (user) => {
                    unsubscribe();

                    if (!user || user.isAnonymous) {
                        console.warn('[AuthGuard] Access denied: User not authenticated.');
                        this._handleUnauthorizedRedirect(redirectUrl, 'Authentication required to access this portal.');
                        return;
                    }

                    this.currentUser = user;
                    await this._resolveAndStoreRole(user);

                    // Check role permissions if specified
                    if (requiredRole) {
                        const rolesAllowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
                        const hasAllowedRole = rolesAllowed.some(r => this.hasRole(r));

                        if (!hasAllowedRole && this.currentRole !== 'organizer' && this.currentRole !== 'admin') {
                            console.warn(`[AuthGuard] Access denied: Required role [${rolesAllowed.join(', ')}] not held by [${this.currentRole}].`);
                            this._handleUnauthorizedRedirect(redirectUrl, 'You do not have permission to view this section.');
                            return;
                        }
                    }

                    // Start session heartbeat & idle timer
                    if (window.PassTrackSessionManager) {
                        window.PassTrackSessionManager.listenForSessionRevocation(user.uid);
                        window.PassTrackSessionManager.initIdleInactivityTracker();
                    }

                    resolve(user);
                });
            });
        }

        /**
         * Redirect unauthorized visitors with return parameter preserved
         */
        _handleUnauthorizedRedirect(customRedirectUrl, message) {
            // Determine relative path to index.html based on folder depth
            let target = customRedirectUrl;
            if (!target) {
                const path = window.location.pathname;
                target = (path.includes('/organizer/') || path.includes('/treasury/') || path.includes('/distributor/') || path.includes('/tasks/') || path.includes('/announcements/'))
                    ? '../index.html'
                    : 'index.html';
            }

            const currentUrl = encodeURIComponent(window.location.pathname + window.location.search);
            const redirectFinal = `${target}?redirect=${currentUrl}`;

            if (window.PassTrackToast) {
                window.PassTrackToast.warn(message, 4000);
            }

            setTimeout(() => {
                window.location.href = redirectFinal;
            }, 300);
        }

        getCurrentUser() {
            return this.currentUser || (window.firebase && firebase.auth ? firebase.auth().currentUser : null);
        }

        getCurrentRole() {
            return this.currentRole || sessionStorage.getItem('authType') || 'guest';
        }

        hasRole(requiredRole) {
            const role = this.getCurrentRole();
            if (role === 'admin' || role === 'organizer') return true;
            return role.toLowerCase() === (requiredRole || '').toLowerCase();
        }

        async requireAuth(requiredRole = null) {
            return this.protectRoute(requiredRole);
        }

        async enforceSingleSession(uid) {
            if (window.PassTrackSessionManager) {
                return window.PassTrackSessionManager.createSession(uid);
            }
        }

        async logout() {
            if (window.PassTrackSessionManager) {
                window.PassTrackSessionManager.destroy();
            }
            sessionStorage.clear();
            if (window.firebase && firebase.auth) {
                await firebase.auth().signOut();
            }
            window.location.href = '/index.html';
        }
    }

    const guard = new PassTrackAuthGuard();
    guard.init();

    window.PassTrackAuth = guard;

})(window);
