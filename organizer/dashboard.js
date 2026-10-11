// File: organizer/dashboard.js
document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const firestore = firebase.firestore();

    // --- DOM ELEMENTS ---
    const orgNameHeader = document.getElementById('org-name-header');
    const createEventForm = document.getElementById('create-event-form');
    const eventListEl = document.getElementById('event-list');
    const eventCountEl = document.getElementById('event-count');
    const logoutBtn = document.getElementById('logout-btn');
    const toastContainer = document.getElementById('toast-container');
    const submitBtn = document.getElementById('submit-btn');

    // ID Validation Elements
    const eventIdInput = document.getElementById('event-id');
    const idFeedback = document.getElementById('id-feedback');
    const idStatusIcon = document.getElementById('id-status-icon');

    // Date Elements
    const startDateInput = document.getElementById('event-date');
    const endDateInput = document.getElementById('event-end-date');
    const startDateFeedback = document.getElementById('start-date-feedback');
    const endDateFeedback = document.getElementById('end-date-feedback');

    // Station Logic
    const stationInput = document.getElementById('station-input');
    const stationStart = document.getElementById('station-start');
    const stationEnd = document.getElementById('station-end');
    const stationAllDays = document.getElementById('station-all-days');
    const stationDateGroup = document.getElementById('station-date-group');
    const stationDateFrom = document.getElementById('station-date-from');
    const stationDateTo = document.getElementById('station-date-to');
    const addStationBtn = document.getElementById('add-station-btn');
    const tagsContainer = document.getElementById('station-tags-container');

    // Popups
    const entryPopup = document.getElementById('entry-point-popup');
    const helpCenterPopup = document.getElementById('help-center');
    const closeHelpBtn = document.getElementById('close-help-btn');

    let stations = [{ name: "Entrance", dateFrom: "all", dateTo: "all", start: "00:00", end: "23:59" }];
    let currentOrganizer = null;
    let currentOrgId = null;
    let isIdValid = false;
    let areDatesValid = false;

    // Modal Elements
    const createEventModal = document.getElementById('create-event-modal');
    const openCreateModalBtn = document.getElementById('open-create-modal-btn');
    const openCreateModalBtn2 = document.getElementById('open-create-modal-btn-2');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelCreateBtn = document.getElementById('cancel-create-btn');

    const openModal = () => {
        if (createEventModal) {
            createEventModal.classList.add('active');
            createEventModal.setAttribute('aria-hidden', 'false');
        }
    };

    const closeModal = () => {
        if (createEventModal) {
            createEventModal.classList.remove('active');
            createEventModal.setAttribute('aria-hidden', 'true');
        }
    };

    if (openCreateModalBtn) openCreateModalBtn.addEventListener('click', openModal);
    if (openCreateModalBtn2) openCreateModalBtn2.addEventListener('click', openModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (cancelCreateBtn) cancelCreateBtn.addEventListener('click', closeModal);

    if (createEventModal) {
        createEventModal.addEventListener('click', (e) => {
            if (e.target === createEventModal) closeModal();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && createEventModal && createEventModal.classList.contains('active')) {
            closeModal();
        }
    });

    // Check auth type from session
    const authType = sessionStorage.getItem('authType') || 'admin';
    const collaboratorEmail = sessionStorage.getItem('collaboratorEmail') || '';
    const isCollaborator = authType === 'collaborator' && collaboratorEmail;

    // --- SET MINIMUM DATES TO TODAY ---
    const setMinDates = () => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const minDate = `${yyyy}-${mm}-${dd}`;

        startDateInput.setAttribute('min', minDate);
        endDateInput.setAttribute('min', minDate);
    };
    setMinDates();

    // --- POPUP HANDLERS ---
    if (closeHelpBtn) {
        closeHelpBtn.onclick = (e) => {
            e.stopPropagation();
            if (helpCenterPopup) helpCenterPopup.style.display = 'none';
        };
    }

    // Auto-dismiss popups
    setTimeout(() => {
        if (entryPopup) {
            entryPopup.style.opacity = '0';
            setTimeout(() => entryPopup.style.display = 'none', 500);
        }
    }, 8000);

    setTimeout(() => {
        if (helpCenterPopup && helpCenterPopup.style.display !== 'none') {
            helpCenterPopup.style.opacity = '0';
            setTimeout(() => helpCenterPopup.style.display = 'none', 500);
        }
    }, 20000);

    // --- HELPER: DATE FORMATTER ---
    const formatDateAesthetic = (dateString) => {
        if (!dateString) return 'TBD';
        const date = new Date(dateString);
        const day = date.getDate();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const getOrdinal = (n) => {
            const s = ["th", "st", "nd", "rd"];
            const v = n % 100;
            return n + (s[(v - 20) % 10] || s[v] || s[0]);
        };
        return `${getOrdinal(day)} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    };

    // --- HELPER: TOAST NOTIFICATION ---
    const showToast = (message, type = 'info') => {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const iconClass = type === 'success' ? 'ph-check-circle' : 'ph-warning-circle';
        toast.innerHTML = `<i class="ph-bold ${iconClass}"></i><span>${message}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.5s ease-in forwards';
            setTimeout(() => { if (toast.parentElement) toast.remove(); }, 500);
        }, 5000);
    };

    // --- DATE VALIDATION ---
    const validateDates = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const startDate = startDateInput.value ? new Date(startDateInput.value) : null;
        const endDate = endDateInput.value ? new Date(endDateInput.value) : null;

        let startValid = true;
        let endValid = true;

        // Validate start date
        if (startDate) {
            if (startDate < today) {
                startDateFeedback.textContent = '❌ Cannot be in the past';
                startDateFeedback.className = 'feedback-text date-feedback invalid';
                startDateInput.classList.add('error');
                startDateInput.classList.remove('valid');
                startValid = false;
            } else {
                startDateFeedback.textContent = '';
                startDateInput.classList.remove('error');
                startDateInput.classList.add('valid');
            }
        } else {
            startDateFeedback.textContent = '';
            startDateInput.classList.remove('error', 'valid');
        }

        // Validate end date
        if (endDate) {
            if (endDate < today) {
                endDateFeedback.textContent = '❌ Cannot be in the past';
                endDateFeedback.className = 'feedback-text date-feedback invalid';
                endDateInput.classList.add('error');
                endDateInput.classList.remove('valid');
                endValid = false;
            } else if (startDate && endDate < startDate) {
                endDateFeedback.textContent = '❌ Must be after start date';
                endDateFeedback.className = 'feedback-text date-feedback invalid';
                endDateInput.classList.add('error');
                endDateInput.classList.remove('valid');
                endValid = false;
            } else {
                endDateFeedback.textContent = '';
                endDateInput.classList.remove('error');
                endDateInput.classList.add('valid');
            }
        } else {
            endDateFeedback.textContent = '';
            endDateInput.classList.remove('error', 'valid');
        }

        areDatesValid = startValid && endValid && startDate && endDate;
        toggleSubmit();

        // Update toggle label: "All Day" for single day, "All Days" for multi-day
        const toggleLabel = document.querySelector('.all-days-toggle .toggle-label');
        if (toggleLabel && startDate && endDate && startDate === endDate) {
            toggleLabel.textContent = 'All Day';
        } else if (toggleLabel) {
            toggleLabel.textContent = 'All Days';
        }
    };

    startDateInput.addEventListener('change', validateDates);
    endDateInput.addEventListener('change', validateDates);

    // --- INSTAGRAM-STYLE ID VALIDATION ---
    const checkIdUniqueness = async (val) => {
        const id = val.trim().toLowerCase();
        if (id.length < 3) {
            updateIdUI('invalid', 'Min 3 characters required');
            isIdValid = false;
            toggleSubmit();
            return;
        }

        updateIdUI('loading', 'Checking availability...');

        try {
            const snap = await firestore.collection('events').where('eventId', '==', id).get();
            if (snap.empty) {
                updateIdUI('valid', '✅ This Event ID is available!');
                isIdValid = true;
            } else {
                updateIdUI('invalid', '❌ This ID is already taken.');
                isIdValid = false;
            }
        } catch (e) {
            updateIdUI('invalid', 'Error checking availability.');
        }
        toggleSubmit();
    };

    const updateIdUI = (state, text) => {
        idStatusIcon.className = `status-icon ${state}`;
        idFeedback.textContent = text;
        idFeedback.className = `feedback-text ${state}`;
    };

    const debounce = (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    };

    const debouncedCheck = debounce(checkIdUniqueness, 600);

    eventIdInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
        e.target.value = val;
        isIdValid = false;
        updateIdUI('loading', 'Typing...');
        toggleSubmit();
        debouncedCheck(val);
    });

    const toggleSubmit = () => {
        submitBtn.disabled = !(isIdValid && areDatesValid);
    };

    // --- AUTHENTICATION ---
    const revealDashboard = () => {
        const mainContainer = document.getElementById('main-container');
        if (mainContainer) mainContainer.style.opacity = '1';
    };

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentOrganizer = user;
            if (isCollaborator) {
                setupCollaboratorView();
            } else {
                try {
                    await fetchOrganizerDetails(user.uid);
                    renderTags();
                    listenForEvents(user.uid);
                } catch (e) {
                    console.error("Dashboard init error:", e);
                    listenForEvents(user.uid);
                }
            }
            revealDashboard();
        } else if (isCollaborator && collaboratorEmail) {
            setupCollaboratorView();
            revealDashboard();
        } else {
            // Check if there is an active session or redirect to login
            const activeUid = sessionStorage.getItem('userId');
            if (activeUid) {
                currentOrganizer = { uid: activeUid };
                await fetchOrganizerDetails(activeUid);
                renderTags();
                listenForEvents(activeUid);
                revealDashboard();
            } else {
                window.location.href = '../index.html';
            }
        }
    });

    const setupCollaboratorView = () => {
        // Collaborator mode: hide creation form, show only assigned events
        const actionsColumn = document.querySelector('.actions-column');
        if (actionsColumn) actionsColumn.style.display = 'none';

        // Hide popups for collaborators
        const popupStack = document.querySelector('.popup-stack');
        if (popupStack) popupStack.style.display = 'none';

        // Update header for collaborator
        orgNameHeader.textContent = `Welcome, ${collaboratorEmail.split('@')[0]}`;

        // Listen for events where user is collaborator
        listenForCollaboratorEvents(collaboratorEmail);
    };

    const fetchOrganizerDetails = async (uid) => {
        // Read org name from the organizations collection (user-provided name)
        let orgSnap = await firestore.collection('organizations')
            .where('ownerId', '==', uid)
            .limit(1)
            .get();
        if (orgSnap.empty) {
            orgSnap = await firestore.collection('organizations').limit(1).get();
        }
        if (!orgSnap.empty) {
            orgNameHeader.textContent = orgSnap.docs[0].data().name;
            currentOrgId = orgSnap.docs[0].id;
            loadOrgStats(currentOrgId);
        } else {
            // No org found — redirect to setup page
            window.location.href = 'setup-org.html';
        }
    };

    const loadOrgStats = (orgId) => {
        if (!orgId) return;
        firestore.collection('tasks').where('orgId', '==', orgId).onSnapshot(snap => {
            const el = document.getElementById('kpi-tasks-count');
            if (el) el.textContent = snap.size;
        }, () => {});

        firestore.collection('members').where('orgId', '==', orgId).onSnapshot(snap => {
            const el = document.getElementById('kpi-members-count');
            if (el) el.textContent = snap.size;
            const badge = document.getElementById('hub-badge-members');
            if (badge) badge.textContent = `${snap.size} Members`;
        }, () => {});

        firestore.collection('organizations').doc(orgId).onSnapshot(doc => {
            if (doc.exists) {
                const bal = Number(doc.data().treasuryBalance || 0);
                const badge = document.getElementById('hub-badge-treasury');
                if (badge) badge.textContent = `₹${bal.toLocaleString()} Net`;
            }
        }, () => {});
    };

    let unsubscribeUserPasses = null;
    const eventStatsListeners = new Map();
    const eventPassCounts = {};

    const updateTotalPassesKpi = (directSize = null) => {
        const kpiPassesCountEl = document.getElementById('kpi-passes-count');
        if (!kpiPassesCountEl) return;
        const sumEvents = Object.values(eventPassCounts).reduce((a, b) => a + b, 0);
        const finalVal = directSize !== null ? Math.max(directSize, sumEvents) : sumEvents;
        kpiPassesCountEl.textContent = finalVal;
    };

    // --- EVENT LISTING (Admin) ---
    const listenForEvents = (uid) => {
        firestore.collection('events')
            .where('organizerId', '==', uid)
            .orderBy('createdAt', 'desc')
            .onSnapshot((snapshot) => {
                const totalEvents = snapshot.size;
                eventCountEl.textContent = totalEvents;
                const kpiEventsCountEl = document.getElementById('kpi-events-count');
                if (kpiEventsCountEl) kpiEventsCountEl.textContent = totalEvents;

                if (snapshot.empty) {
                    eventListEl.innerHTML = '<div class="empty-state"><i class="ph ph-stack"></i><p>No events yet. Create your first one!</p></div>';
                    updateTotalPassesKpi(0);
                    return;
                }

                eventListEl.innerHTML = '';
                snapshot.forEach(doc => renderEventCard(doc, true));
            });

        // Real-time listener for ALL passes/tokens issued under this organizer
        if (unsubscribeUserPasses) unsubscribeUserPasses();
        unsubscribeUserPasses = firestore.collection('users')
            .where('organizerId', '==', uid)
            .onSnapshot((userSnap) => {
                updateTotalPassesKpi(userSnap.size);
            }, (err) => {
                console.warn("Could not attach real-time user pass listener:", err);
            });
    };

    // --- EVENT LISTING (Collaborator) ---
    const listenForCollaboratorEvents = (email) => {
        firestore.collection('events')
            .where('collaboratorEmails', 'array-contains', email.toLowerCase())
            .onSnapshot((snapshot) => {
                const accessibleEvents = snapshot.docs;

                // In-memory sort by createdAt descending to avoid requiring composite indexes
                accessibleEvents.sort((a, b) => {
                    const tA = a.data().createdAt?.toMillis ? a.data().createdAt.toMillis() : new Date(a.data().createdAt || 0).getTime();
                    const tB = b.data().createdAt?.toMillis ? b.data().createdAt.toMillis() : new Date(b.data().createdAt || 0).getTime();
                    return tB - tA;
                });

                eventCountEl.textContent = accessibleEvents.length;
                const kpiEventsCountEl = document.getElementById('kpi-events-count');
                if (kpiEventsCountEl) kpiEventsCountEl.textContent = accessibleEvents.length;

                if (accessibleEvents.length === 0) {
                    eventListEl.innerHTML = '<div class="empty-state"><i class="ph ph-lock"></i><p>No events assigned to you yet.</p></div>';
                    updateTotalPassesKpi(0);
                    return;
                }

                eventListEl.innerHTML = '';
                accessibleEvents.forEach(doc => renderEventCard(doc, false));
            }, (error) => {
                console.error("Collaborator events query error:", error);
                eventListEl.innerHTML = `<div class="empty-state"><i class="ph ph-warning"></i><p>Could not load events: ${error.message}</p></div>`;
            });
    };

    // --- RENDER EVENT CARD ---
    const renderEventCard = (doc, canDelete) => {
        const event = doc.data();
        const eventId = doc.id;

        const startFormatted = formatDateAesthetic(event.eventDate);
        const endFormatted = formatDateAesthetic(event.eventEndDate);
        const dateDisplay = (event.eventEndDate && event.eventEndDate !== event.eventDate)
            ? `${startFormatted} — ${endFormatted}` : startFormatted;

        // Check if event has passed
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const eventEndDate = new Date(event.eventEndDate || event.eventDate);
        const isPastEvent = eventEndDate < today;

        const eventEl = document.createElement('div');
        eventEl.className = `event-item ${isPastEvent ? 'past-event' : ''}`;
        eventEl.innerHTML = `
            <div class="event-info">
                <div class="name">${event.name}</div>
                <div class="details">
                    <span><i class="ph ph-calendar"></i> ${dateDisplay}</span>
                    <span><i class="ph ph-map-pin"></i> ${event.stations ? event.stations.length : 1} Stations</span>
                </div>
            </div>
            <div class="event-actions">
                <div class="event-stats" id="stats-${eventId}">
                    <span class="count">...</span>
                    <span class="label">Loading</span>
                </div>
                ${canDelete ? `<button class="del-btn" onclick="deleteEvent(event, '${eventId}', '${event.name}')"><i class="ph ph-trash"></i></button>` : ''}
                <i class="ph ph-caret-right" style="color: var(--primary); font-size: 1.25rem;"></i>
            </div>
        `;

        eventEl.onclick = (e) => {
            if (!e.target.closest('.del-btn')) {
                window.location.href = `manage-event.html?id=${eventId}`;
            }
        };

        eventListEl.appendChild(eventEl);
        fetchStatsForEvent(eventId);
    };

    const fetchStatsForEvent = (docId) => {
        if (eventStatsListeners.has(docId)) {
            eventStatsListeners.get(docId)();
        }
        const unsub = firestore.collection('users')
            .where('eventDocId', '==', docId)
            .onSnapshot((snap) => {
                const total = snap.size;
                eventPassCounts[docId] = total;
                updateTotalPassesKpi();

                let scanned = 0;
                snap.forEach(pDoc => {
                    const data = pDoc.data();
                    const perms = Object.values(data.permissions || {});
                    // Count only if ALL access points are used (fully scanned)
                    const fullyUsed = perms.length > 0 && perms.every(v => v.status === 'used');
                    if (fullyUsed) scanned++;
                });

                const statsBox = document.getElementById(`stats-${docId}`);
                if (statsBox) {
                    statsBox.innerHTML = `<span class="count">${scanned}/${total}</span><span class="label">Fully Scanned</span>`;
                }
            }, (e) => {
                console.error("Stats Error:", e);
            });
        eventStatsListeners.set(docId, unsub);
    };

    // --- EVENT CREATION ---
    createEventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!isIdValid || !areDatesValid) return;

        const eventName = document.getElementById('event-name').value.trim();
        const publicId = eventIdInput.value.trim().toLowerCase();
        const staffPass = document.getElementById('distributor-code').value.trim();
        const sDate = startDateInput.value;
        const eDate = endDateInput.value;

        // Staff password minimum 4 characters validation
        if (staffPass.length < 4) {
            showToast("Staff password must be at least 4 characters.", "danger");
            return;
        }

        // Final validation - dates cannot be in the past
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (new Date(sDate) < today || new Date(eDate) < today) {
            showToast("Dates cannot be in the past!", "danger");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="ph-bold ph-spinner" style="animation: spin 1s linear infinite;"></i> Creating...';

        try {
            await firestore.collection('events').add({
                organizerId: currentOrganizer.uid,
                orgId: currentOrgId,
                name: eventName,
                eventId: publicId,
                eventDate: sDate,
                eventEndDate: eDate,
                distributorCode: staffPass,
                stations: stations,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            showToast("Event Successfully Created!", "success");
            closeModal();
            createEventForm.reset();
            isIdValid = false;
            areDatesValid = false;
            updateIdUI('', 'Unique identifier for staff login.');
            startDateFeedback.textContent = '';
            endDateFeedback.textContent = '';
            startDateInput.classList.remove('error', 'valid');
            endDateInput.classList.remove('error', 'valid');
            stations = [{ name: "Entrance", dateFrom: "all", dateTo: "all", start: "00:00", end: "23:59" }];
            renderTags();
            toggleSubmit();
        } catch (error) {
            console.error("Event Creation Error:", error);
            if (sessionStorage.getItem('demoUser') === 'true' || (window.firebaseConfig && firebaseConfig.apiKey === "YOUR_API_KEY")) {
                showToast(`Event "${eventName}" initialized (Demo Mode)!`, "success");
                closeModal();
                createEventForm.reset();
            } else {
                showToast("Failed to create event.", "danger");
            }
        } finally {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="ph-bold ph-rocket-launch"></i> Initialize Event';
        }
    });

    // --- STATION TAGS ---
    const formatDateShort = (dateStr) => {
        if (!dateStr || dateStr === 'all') return 'All Days';
        const date = new Date(dateStr);
        const day = date.getDate();
        const suffix = day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th';
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${day}${suffix} ${months[date.getMonth()]}`;
    };

    const formatDateRange = (dateFrom, dateTo) => {
        if (dateFrom === 'all' || dateTo === 'all') return 'All Days';
        const from = formatDateShort(dateFrom);
        const to = formatDateShort(dateTo);
        // Same date = single day, different dates = range
        return from === to ? from : `${from} — ${to}`;
    };

    const renderTags = () => {
        tagsContainer.innerHTML = '';
        stations.forEach((s, idx) => {
            const tag = document.createElement('div');
            tag.className = 'tag';
            const dateDisplay = formatDateRange(s.dateFrom || s.date || 'all', s.dateTo || s.date || 'all');
            tag.innerHTML = `
                <div class="tag-content">
                    <strong>${s.name}</strong>
                    <small>${dateDisplay} • ${s.start} — ${s.end}</small>
                </div>
                ${stations.length > 1 ? `<i class="ph-bold ph-trash" onclick="removeStation(${idx})"></i>` : ''}
            `;
            tagsContainer.appendChild(tag);
        });
    };

    window.removeStation = (idx) => {
        stations.splice(idx, 1);
        renderTags();
    };

    addStationBtn.onclick = () => {
        const name = stationInput.value.trim();
        const start = stationStart.value || '00:00';
        const end = stationEnd.value || '23:59';
        const isAllDays = stationAllDays.checked;
        const dateFrom = isAllDays ? 'all' : stationDateFrom.value;
        const dateTo = isAllDays ? 'all' : stationDateTo.value;

        if (!name) return showToast("Enter access point name", "danger");

        // Validate that start time is before end time
        if (start >= end) {
            return showToast("Start time must be before end time.", "danger");
        }

        // Validate dates are selected if not all days
        if (!isAllDays && (!dateFrom || !dateTo)) {
            return showToast("Please select both From and To dates.", "danger");
        }

        // Validate From date is not after To date
        if (!isAllDays && dateFrom > dateTo) {
            return showToast("From date must be before To date.", "danger");
        }

        // Validate access point dates are not in the past
        if (!isAllDays) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayStr = today.toISOString().split('T')[0];
            if (dateFrom < todayStr) {
                return showToast("Access point dates cannot be in the past.", "danger");
            }
        }

        // Validate dates are within event range
        if (!isAllDays) {
            const eventStart = startDateInput.value;
            const eventEnd = endDateInput.value;
            if (eventStart && eventEnd) {
                if (dateFrom < eventStart || dateTo > eventEnd) {
                    return showToast("Dates must be within event date range.", "danger");
                }
            }
        }

        stations.push({ name, dateFrom, dateTo, start, end });
        stationInput.value = '';
        stationStart.value = '00:00';
        stationEnd.value = '23:59';
        stationAllDays.checked = true;
        stationDateGroup.style.display = 'none';
        stationDateFrom.value = '';
        stationDateTo.value = '';
        renderTags();
    };

    // Toggle date picker visibility
    stationAllDays.addEventListener('change', () => {
        stationDateGroup.style.display = stationAllDays.checked ? 'none' : 'block';
    });

    window.deleteEvent = async (e, id, name) => {
        e.stopPropagation();
        if (!confirm(`Delete "${name}" and all guest data?`)) return;
        try {
            const batch = firestore.batch();
            const users = await firestore.collection('users').where('eventDocId', '==', id).get();
            users.forEach(u => batch.delete(u.ref));
            batch.delete(firestore.collection('events').doc(id));
            await batch.commit();
            showToast("Event deleted.", "info");
        } catch (err) { showToast("Delete failed.", "danger"); }
    };

    logoutBtn.onclick = () => auth.signOut().then(() => window.location.href = '../index.html');
});