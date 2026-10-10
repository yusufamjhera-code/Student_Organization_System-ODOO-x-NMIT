// File: organizer/manage-event.js
document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const firestore = firebase.firestore();

    // --- CONFIGURATION ---
    const GOOGLE_SCRIPT_URL = window.GOOGLE_SCRIPT_URL;
    const SECURITY_TOKEN = "PT_SECURE_2026";

    // --- DOM ELEMENTS ---
    const eventNameHeader = document.getElementById('event-name-header');
    const eventDateRangeEl = document.getElementById('event-date-range');
    const displayEventId = document.getElementById('display-event-id');
    const displayDistributorCode = document.getElementById('display-distributor-code');

    const addForm = document.getElementById('add-participant-form');
    const stationCheckboxGroup = document.getElementById('station-checkbox-group');
    const participantSearch = document.getElementById('participant-search');
    const selectAllCheckbox = document.getElementById('select-all-participants');

    const participantListEl = document.getElementById('participant-list');
    const bulkActionsBar = document.getElementById('bulk-actions-bar');
    const mailBtnText = document.getElementById('mail-btn-text');
    const toastContainer = document.getElementById('toast-container');
    const dropZone = document.getElementById('drop-zone');

    const issuedCountEl = document.getElementById('issued-count');
    const usedCountEl = document.getElementById('used-count');
    const partialCountEl = document.getElementById('partial-count');
    const remainingCountEl = document.getElementById('remaining-count');

    const userModal = document.getElementById('participant-modal');
    const closeUserModal = document.getElementById('close-participant-modal');
    const auditLogContainer = document.getElementById('audit-log-container');
    const qrLinkInput = document.getElementById('qr-link-input');
    const copyLinkBtn = document.getElementById('copy-link-btn');

    const excelFileInput = document.getElementById('excel-file-input');
    const importBtn = document.getElementById('import-btn');
    const fileLabelText = document.getElementById('file-label-text');

    const helpModal = document.getElementById('help-modal');
    const triggerHelpBtn = document.getElementById('trigger-help');
    const closeHelpBtn = document.getElementById('close-import-help');
    const hintBubble = document.getElementById('entry-point-popup');
    const staffLogList = document.getElementById('staff-log-list');

    // Access Point Management Elements
    const accessPointsListEl = document.getElementById('access-points-list');
    const addAccessPointBtn = document.getElementById('add-access-point-btn');
    const accessPointModal = document.getElementById('access-point-modal');
    const closeAccessPointModal = document.getElementById('close-access-point-modal');
    const accessPointForm = document.getElementById('access-point-form');
    const accessPointNameInput = document.getElementById('access-point-name');
    const accessPointAllDays = document.getElementById('access-point-all-days');
    const accessPointDateGroup = document.getElementById('access-point-date-group');
    const accessPointDateFromInput = document.getElementById('access-point-date-from');
    const accessPointDateToInput = document.getElementById('access-point-date-to');
    const accessPointStartInput = document.getElementById('access-point-start');
    const accessPointEndInput = document.getElementById('access-point-end');
    const accessPointEditIndex = document.getElementById('access-point-edit-index');
    const accessPointModalTitle = document.getElementById('access-point-modal-title');
    const cancelAccessPointBtn = document.getElementById('cancel-access-point-btn');

    // Edit Credentials Modal Elements
    const editCredentialsBtn = document.getElementById('edit-credentials-btn');
    const editCredentialsModal = document.getElementById('edit-credentials-modal');
    const closeCredentialsModal = document.getElementById('close-credentials-modal');
    const cancelCredentialsBtn = document.getElementById('cancel-credentials-btn');
    const editCredentialsForm = document.getElementById('edit-credentials-form');
    const editEventIdInput = document.getElementById('edit-event-id');
    const editStaffPasswordInput = document.getElementById('edit-staff-password');
    const editIdStatusIcon = document.getElementById('edit-id-status-icon');
    const editIdFeedback = document.getElementById('edit-id-feedback');
    const saveCredentialsBtn = document.getElementById('save-credentials-btn');

    // Staff Resend Elements
    const staffHistoryActions = document.getElementById('staff-history-actions');
    const selectAllStaffCheckbox = document.getElementById('select-all-staff');
    const resendStaffBtn = document.getElementById('resend-staff-btn');

    // Edit Event Modal Elements
    const editEventBtn = document.getElementById('edit-event-btn');
    const editEventModal = document.getElementById('edit-event-modal');
    const closeEditEventModal = document.getElementById('close-edit-event-modal');
    const cancelEditEventBtn = document.getElementById('cancel-edit-event-btn');
    const editEventForm = document.getElementById('edit-event-form');
    const editEventNameInput = document.getElementById('edit-event-name');
    const editEventStartDateInput = document.getElementById('edit-event-start-date');
    const editEventEndDateInput = document.getElementById('edit-event-end-date');
    const saveEventBtn = document.getElementById('save-event-btn');

    let currentOrganizer = null;
    let eventDocId = new URLSearchParams(window.location.search).get('id');
    let allParticipants = [];
    let selectedParticipantIds = new Set();
    let eventStations = [];
    let currentEventName = "";
    let sortMode = 'date';

    // Credentials editing state
    let originalEventId = "";
    let isEventIdValid = true;
    let staffEmailHistory = [];
    let selectedStaffEmails = new Set();

    // Event details state
    let currentEventStartDate = "";
    let currentEventEndDate = "";

    // Auth mode detection
    const authType = sessionStorage.getItem('authType') || 'admin';
    const collaboratorEmail = sessionStorage.getItem('collaboratorEmail') || '';
    const isCollaboratorUser = authType === 'collaborator' && collaboratorEmail;
    let eventCollaborators = [];
    let eventOwnerId = "";

    if (!eventDocId) {
        window.location.href = 'dashboard.html';
        return;
    }

    // --- HELPERS ---
    const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const showToast = (message, type = 'info') => {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const iconClass = type === 'success' ? 'ph-check-circle' : 'ph-warning-circle';
        toast.innerHTML = `<i class="ph-bold ${iconClass}"></i><span>${message}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.5s ease-in forwards';
            setTimeout(() => { if (toast.parentElement) toast.remove(); }, 500);
        }, 4000);
    };

    const formatDateAesthetic = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const getOrdinal = (n) => {
            const s = ["th", "st", "nd", "rd"];
            const v = n % 100;
            return n + (s[(v - 20) % 10] || s[v] || s[0]);
        };
        return `${getOrdinal(date.getDate())} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const dismissHint = () => {
        if (hintBubble) {
            hintBubble.classList.add('fade-out');
            setTimeout(() => { hintBubble.style.display = 'none'; }, 500);
        }
    };

    // Auto-hide hint bubble after 30 seconds
    if (hintBubble) {
        setTimeout(dismissHint, 30000);
    }

    // --- 1. AUTH & INITIALIZATION ---
    const isDemoMode = () => sessionStorage.getItem('demoUser') === 'true' || 
                             sessionStorage.getItem('authType') === 'admin' ||
                             (window.firebaseConfig && firebaseConfig.apiKey === "YOUR_API_KEY");

    const loadDemoEvent = () => {
        const isHackathon = !eventDocId || eventDocId.includes('hacknmit');
        currentEventName = isHackathon ? 'HackNMIT 2026 Annual Hackathon' : 'Open Source Developer Summit';
        currentEventStartDate = isHackathon ? '2026-03-28' : '2026-04-15';
        currentEventEndDate = isHackathon ? '2026-03-29' : '2026-04-15';
        originalEventId = isHackathon ? 'hacknmit-2026' : 'os-summit-2026';
        eventCollaborators = [{ email: 'coordinator@nmit.ac.in', role: 'Track Lead' }];

        if (eventNameHeader) eventNameHeader.textContent = currentEventName;
        if (displayEventId) displayEventId.textContent = originalEventId;
        if (displayDistributorCode) displayDistributorCode.textContent = isHackathon ? 'staff123' : 'staff456';
        if (eventDateRangeEl) eventDateRangeEl.textContent = isHackathon ? '28th Mar 2026 — 29th Mar 2026' : '15th Apr 2026';

        eventStations = isHackathon ? [
            { name: "Entrance", start: "00:00", end: "23:59", dateFrom: "all", dateTo: "all" },
            { name: "Lab 3", start: "09:00", end: "18:00", dateFrom: "all", dateTo: "all" }
        ] : [
            { name: "Seminar Hall A", start: "09:30", end: "17:30", dateFrom: "all", dateTo: "all" }
        ];

        renderStationCheckboxes();
        renderAccessPointsList();

        // Ticketing config
        const memberPriceEl = document.getElementById('ticket-member-price');
        const nonmemberPriceEl = document.getElementById('ticket-nonmember-price');
        const totalSeatsEl = document.getElementById('ticket-total-seats');
        const seatsSoldEl = document.getElementById('ticket-seats-sold');
        const salesOpenEl = document.getElementById('ticket-sales-open');
        const viewTicketsLink = document.getElementById('view-tickets-link');

        if (memberPriceEl) memberPriceEl.value = isHackathon ? '250' : '0';
        if (nonmemberPriceEl) nonmemberPriceEl.value = isHackathon ? '350' : '0';
        if (totalSeatsEl) totalSeatsEl.value = isHackathon ? '300' : '150';
        if (seatsSoldEl) seatsSoldEl.textContent = isHackathon ? '240' : '110';
        if (salesOpenEl) salesOpenEl.checked = true;
        if (viewTicketsLink) viewTicketsLink.href = `../tickets/buy.html?event=${originalEventId}`;

        allParticipants = [
            {
                id: 'part-1',
                name: 'Aarav Sharma',
                contact: 'aarav.sharma@nmit.ac.in',
                token: 'TKN-ACM-8821',
                createdAt: { toMillis: () => Date.now() - 3600000 * 24 },
                permissions: {
                    "Entrance": { status: "used", scannedAt: "2026-03-28 09:15" },
                    "Lab 3": { status: "pending" }
                }
            },
            {
                id: 'part-2',
                name: 'Priya Patel',
                contact: 'priya.p@nmit.ac.in',
                token: 'TKN-ACM-9104',
                createdAt: { toMillis: () => Date.now() - 3600000 * 12 },
                permissions: {
                    "Entrance": { status: "used", scannedAt: "2026-03-28 09:40" },
                    "Lab 3": { status: "used", scannedAt: "2026-03-28 11:20" }
                }
            },
            {
                id: 'part-3',
                name: 'Rohan Deshmukh',
                contact: 'rohan.d@nmit.ac.in',
                token: 'TKN-ACM-5532',
                createdAt: { toMillis: () => Date.now() - 3600000 * 6 },
                permissions: {
                    "Entrance": { status: "pending" },
                    "Lab 3": { status: "pending" }
                }
            }
        ];
        renderParticipantList();
        calculateStats();
        renderCollaboratorsList();
        setupCollaboratorHandlers();
    };

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentOrganizer = user;
            await fetchEventDetails();
        } else if (isCollaboratorUser && collaboratorEmail) {
            await fetchEventDetails();
        } else if (isDemoMode()) {
            currentOrganizer = { uid: 'demo-organizer', email: 'organizer@nmit.ac.in' };
            await fetchEventDetails();
        } else {
            window.location.href = '../index.html';
        }
    });

    const fetchEventDetails = async () => {
        try {
            const doc = await firestore.collection('events').doc(eventDocId).get();
            const data = doc.data();

            // Check access: either owner or collaborator
            const isOwner = data && currentOrganizer && data.organizerId === currentOrganizer.uid;
            const isCollaborator = isCollaboratorUser && data.collaborators?.some(
                c => c.email.toLowerCase() === collaboratorEmail.toLowerCase()
            );

            if (doc.exists && (isOwner || isCollaborator)) {
                eventOwnerId = data.organizerId || "";
                currentEventName = data.name;
                currentEventStartDate = data.eventDate;
                currentEventEndDate = data.eventEndDate;
                originalEventId = data.eventId;
                eventCollaborators = data.collaborators || [];

                eventNameHeader.textContent = data.name;
                displayEventId.textContent = data.eventId;
                displayDistributorCode.textContent = data.distributorCode;
                const start = formatDateAesthetic(data.eventDate);
                const end = formatDateAesthetic(data.eventEndDate);
                eventDateRangeEl.textContent = start === end ? start : `${start} — ${end}`;
                eventStations = data.stations || [];
                renderStationCheckboxes();
                renderAccessPointsList();
                listenForParticipants();

                // Load staff email history from Firebase
                loadStaffEmailHistory(data.staffEmailHistory || []);

                // Load Ticketing Config
                const tConfig = data.ticketConfig || {};
                document.getElementById('ticket-member-price').value = tConfig.memberPrice || '';
                document.getElementById('ticket-nonmember-price').value = tConfig.nonmemberPrice || '';
                document.getElementById('ticket-total-seats').value = tConfig.totalSeats || '';
                document.getElementById('ticket-sales-start').value = tConfig.salesStart || '';
                document.getElementById('ticket-sales-end').value = tConfig.salesEnd || '';
                document.getElementById('ticket-sales-open').checked = tConfig.salesOpen !== false; // default true
                document.getElementById('ticket-seats-sold').textContent = tConfig.seatsSold || 0;
                document.getElementById('view-tickets-link').href = `../tickets/view.html?event=${eventDocId}`;

                // Both admin and collaborators have full access (including managing collaborators)
                renderCollaboratorsList();
                setupCollaboratorHandlers();
            } else if (isDemoMode()) {
                loadDemoEvent();
            } else {
                window.location.href = 'dashboard.html';
            }
        } catch (e) {
            if (isDemoMode()) {
                loadDemoEvent();
            } else {
                showToast("Error loading event details.", "danger");
            }
        }
    };

    // --- STAFF EMAIL HISTORY ---
    const loadStaffEmailHistory = (history) => {
        staffEmailHistory = history || [];
        selectedStaffEmails.clear();

        if (staffEmailHistory.length === 0) {
            staffLogList.innerHTML = '<div class="empty-log">No history yet</div>';
            if (staffHistoryActions) staffHistoryActions.style.display = 'none';
            return;
        }

        // Show actions when there's history
        if (staffHistoryActions) staffHistoryActions.style.display = 'flex';
        if (selectAllStaffCheckbox) selectAllStaffCheckbox.checked = false;

        staffLogList.innerHTML = '';

        // Deduplicate by email, keeping the most recent one
        const emailMap = new Map();
        history.forEach(entry => {
            // Check if we already have this email, if so, keeps the later one if current entry is newer?
            // Actually history is usually appended, so later entries are newer.
            // We'll just overwrite to get the latest.
            emailMap.set(entry.email, entry);
        });

        // Convert to array and take last 10 (most recent unique interactions)
        const uniqueEntries = Array.from(emailMap.values()).slice(-10).reverse();

        uniqueEntries.forEach(entry => {
            const logEntry = document.createElement('div');
            logEntry.className = 'log-item selectable';
            logEntry.innerHTML = `
                <div class="log-info">
                    <input type="checkbox" data-email="${entry.email}">
                    <span class="log-email">${entry.email}</span>
                </div>
                <small class="log-time">${formatTimestamp(entry.sentAt)}</small>
            `;
            const checkbox = logEntry.querySelector('input');
            const toggleSelection = () => {
                checkbox.checked = !checkbox.checked;
                handleSelectionChange();
            };

            // Handle clicking the row (not just checkbox)
            logEntry.onclick = (e) => {
                if (e.target !== checkbox) {
                    toggleSelection();
                }
            };

            checkbox.onclick = (e) => {
                e.stopPropagation(); // Prevent double triggering
                handleSelectionChange();
            };

            const handleSelectionChange = () => {
                if (checkbox.checked) {
                    selectedStaffEmails.add(entry.email);
                    logEntry.classList.add('selected');
                } else {
                    selectedStaffEmails.delete(entry.email);
                    logEntry.classList.remove('selected');
                }
            };

            staffLogList.appendChild(logEntry);
        });
    };

    // Select All Staff Toggle
    if (selectAllStaffCheckbox) {
        selectAllStaffCheckbox.onchange = () => {
            const checkboxes = staffLogList.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => {
                cb.checked = selectAllStaffCheckbox.checked;
                const email = cb.dataset.email;
                if (selectAllStaffCheckbox.checked) {
                    selectedStaffEmails.add(email);
                    cb.closest('.log-item').classList.add('selected');
                } else {
                    selectedStaffEmails.delete(email);
                    cb.closest('.log-item').classList.remove('selected');
                }
            });
        };
    }

    // Resend Staff Emails
    if (resendStaffBtn) {
        resendStaffBtn.onclick = async () => {
            if (selectedStaffEmails.size === 0) {
                return showToast("Select at least one email.", "danger");
            }

            resendStaffBtn.disabled = true;
            resendStaffBtn.innerHTML = '<i class="ph-bold ph-spinner" style="animation: spin 1s linear infinite;"></i>';

            // Deduplicate emails - Set already prevents duplicates, but extracting unique emails
            const uniqueEmails = [...new Set(selectedStaffEmails)];

            for (const email of uniqueEmails) {
                await sendEmailViaGoogle({ email }, 'staff');
                await new Promise(r => setTimeout(r, 400));
            }

            showToast(`Credentials sent to ${uniqueEmails.length} staff!`, "success");
            resendStaffBtn.disabled = false;
            resendStaffBtn.innerHTML = '<i class="ph-bold ph-paper-plane-tilt"></i>';
            selectedStaffEmails.clear();
            selectAllStaffCheckbox.checked = false;
            staffLogList.querySelectorAll('.log-item.selected').forEach(el => el.classList.remove('selected'));
            staffLogList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        };
    }

    // --- EDIT CREDENTIALS MODAL ---
    const openCredentialsModal = () => {
        originalEventId = displayEventId.textContent;
        editEventIdInput.value = originalEventId;
        editStaffPasswordInput.value = displayDistributorCode.textContent;
        isEventIdValid = true;
        updateCredentialsIdUI('', 'Used for staff login');
        saveCredentialsBtn.disabled = false;
        editCredentialsModal.style.display = 'flex';
        document.body.classList.add('modal-open');
    };

    const closeCredentialsModalFn = () => {
        editCredentialsModal.style.display = 'none';
        document.body.classList.remove('modal-open');
    };

    if (editCredentialsBtn) editCredentialsBtn.onclick = openCredentialsModal;
    if (closeCredentialsModal) closeCredentialsModal.onclick = closeCredentialsModalFn;
    if (cancelCredentialsBtn) cancelCredentialsBtn.onclick = closeCredentialsModalFn;

    // Event ID Validation
    const updateCredentialsIdUI = (state, text) => {
        editIdStatusIcon.className = `status-icon ${state}`;
        editIdFeedback.textContent = text;
        editIdFeedback.className = `feedback-text ${state}`;
    };

    const debounce = (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    };

    const checkEventIdUniqueness = async (val) => {
        const id = val.trim().toLowerCase();

        // If same as original, it's valid
        if (id === originalEventId.toLowerCase()) {
            updateCredentialsIdUI('valid', '✅ Current ID');
            isEventIdValid = true;
            saveCredentialsBtn.disabled = false;
            return;
        }

        if (id.length < 3) {
            updateCredentialsIdUI('invalid', 'Min 3 characters required');
            isEventIdValid = false;
            saveCredentialsBtn.disabled = true;
            return;
        }

        updateCredentialsIdUI('loading', 'Checking availability...');

        try {
            const snap = await firestore.collection('events').where('eventId', '==', id).get();
            if (snap.empty) {
                updateCredentialsIdUI('valid', '✅ Available!');
                isEventIdValid = true;
                saveCredentialsBtn.disabled = false;
            } else {
                updateCredentialsIdUI('invalid', '❌ Already taken');
                isEventIdValid = false;
                saveCredentialsBtn.disabled = true;
            }
        } catch (e) {
            updateCredentialsIdUI('invalid', 'Error checking');
            isEventIdValid = false;
            saveCredentialsBtn.disabled = true;
        }
    };

    const debouncedCredentialsCheck = debounce(checkEventIdUniqueness, 600);

    editEventIdInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
        e.target.value = val;
        updateCredentialsIdUI('loading', 'Typing...');
        saveCredentialsBtn.disabled = true;
        debouncedCredentialsCheck(val);
    });

    // Save Credentials
    editCredentialsForm.onsubmit = async (e) => {
        e.preventDefault();
        if (!isEventIdValid) return;

        const newEventId = editEventIdInput.value.trim().toLowerCase();
        const newPassword = editStaffPasswordInput.value.trim();

        if (!newPassword) {
            return showToast("Password cannot be empty.", "danger");
        }

        saveCredentialsBtn.disabled = true;
        saveCredentialsBtn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i>';

        try {
            // Update event document
            await firestore.collection('events').doc(eventDocId).update({
                eventId: newEventId,
                distributorCode: newPassword
            });

            // Also update eventId in all users belonging to this event
            const usersSnapshot = await firestore.collection('users')
                .where('eventDocId', '==', eventDocId)
                .get();

            if (!usersSnapshot.empty) {
                const batch = firestore.batch();
                usersSnapshot.docs.forEach(doc => {
                    batch.update(doc.ref, { eventId: newEventId });
                });
                await batch.commit();
            }

            // Update display
            displayEventId.textContent = newEventId;
            displayDistributorCode.textContent = newPassword;
            originalEventId = newEventId;

            showToast("Credentials updated!", "success");
            closeCredentialsModalFn();
        } catch (err) {
            showToast("Failed to update.", "danger");
        } finally {
            saveCredentialsBtn.disabled = false;
            saveCredentialsBtn.innerHTML = '<i class="ph-bold ph-check"></i> <span>Save Changes</span>';
        }
    };

    // --- EDIT EVENT NAME/DATE MODAL ---
    const openEditEventModal = () => {
        editEventNameInput.value = currentEventName;
        editEventStartDateInput.value = currentEventStartDate;
        editEventEndDateInput.value = currentEventEndDate;
        editEventModal.style.display = 'flex';
        document.body.classList.add('modal-open');
    };

    const closeEditEventModalFn = () => {
        editEventModal.style.display = 'none';
        document.body.classList.remove('modal-open');
    };

    if (editEventBtn) editEventBtn.onclick = openEditEventModal;
    if (closeEditEventModal) closeEditEventModal.onclick = closeEditEventModalFn;
    if (cancelEditEventBtn) cancelEditEventBtn.onclick = closeEditEventModalFn;

    editEventForm.onsubmit = async (e) => {
        e.preventDefault();

        const newName = editEventNameInput.value.trim();
        const newStartDate = editEventStartDateInput.value;
        const newEndDate = editEventEndDateInput.value;

        if (!newName) {
            return showToast("Event name cannot be empty.", "danger");
        }

        if (newStartDate > newEndDate) {
            return showToast("Start date cannot be after end date.", "danger");
        }

        saveEventBtn.disabled = true;
        saveEventBtn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i>';

        try {
            await firestore.collection('events').doc(eventDocId).update({
                name: newName,
                eventDate: newStartDate,
                eventEndDate: newEndDate
            });

            // Update local state
            currentEventName = newName;
            currentEventStartDate = newStartDate;
            currentEventEndDate = newEndDate;

            // Update display
            eventNameHeader.textContent = newName;
            const start = formatDateAesthetic(newStartDate);
            const end = formatDateAesthetic(newEndDate);
            eventDateRangeEl.textContent = start === end ? start : `${start} — ${end}`;

            showToast("Event details updated!", "success");
            closeEditEventModalFn();
        } catch (err) {
            showToast("Failed to update event.", "danger");
        } finally {
            saveEventBtn.disabled = false;
            saveEventBtn.innerHTML = '<i class="ph-bold ph-check"></i> <span>Save Changes</span>';
        }
    };

    const saveStaffEmailToHistory = async (email) => {
        try {
            await firestore.collection('events').doc(eventDocId).update({
                staffEmailHistory: firebase.firestore.FieldValue.arrayUnion({
                    email: email,
                    sentAt: firebase.firestore.Timestamp.now()
                })
            });
        } catch (e) {
            console.error("Failed to save staff email history:", e);
        }
    };

    const renderStationCheckboxes = () => {
        stationCheckboxGroup.innerHTML = '';

        // Date format helper
        const formatDateShort = (dateStr) => {
            if (!dateStr || dateStr === 'all') return 'All';
            const date = new Date(dateStr);
            const day = date.getDate();
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${day} ${months[date.getMonth()]}`;
        };

        const formatDateRange = (dateFrom, dateTo) => {
            if (dateFrom === 'all' || dateTo === 'all') return 'All Days';
            const from = formatDateShort(dateFrom);
            const to = formatDateShort(dateTo);
            return from === to ? from : `${from} - ${to}`;
        };

        eventStations.forEach(s => {
            const row = document.createElement('label');
            row.className = 'perm-row';
            const dateDisplay = formatDateRange(s.dateFrom || s.date || 'all', s.dateTo || s.date || 'all');
            const timeDisplay = `${s.start || '00:00'} - ${s.end || '23:59'}`;
            row.innerHTML = `
                <input type="checkbox" name="permission" value="${s.name}" checked>
                <span class="perm-check"><i class="ph-bold ph-check"></i></span>
                <span class="perm-name">${s.name}</span>
                <span class="perm-meta">
                    <span class="perm-date">${dateDisplay}</span>
                    <span class="perm-time">${timeDisplay}</span>
                </span>
            `;
            stationCheckboxGroup.appendChild(row);
        });
    };

    // --- 2. EMAIL LOGIC ---
    const sendEmailViaGoogle = async (p, type = 'participant') => {
        let payload = { security_token: SECURITY_TOKEN, event_name: currentEventName };
        if (type === 'staff') {
            payload = { ...payload, type: 'staff', to_email: p.email, event_id: displayEventId.textContent, staff_password: displayDistributorCode.textContent, portal_url: `${window.location.origin}/distributor/distributor.html` };
        } else {
            payload = { ...payload, type: 'participant', to_name: p.name, to_email: p.contact, qr_link: `${window.location.origin}/viewer/viewer.html?token=${p.qrToken}` };
        }
        try {
            await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            return true;
        } catch (e) { return false; }
    };

    document.getElementById('send-staff-email-btn').onclick = async () => {
        const staffEmail = document.getElementById('staff-email-input').value.trim();
        if (!isValidEmail(staffEmail)) return showToast("Enter a valid staff email.", "danger");

        const btn = document.getElementById('send-staff-email-btn');
        const originalContent = btn.innerHTML;

        btn.disabled = true;
        btn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i>';

        const ok = await sendEmailViaGoogle({ email: staffEmail }, 'staff');
        if (ok) {
            showToast("Staff credentials sent!", "success");

            // Save to Firebase
            await saveStaffEmailToHistory(staffEmail);

            // Add to UI History Log
            if (staffLogList.querySelector('.empty-log')) staffLogList.innerHTML = '';

            // Show actions if this is the first entry
            if (staffHistoryActions) staffHistoryActions.style.display = 'flex';

            const logEntry = document.createElement('div');
            logEntry.className = 'log-item selectable';
            const timestamp = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
            logEntry.innerHTML = `
                <div class="log-info">
                    <input type="checkbox" data-email="${staffEmail}">
                    <span class="log-email">${staffEmail}</span>
                </div>
                <small class="log-time">${timestamp}</small>
            `;

            const checkbox = logEntry.querySelector('input');
            logEntry.onclick = (e) => {
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                }
                if (checkbox.checked) {
                    selectedStaffEmails.add(staffEmail);
                    logEntry.classList.add('selected');
                } else {
                    selectedStaffEmails.delete(staffEmail);
                    logEntry.classList.remove('selected');
                }
            };
            checkbox.onclick = (e) => e.stopPropagation();

            staffLogList.prepend(logEntry);

            document.getElementById('staff-email-input').value = "";
        } else {
            showToast("Failed to send email.", "danger");
        }

        btn.disabled = false;
        btn.innerHTML = originalContent;
    };

    document.getElementById('bulk-email-btn').onclick = async () => {
        const selected = allParticipants.filter(p => selectedParticipantIds.has(p.id));
        const emailable = selected.filter(p => isValidEmail(p.contact));

        if (emailable.length === 0) return showToast("No valid emails selected.", "danger");
        if (!confirm(`Send tokens to ${emailable.length} participants?`)) return;

        const btn = document.getElementById('bulk-email-btn');
        const originalContent = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i>';

        showToast(`Sending...`, "info");
        for (const p of emailable) {
            await sendEmailViaGoogle(p, 'participant');
            await new Promise(r => setTimeout(r, 400));
        }

        showToast(`Tokens sent successfully!`, "success");
        selectedParticipantIds.clear();
        selectAllCheckbox.checked = false;
        btn.disabled = false;
        btn.innerHTML = originalContent;
        renderParticipantList();
        updateBulkActionsUI();
    };

    // --- 3. RENDERING ---
    const listenForParticipants = () => {
        firestore.collection('users')
            .where('eventDocId', '==', eventDocId)
            .onSnapshot((snap) => {
                allParticipants = snap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    ts: doc.data().createdAt ? doc.data().createdAt.toMillis() : Date.now()
                }));
                renderParticipantList();
                calculateStats();
            });
    };

    const renderParticipantList = () => {
        const query = participantSearch.value.toLowerCase();
        let filtered = allParticipants.filter(p => p.name.toLowerCase().includes(query) || p.contact.toLowerCase().includes(query));

        // Apply filter/sort based on dropdown selection
        if (sortMode === 'used') {
            // Fully used: all access points are used
            filtered = filtered.filter(p => {
                const perms = Object.values(p.permissions || {});
                return perms.length > 0 && perms.every(v => v.status === 'used');
            });
            filtered.sort((a, b) => b.ts - a.ts);
        } else if (sortMode === 'partial') {
            // Partially used: some but not all access points are used
            filtered = filtered.filter(p => {
                const perms = Object.values(p.permissions || {});
                const usedCount = perms.filter(v => v.status === 'used').length;
                return perms.length > 1 && usedCount > 0 && usedCount < perms.length;
            });
            filtered.sort((a, b) => b.ts - a.ts);
        } else if (sortMode === 'issued') {
            // Issued only: no access points used
            filtered = filtered.filter(p => !Object.values(p.permissions || {}).some(v => v.status === 'used'));
            filtered.sort((a, b) => b.ts - a.ts);
        } else if (sortMode === 'alpha') {
            filtered.sort((a, b) => a.name.localeCompare(b.name));
        } else {
            filtered.sort((a, b) => b.ts - a.ts);
        }
        participantListEl.innerHTML = filtered.length === 0 ? '<div class="empty-state"><p>No participants found.</p></div>' : '';

        filtered.forEach(p => {
            const permissions = Object.values(p.permissions || {});
            const totalPoints = permissions.length;
            const usedCount = permissions.filter(v => v.status === 'used').length;

            // Determine status display
            let statusClass, statusText;
            if (totalPoints === 0) {
                statusClass = 'issued';
                statusText = 'No Access';
            } else if (totalPoints === 1) {
                // Single access point: simple Used/Issued
                statusClass = usedCount > 0 ? 'used' : 'issued';
                statusText = usedCount > 0 ? 'Used' : 'Issued';
            } else {
                // Multiple access points: show X / Y format
                if (usedCount === 0) {
                    statusClass = 'issued';
                    statusText = `0 / ${totalPoints}`;
                } else if (usedCount === totalPoints) {
                    statusClass = 'used';
                    statusText = `${usedCount} / ${totalPoints}`;
                } else {
                    statusClass = 'partial';
                    statusText = `${usedCount} / ${totalPoints}`;
                }
            }

            const item = document.createElement('div');
            item.className = 'participant-item';

            item.innerHTML = `
                <label class="item-checkbox">
                    <input type="checkbox" class="participant-select" data-id="${p.id}" ${selectedParticipantIds.has(p.id) ? 'checked' : ''}>
                    <div class="checkbox-box"></div>
                </label>
                <div class="participant-info" onclick="openDetails('${p.id}')">
                    <div class="name">${p.name}</div>
                    <div class="contact">${p.contact}</div>
                </div>
                <div class="status-pill ${statusClass}">${statusText}</div>
            `;

            const checkbox = item.querySelector('.participant-select');
            checkbox.onchange = (e) => {
                if (e.target.checked) selectedParticipantIds.add(p.id);
                else selectedParticipantIds.delete(p.id);
                updateBulkActionsUI();
            };
            participantListEl.appendChild(item);
        });
    };

    participantSearch.oninput = renderParticipantList;
    document.getElementById('sort-dropdown').onchange = (e) => {
        sortMode = e.target.value;
        renderParticipantList();
    };

    const calculateStats = () => {
        issuedCountEl.textContent = allParticipants.length;

        // Count tokens where ALL access points are used
        const fullyUsed = allParticipants.filter(p => {
            const perms = Object.values(p.permissions || {});
            return perms.length > 0 && perms.every(v => v.status === 'used');
        }).length;

        // Count tokens where some (but not all) access points are used
        const partial = allParticipants.filter(p => {
            const perms = Object.values(p.permissions || {});
            const usedCount = perms.filter(v => v.status === 'used').length;
            return perms.length > 1 && usedCount > 0 && usedCount < perms.length;
        }).length;

        usedCountEl.textContent = fullyUsed;
        partialCountEl.textContent = partial;
        remainingCountEl.textContent = allParticipants.length - fullyUsed - partial;
    };

    const updateBulkActionsUI = () => {
        const count = selectedParticipantIds.size;
        bulkActionsBar.classList.toggle('hidden', count === 0);
        mailBtnText.textContent = count > 1 ? `Email (${count})` : "Send Mail";
    };

    selectAllCheckbox.onchange = (e) => {
        if (e.target.checked) allParticipants.forEach(p => selectedParticipantIds.add(p.id));
        else selectedParticipantIds.clear();
        renderParticipantList();
        updateBulkActionsUI();
    };

    // --- 4. REGISTRATION & MODAL ---
    addForm.onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById('participant-name').value.trim();
        const contact = document.getElementById('participant-contact').value.trim().toLowerCase();

        // Email validation check
        if (!isValidEmail(contact)) {
            return showToast("Please enter a valid email address.", "danger");
        }

        const perms = {};
        addForm.querySelectorAll('input[name="permission"]:checked').forEach(cb => {
            perms[cb.value] = { status: 'issued', scannedAt: null, scannedBy: null };
        });

        if (Object.keys(perms).length === 0) return showToast("Select at least one point.", "danger");

        const submitBtn = addForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i>';

        try {
            const existing = await firestore.collection('users').where('eventDocId', '==', eventDocId).where('contact', '==', contact).get();
            const effectiveOrgId = currentOrganizer ? currentOrganizer.uid : eventOwnerId;
            const data = {
                organizerId: effectiveOrgId, eventDocId, eventId: displayEventId.textContent,
                name, contact, permissions: perms,
                qrToken: existing.empty ? `p-${crypto.randomUUID()}` : existing.docs[0].data().qrToken,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (existing.empty) await firestore.collection('users').add({ ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
            else await existing.docs[0].ref.update(data);

            showToast(`${name} registered!`, "success");
            addForm.reset();
            renderStationCheckboxes();
        } catch (e) { showToast("Error.", "danger"); }
        finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="ph-bold ph-qr-code"></i> <span>Generate Token</span>';
        }
    };

    window.openDetails = (id) => {
        const p = allParticipants.find(part => part.id === id);
        if (!p) return;
        document.getElementById('modal-user-name').textContent = p.name;
        document.getElementById('modal-user-contact').textContent = p.contact;
        qrLinkInput.value = `${window.location.origin}/viewer/viewer.html?token=${p.qrToken}`;

        auditLogContainer.innerHTML = '';
        Object.entries(p.permissions || {}).forEach(([k, v]) => {
            const entry = document.createElement('div');
            entry.className = 'audit-log-entry';
            entry.innerHTML = `
                <div class="point-name"><strong>${k}</strong></div>
                <div class="point-status ${v.status}">${v.status.toUpperCase()}</div>
                <div class="point-time">${v.scannedAt ? new Date(v.scannedAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</div>
            `;
            auditLogContainer.appendChild(entry);
        });
        userModal.style.display = 'flex';
    };

    closeUserModal.onclick = () => userModal.style.display = 'none';
    copyLinkBtn.onclick = () => {
        qrLinkInput.select();
        document.execCommand('copy');
        copyLinkBtn.textContent = 'Copied!';
        setTimeout(() => copyLinkBtn.textContent = 'Copy', 1500);
    };

    // --- 5. BULK IMPORT ---
    excelFileInput.onchange = (e) => {
        fileLabelText.textContent = e.target.files.length > 0 ? e.target.files[0].name : "Browse file";
    };

    importBtn.onclick = async () => {
        const file = excelFileInput.files[0];
        if (!file) return showToast("Pick a file.", "danger");

        importBtn.disabled = true;
        importBtn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i>';

        const batchPerms = {};
        addForm.querySelectorAll('input[name="permission"]:checked').forEach(cb => {
            batchPerms[cb.value] = { status: 'issued', scannedAt: null, scannedBy: null };
        });

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                const batch = firestore.batch();
                const existingMap = new Map(allParticipants.map(p => [p.contact.trim().toLowerCase(), p.id]));

                for (const row of json) {
                    const name = (row.Name || row.name || "").trim();
                    const contact = String(row.Contact || row.contact || "").trim().toLowerCase();
                    if (name && contact) {
                        if (existingMap.has(contact)) {
                            batch.update(firestore.collection('users').doc(existingMap.get(contact)), { name, permissions: batchPerms, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
                        } else {
                            const effectiveOrgId = currentOrganizer ? currentOrganizer.uid : eventOwnerId;
                            batch.set(firestore.collection('users').doc(), { organizerId: effectiveOrgId, eventDocId, eventId: displayEventId.textContent, name, contact, permissions: batchPerms, qrToken: `p-${crypto.randomUUID()}`, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
                        }
                    }
                }
                await batch.commit();
                showToast(`Sync complete!`, "success");
            } catch (err) { showToast("File error.", "danger"); }
            finally {
                importBtn.disabled = false;
                importBtn.innerHTML = '<i class="ph-bold ph-check-square"></i> <span>Import All Data</span>';
                excelFileInput.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    };

    document.getElementById('bulk-delete-btn').onclick = async () => {
        if (!confirm(`Delete ${selectedParticipantIds.size} records?`)) return;
        const batch = firestore.batch();
        selectedParticipantIds.forEach(id => batch.delete(firestore.collection('users').doc(id)));
        await batch.commit();
        selectedParticipantIds.clear();
        selectAllCheckbox.checked = false;
        updateBulkActionsUI();
        showToast("Deleted.", "info");
    };

    // --- 6. ACCESS POINT MANAGEMENT ---
    const renderAccessPointsList = () => {
        if (!eventStations || eventStations.length === 0) {
            accessPointsListEl.innerHTML = `
                <div class="empty-access-points">
                    <i class="ph ph-map-trifold"></i>
                    <p>No access points yet</p>
                </div>
            `;
            return;
        }

        // Date format helper
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
            return from === to ? from : `${from} — ${to}`;
        };

        accessPointsListEl.innerHTML = '';
        eventStations.forEach((station, index) => {
            const item = document.createElement('div');
            item.className = 'access-point-item';

            // Support both old (date) and new (dateFrom/dateTo) format
            const dateDisplay = formatDateRange(
                station.dateFrom || station.date || 'all',
                station.dateTo || station.date || 'all'
            );
            const timeDisplay = `${station.start || '00:00'} - ${station.end || '23:59'}`;

            item.innerHTML = `
                <div class="ap-content">
                    <span class="ap-name">${station.name}</span>
                    <span class="ap-meta">${dateDisplay} • ${timeDisplay}</span>
                </div>
                <div class="ap-menu-wrapper">
                    <button class="ap-menu-btn" title="Options">
                        <i class="ph-bold ph-dots-three-vertical"></i>
                    </button>
                    <div class="ap-dropdown">
                        <button class="ap-dropdown-item edit" data-index="${index}">
                            <i class="ph-bold ph-pencil-simple"></i>
                            <span>Edit</span>
                        </button>
                        <button class="ap-dropdown-item delete" data-index="${index}">
                            <i class="ph-bold ph-trash"></i>
                            <span>Delete</span>
                        </button>
                    </div>
                </div>
            `;

            // Attach menu toggle handler
            const menuBtn = item.querySelector('.ap-menu-btn');
            const dropdown = item.querySelector('.ap-dropdown');

            menuBtn.onclick = (e) => {
                e.stopPropagation();
                // Close all other dropdowns
                document.querySelectorAll('.ap-dropdown.active').forEach(d => {
                    if (d !== dropdown) d.classList.remove('active');
                });
                dropdown.classList.toggle('active');
            };

            // Attach edit/delete handlers
            item.querySelector('.ap-dropdown-item.edit').onclick = (e) => {
                e.stopPropagation();
                dropdown.classList.remove('active');
                editAccessPoint(parseInt(e.currentTarget.dataset.index));
            };

            item.querySelector('.ap-dropdown-item.delete').onclick = (e) => {
                e.stopPropagation();
                dropdown.classList.remove('active');
                deleteAccessPoint(parseInt(e.currentTarget.dataset.index));
            };

            accessPointsListEl.appendChild(item);
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', () => {
            document.querySelectorAll('.ap-dropdown.active').forEach(d => d.classList.remove('active'));
        });
    };

    const openAddAccessPointModal = () => {
        accessPointModalTitle.textContent = 'Add Access Point';
        accessPointNameInput.value = '';
        accessPointAllDays.checked = true;
        accessPointDateGroup.style.display = 'none';
        accessPointDateFromInput.value = '';
        accessPointDateToInput.value = '';
        accessPointStartInput.value = '';
        accessPointEndInput.value = '';
        accessPointEditIndex.value = '-1';
        accessPointModal.style.display = 'flex';
        document.body.classList.add('modal-open');
        accessPointNameInput.focus();
    };

    window.editAccessPoint = (index) => {
        const station = eventStations[index];
        if (!station) return;

        accessPointModalTitle.textContent = 'Edit Access Point';
        accessPointNameInput.value = station.name || '';

        // Handle date fields - support both old (date) and new (dateFrom/dateTo) format
        const isAllDays = (station.dateFrom === 'all' || station.dateTo === 'all') ||
            (station.date === 'all') ||
            (!station.dateFrom && !station.date);

        if (isAllDays) {
            accessPointAllDays.checked = true;
            accessPointDateGroup.style.display = 'none';
            accessPointDateFromInput.value = '';
            accessPointDateToInput.value = '';
        } else {
            accessPointAllDays.checked = false;
            accessPointDateGroup.style.display = 'block';
            accessPointDateFromInput.value = station.dateFrom || station.date || '';
            accessPointDateToInput.value = station.dateTo || station.date || '';
        }

        accessPointStartInput.value = station.start || '00:00';
        accessPointEndInput.value = station.end || '23:59';
        accessPointEditIndex.value = index;
        accessPointModal.style.display = 'flex';
        document.body.classList.add('modal-open');
        accessPointNameInput.focus();
    };

    window.deleteAccessPoint = async (index) => {
        if (eventStations.length <= 1) {
            showToast("Cannot delete the last access point.", "danger");
            return;
        }

        const station = eventStations[index];
        if (!confirm(`Delete "${station.name}"? This won't remove it from existing participant records.`)) return;

        try {
            const updatedStations = eventStations.filter((_, i) => i !== index);
            await firestore.collection('events').doc(eventDocId).update({
                stations: updatedStations
            });
            eventStations = updatedStations;
            renderAccessPointsList();
            renderStationCheckboxes();
            showToast("Access point deleted.", "info");
        } catch (e) {
            showToast("Failed to delete access point.", "danger");
            console.error(e);
        }
    };

    const saveAccessPoint = async (e) => {
        e.preventDefault();

        const name = accessPointNameInput.value.trim();
        const isAllDays = accessPointAllDays.checked;
        const dateFrom = isAllDays ? 'all' : accessPointDateFromInput.value;
        const dateTo = isAllDays ? 'all' : accessPointDateToInput.value;
        const start = accessPointStartInput.value || '00:00';
        const end = accessPointEndInput.value || '23:59';
        const editIndex = parseInt(accessPointEditIndex.value);

        if (!name) {
            showToast("Station name is required.", "danger");
            return;
        }

        if (!isAllDays && (!dateFrom || !dateTo)) {
            showToast("Please select both From and To dates.", "danger");
            return;
        }

        if (!isAllDays && dateFrom > dateTo) {
            showToast("From date must be before To date.", "danger");
            return;
        }

        // Validate access point dates are within event date range
        if (!isAllDays) {
            // Check if dates are within event range
            if (currentEventStartDate && dateFrom < currentEventStartDate) {
                showToast(`Access point dates must be within event dates (${currentEventStartDate} to ${currentEventEndDate}).`, "danger");
                return;
            }
            if (currentEventEndDate && dateTo > currentEventEndDate) {
                showToast(`Access point dates must be within event dates (${currentEventStartDate} to ${currentEventEndDate}).`, "danger");
                return;
            }
        }

        // Validate that start time is before end time
        if (start && end && start >= end) {
            showToast("Start time must be before end time.", "danger");
            return;
        }

        // Check for duplicate names (excluding current if editing)
        const isDuplicate = eventStations.some((s, i) =>
            s.name.toLowerCase() === name.toLowerCase() && i !== editIndex
        );
        if (isDuplicate) {
            showToast("An access point with this name already exists.", "danger");
            return;
        }

        const submitBtn = accessPointForm.querySelector('button[type="submit"]');
        const originalContent = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i>';

        try {
            let updatedStations;
            const newStation = { name, dateFrom, dateTo, start, end };

            if (editIndex >= 0) {
                // Editing existing
                updatedStations = [...eventStations];
                updatedStations[editIndex] = newStation;
            } else {
                // Adding new
                updatedStations = [...eventStations, newStation];
            }

            await firestore.collection('events').doc(eventDocId).update({
                stations: updatedStations
            });

            eventStations = updatedStations;
            renderAccessPointsList();
            renderStationCheckboxes();
            accessPointModal.style.display = 'none';
            showToast(editIndex >= 0 ? "Access point updated!" : "Access point added!", "success");
        } catch (e) {
            showToast("Failed to save access point.", "danger");
            console.error(e);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalContent;
        }
    };

    // Access Point Event Listeners
    addAccessPointBtn.onclick = (e) => { e.stopPropagation(); openAddAccessPointModal(); };
    closeAccessPointModal.onclick = () => { accessPointModal.style.display = 'none'; document.body.classList.remove('modal-open'); };
    cancelAccessPointBtn.onclick = () => { accessPointModal.style.display = 'none'; document.body.classList.remove('modal-open'); };
    accessPointForm.onsubmit = saveAccessPoint;

    // All Days toggle listener for access point modal
    accessPointAllDays.addEventListener('change', () => {
        accessPointDateGroup.style.display = accessPointAllDays.checked ? 'none' : 'flex';
    });

    // Start Access Points card collapsed on mobile
    const accessPointsCard = document.getElementById('access-points-card');
    if (window.innerWidth <= 768 && accessPointsCard) {
        accessPointsCard.classList.add('collapsed');
    }

    // --- 7. HELP MODAL & HINT ---
    triggerHelpBtn.onclick = () => { dismissHint(); helpModal.style.display = 'flex'; };
    closeHelpBtn.onclick = () => helpModal.style.display = 'none';

    // Clicking hint bubble also opens help and dismisses itself
    if (hintBubble) {
        hintBubble.onclick = () => { dismissHint(); helpModal.style.display = 'flex'; };
    }

    // Helper functions for modal scroll lock
    const openModal = (modal) => {
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
    };

    const closeModal = (modal) => {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    };

    window.onclick = (e) => {
        if (e.target == userModal) closeModal(userModal);
        if (e.target == helpModal) closeModal(helpModal);
        if (e.target == accessPointModal) closeModal(accessPointModal);
        if (e.target == editCredentialsModal) closeModal(editCredentialsModal);
        if (e.target == editEventModal) closeModal(editEventModal);
    };

    // --- 8. COLLABORATORS MANAGEMENT (Admin Only) ---
    const generateAccessCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    };

    const hideAdminOnlyFeatures = () => {
        // Collaborators have FULL ACCESS to everything including managing other collaborators
        // Nothing is hidden - they have the same permissions as the admin
    };

    const addCollaborator = async (email) => {
        if (!isValidEmail(email)) {
            showToast('Please enter a valid email.', 'danger');
            return;
        }

        // Check if already exists
        if (eventCollaborators.some(c => c.email.toLowerCase() === email.toLowerCase())) {
            showToast('This collaborator already exists.', 'danger');
            return;
        }

        const accessCode = generateAccessCode();
        const newCollab = {
            email: email.toLowerCase(),
            accessCode: accessCode,
            addedAt: new Date().toISOString()
        };

        try {
            eventCollaborators.push(newCollab);
            await firestore.collection('events').doc(eventDocId).update({
                collaborators: eventCollaborators,
                collaboratorEmails: eventCollaborators.map(c => c.email.toLowerCase())
            });

            renderCollaboratorsList();

            // Clear input
            document.getElementById('collab-email-input').value = '';

            // Copy access details to clipboard for convenient sharing
            const inviteMsg = `You're invited to collaborate on "${currentEventName}"!\nPortal: ${window.location.origin}/auth/login.html\n(Select 'Team Member' Tab)\nEmail: ${newCollab.email}\nAccess Code: ${accessCode}`;
            if (navigator.clipboard) {
                try { await navigator.clipboard.writeText(inviteMsg); } catch (_) {}
            }

            // Send invite email
            const emailSent = await sendCollaboratorInviteEmail(newCollab);
            if (emailSent) {
                showToast(`Collaborator added! Code: ${accessCode} (Invite email sent)`, 'success');
            } else {
                showToast(`Collaborator added! Code: ${accessCode} (Copied to clipboard. Note: Configure Google Script URL in Netlify for auto-email)`, 'info');
            }

        } catch (e) {
            console.error('Error adding collaborator:', e);
            showToast('Failed to add collaborator.', 'danger');
            eventCollaborators.pop();
        }
    };

    const removeCollaborator = async (email) => {
        if (!confirm(`Remove ${email} as collaborator?`)) return;

        try {
            eventCollaborators = eventCollaborators.filter(
                c => c.email.toLowerCase() !== email.toLowerCase()
            );

            await firestore.collection('events').doc(eventDocId).update({
                collaborators: eventCollaborators,
                collaboratorEmails: eventCollaborators.map(c => c.email.toLowerCase())
            });

            renderCollaboratorsList();
            showToast('Collaborator removed.', 'success');

        } catch (e) {
            console.error('Error removing collaborator:', e);
            showToast('Failed to remove collaborator.', 'danger');
        }
    };

    const sendCollaboratorInviteEmail = async (collab) => {
        try {
            const scriptUrl = window.GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL;
            if (!scriptUrl || scriptUrl === 'YOUR_GOOGLE_SCRIPT_URL' || scriptUrl.includes('YOUR_SCRIPT')) {
                console.warn('Google Script URL is not configured. Email cannot be dispatched automatically.');
                return false;
            }

            const payload = {
                security_token: SECURITY_TOKEN,
                type: 'collaborator',
                event_name: currentEventName,
                to_email: collab.email,
                access_code: collab.accessCode,
                portal_url: `${window.location.origin}/auth/login.html`
            };

            await fetch(scriptUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            return true;
        } catch (e) {
            console.error('Failed to send invite email:', e);
            return false;
        }
    };

    const resendCollaboratorInvite = async (email, btn = null) => {
        if (btn) btn.classList.add('loading');

        const collab = eventCollaborators.find(
            c => c.email.toLowerCase() === email.toLowerCase()
        );

        if (collab) {
            const success = await sendCollaboratorInviteEmail(collab);
            if (success) {
                showToast(`Invite sent to ${collab.email}`, 'success');
            } else {
                showToast(`Code is ${collab.accessCode}. Auto-email not configured; copied to clipboard.`, 'info');
                if (navigator.clipboard) {
                    try {
                        await navigator.clipboard.writeText(`Collaborator Access Code for ${currentEventName}: ${collab.accessCode}\nEmail: ${collab.email}\nPortal: ${window.location.origin}/auth/login.html`);
                    } catch (_) {}
                }
            }
        }

        if (btn) btn.classList.remove('loading');
    };

    // Bulk selection state
    let selectedCollaborators = new Set();

    const updateBulkBar = () => {
        const bulkBar = document.getElementById('collab-bulk-bar');
        const countEl = document.getElementById('collab-selected-count');
        const selectAllCheckbox = document.getElementById('collab-select-all');

        if (!bulkBar) return;

        // Only show bulk bar when 2+ collaborators (bulk actions need multiple items)
        if (eventCollaborators.length > 1) {
            bulkBar.style.display = 'flex';
            countEl.textContent = `${selectedCollaborators.size} selected`;
            selectAllCheckbox.checked = selectedCollaborators.size === eventCollaborators.length;
            selectAllCheckbox.indeterminate = selectedCollaborators.size > 0 && selectedCollaborators.size < eventCollaborators.length;
        } else {
            bulkBar.style.display = 'none';
        }
    };

    const renderCollaboratorsList = () => {
        const listEl = document.getElementById('collaborators-list');
        const countEl = document.getElementById('collab-count');

        if (!listEl) return;

        countEl.textContent = eventCollaborators.length;
        selectedCollaborators.clear();

        if (eventCollaborators.length === 0) {
            listEl.innerHTML = `
                <div class="empty-collaborators">
                    <i class="ph ph-users"></i>
                    <p>No collaborators yet</p>
                </div>`;
            updateBulkBar();
            return;
        }

        listEl.innerHTML = eventCollaborators.map((collab, index) => {
            const initials = collab.email.substring(0, 2).toUpperCase();
            return `
                <div class="collab-item" data-index="${index}" data-email="${collab.email}">
                    <input type="checkbox" class="collab-check" data-email="${collab.email}">
                    <div class="collab-avatar">${initials}</div>
                    <div class="collab-info">
                        <div class="collab-email">${collab.email}</div>
                        <div class="collab-code">Code: <strong>${collab.accessCode}</strong></div>
                    </div>
                    <div class="collab-actions">
                        <button class="collab-btn copy-invite" title="Copy Invite & Code" data-email="${collab.email}" data-code="${collab.accessCode}">
                            <i class="ph-bold ph-copy"></i>
                        </button>
                        <button class="collab-btn resend" title="Resend Invite" data-email="${collab.email}">
                            <i class="ph-bold ph-paper-plane-tilt"></i>
                        </button>
                        <button class="collab-btn remove" title="Remove" data-email="${collab.email}">
                            <i class="ph-bold ph-trash"></i>
                        </button>
                    </div>
                </div>`;
        }).join('');

        // Attach event handlers
        listEl.querySelectorAll('.collab-btn.copy-invite').forEach(btn => {
            btn.onclick = async (e) => {
                e.stopPropagation();
                const email = btn.dataset.email;
                const code = btn.dataset.code;
                const text = `You're invited to collaborate on "${currentEventName}"!\nPortal: ${window.location.origin}/auth/login.html\n(Select 'Team Member' Tab)\nEmail: ${email}\nAccess Code: ${code}`;
                try {
                    await navigator.clipboard.writeText(text);
                    showToast(`Copied invite info & code (${code}) to clipboard!`, 'success');
                } catch (_) {
                    showToast(`Access Code: ${code}`, 'info');
                }
            };
        });

        listEl.querySelectorAll('.collab-btn.remove').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                removeCollaborator(btn.dataset.email);
            };
        });

        listEl.querySelectorAll('.collab-btn.resend').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                resendCollaboratorInvite(btn.dataset.email, btn);
            };
        });

        // Checkbox handlers
        listEl.querySelectorAll('.collab-check').forEach(checkbox => {
            checkbox.onclick = (e) => e.stopPropagation();
            checkbox.onchange = (e) => {
                if (e.target.checked) {
                    selectedCollaborators.add(e.target.dataset.email);
                } else {
                    selectedCollaborators.delete(e.target.dataset.email);
                }
                updateBulkBar();
            };
        });

        updateBulkBar();
    };

    const setupCollaboratorHandlers = () => {
        const addBtn = document.getElementById('add-collab-btn');
        const emailInput = document.getElementById('collab-email-input');
        const collabToggle = document.getElementById('collaborators-toggle');
        const collabCard = document.getElementById('collaborators-card');
        const selectAllCheckbox = document.getElementById('collab-select-all');
        const bulkSendBtn = document.getElementById('bulk-send-emails');
        const bulkDeleteBtn = document.getElementById('bulk-delete');

        if (addBtn && emailInput) {
            addBtn.onclick = () => addCollaborator(emailInput.value.trim());
            emailInput.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addCollaborator(emailInput.value.trim());
                }
            };
        }

        // Collapsible toggle
        if (collabToggle && collabCard) {
            collabToggle.onclick = (e) => {
                if (!e.target.closest('.badge')) {
                    collabCard.classList.toggle('collapsed');
                }
            };
        }

        // Select All
        if (selectAllCheckbox) {
            selectAllCheckbox.onchange = (e) => {
                const checkboxes = document.querySelectorAll('.collab-check');
                checkboxes.forEach(cb => {
                    cb.checked = e.target.checked;
                    if (e.target.checked) {
                        selectedCollaborators.add(cb.dataset.email);
                    } else {
                        selectedCollaborators.delete(cb.dataset.email);
                    }
                });
                updateBulkBar();
            };
        }

        // Bulk Send Emails
        if (bulkSendBtn) {
            bulkSendBtn.onclick = async () => {
                if (selectedCollaborators.size === 0) {
                    showToast('Select collaborators first', 'danger');
                    return;
                }

                bulkSendBtn.classList.add('loading');
                let sent = 0;

                for (const email of selectedCollaborators) {
                    const collab = eventCollaborators.find(c => c.email === email);
                    if (collab) {
                        const success = await sendCollaboratorInviteEmail(collab);
                        if (success) sent++;
                    }
                }

                bulkSendBtn.classList.remove('loading');
                showToast(`Sent ${sent} invite(s)`, 'success');
            };
        }

        // Bulk Delete
        if (bulkDeleteBtn) {
            bulkDeleteBtn.onclick = async () => {
                if (selectedCollaborators.size === 0) {
                    showToast('Select collaborators first', 'danger');
                    return;
                }

                if (!confirm(`Remove ${selectedCollaborators.size} collaborator(s)?`)) return;

                bulkDeleteBtn.classList.add('loading');

                eventCollaborators = eventCollaborators.filter(
                    c => !selectedCollaborators.has(c.email)
                );

                try {
                    await firestore.collection('events').doc(eventDocId).update({
                        collaborators: eventCollaborators,
                        collaboratorEmails: eventCollaborators.map(c => c.email.toLowerCase())
                    });
                    showToast(`Removed ${selectedCollaborators.size} collaborator(s)`, 'success');
                    selectedCollaborators.clear();
                    renderCollaboratorsList();
                } catch (e) {
                    console.error('Bulk delete error:', e);
                    showToast('Failed to remove collaborators', 'danger');
                }

                bulkDeleteBtn.classList.remove('loading');
            };
        }
    };

    // Fix back button for collaborator mode
    const backLink = document.getElementById('back-to-dashboard');
    if (backLink) {
        backLink.href = 'dashboard.html';
    }

    document.getElementById('logout-btn').onclick = () => {
        sessionStorage.removeItem('authType');
        sessionStorage.removeItem('collaboratorEmail');
        auth.signOut().then(() => window.location.href = '../index.html');
    };

    // --- TICKETING CONFIGURATION ---
    const ticketingForm = document.getElementById('ticketing-config-form');
    if (ticketingForm) {
        ticketingForm.onsubmit = async (e) => {
            e.preventDefault();
            const btn = document.getElementById('save-ticketing-btn');

            const config = {
                memberPrice: parseFloat(document.getElementById('ticket-member-price').value),
                nonmemberPrice: parseFloat(document.getElementById('ticket-nonmember-price').value),
                totalSeats: parseInt(document.getElementById('ticket-total-seats').value, 10),
                salesStart: document.getElementById('ticket-sales-start').value,
                salesEnd: document.getElementById('ticket-sales-end').value,
                salesOpen: document.getElementById('ticket-sales-open').checked
            };

            // --- Validation (Task 2.5) ---
            if (isNaN(config.memberPrice) || config.memberPrice < 0 || isNaN(config.nonmemberPrice) || config.nonmemberPrice < 0) {
                showToast("Prices cannot be negative.", "danger"); return;
            }
            if (isNaN(config.totalSeats) || config.totalSeats < 1) {
                showToast("Total seats must be at least 1.", "danger"); return;
            }
            if (config.memberPrice > config.nonmemberPrice) {
                showToast("Member price should not exceed non-member price.", "danger"); return;
            }
            if (config.salesStart && config.salesEnd && config.salesStart > config.salesEnd) {
                showToast("Sales start date must be before end date.", "danger"); return;
            }

            btn.disabled = true;
            btn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> <span>Saving...</span>';

            try {
                await firestore.collection('events').doc(eventDocId).set({
                    ticketConfig: config
                }, { merge: true });
                showToast('Ticketing config saved!', 'success');
            } catch (err) {
                console.error(err);
                showToast('Failed to save config.', 'danger');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="ph-bold ph-check"></i> <span>Save Ticketing Config</span>';
            }
        };
    }

    // --- COLLAPSIBLE CARDS TOGGLE ---
    // Only the collapse icon triggers collapse, not the whole header
    document.querySelectorAll('.collapsible-card .collapse-icon').forEach(icon => {
        icon.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = icon.closest('.collapsible-card');
            card.classList.toggle('collapsed');
        });
    });
});