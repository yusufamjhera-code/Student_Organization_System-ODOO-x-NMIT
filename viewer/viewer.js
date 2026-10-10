// File: viewer/viewer.js
document.addEventListener('DOMContentLoaded', () => {

    const participantNameEl = document.getElementById('participant-name');
    const scanInstructionEl = document.getElementById('scan-instruction');
    const eventNameEl = document.getElementById('event-name');
    const qrcodeContainer = document.getElementById('qrcode');
    const accessToggle = document.getElementById('access-toggle');
    const accessList = document.getElementById('access-list');

    // --- 1. GET THE TOKEN FROM THE URL ---
    const urlParams = new URLSearchParams(window.location.search);
    const qrToken = urlParams.get('token');

    if (!qrToken) {
        document.body.innerHTML = "<div class='card'><h1>Error</h1><p>No valid token provided.</p></div>";
        return;
    }

    // Toggle access points visibility
    if (accessToggle && accessList) {
        accessToggle.addEventListener('click', () => {
            accessToggle.classList.toggle('open');
            accessList.classList.toggle('show');
        });
    }

    // Track if QR code has been generated (only generate once)
    let qrCodeGenerated = false;
    // Track event listener to avoid duplicates
    let eventUnsubscribe = null;

    /**
     * Render access points grouped by status: Today, Upcoming, Past
     * Follows UX principle: "Instant clarity under pressure"
     */
    const renderAccessPoints = (permissions, stations, eventData) => {
        if (!accessList) return;

        accessList.innerHTML = '';

        // If no stations defined for event
        if (!stations || stations.length === 0) {
            accessList.innerHTML = '<div class="access-item"><span class="point-name">No access points defined</span></div>';
            return;
        }

        // Get today's date (local timezone, not UTC)
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        // Event date info
        const eventStart = eventData?.eventDate;
        const eventEnd = eventData?.eventEndDate || eventStart;
        const isBeforeEvent = eventStart && todayStr < eventStart;
        const isAfterEvent = eventEnd && todayStr > eventEnd;

        // Helper to get date status (respects event date range)
        const getDateStatus = (station) => {
            const dateFrom = station.dateFrom || station.date || 'all';
            const dateTo = station.dateTo || station.date || 'all';

            // For "all days" stations, use event dates as boundaries
            const effectiveFrom = dateFrom === 'all' ? eventStart : dateFrom;
            const effectiveTo = dateTo === 'all' ? eventEnd : dateTo;

            // If event has ended, everything is past
            if (isAfterEvent) return 'past';

            // If before event, everything is upcoming (except all-days which show as "today" preview)
            if (isBeforeEvent) {
                return (dateFrom === 'all' && dateTo === 'all') ? 'today' : 'upcoming';
            }

            // During event: check actual dates
            if (!effectiveFrom || !effectiveTo) return 'today'; // Fallback if no dates
            if (todayStr >= effectiveFrom && todayStr <= effectiveTo) return 'today';
            if (todayStr < effectiveFrom) return 'upcoming';
            return 'past';
        };

        // Helper to format date
        const formatDate = (d) => {
            const date = new Date(d + 'T00:00:00');
            const day = date.getDate();
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${day} ${months[date.getMonth()]}`;
        };

        // If event has ended, show "Event ended" banner and only past section
        if (isAfterEvent && eventEnd) {
            const banner = document.createElement('div');
            banner.className = 'access-banner ended';
            banner.innerHTML = `<i class="ph-bold ph-check-circle"></i> This event ended on ${formatDate(eventEnd)}`;
            accessList.appendChild(banner);

            // All stations go to past
            stations.forEach(station => {
                const perm = permissions[station.name];
                if (!perm) return;

                const stationData = {
                    ...station,
                    isUsed: perm?.status === 'used',
                    dateFrom: station.dateFrom || station.date || 'all',
                    dateTo: station.dateTo || station.date || 'all'
                };

                const item = createAccessItem(stationData, 'past', formatDate);
                accessList.appendChild(item);
            });

            return; // Early return - don't show grouped sections for ended events
        }

        // Categorize stations
        const todayStations = [];
        const upcomingStations = [];
        const pastStations = [];

        stations.forEach(station => {
            const status = getDateStatus(station);
            const perm = permissions[station.name];
            const hasPermission = !!perm;

            // Only show stations user has permission for
            if (!hasPermission) return;

            const stationData = {
                ...station,
                isUsed: perm?.status === 'used',
                dateFrom: station.dateFrom || station.date || 'all',
                dateTo: station.dateTo || station.date || 'all'
            };

            if (status === 'today') todayStations.push(stationData);
            else if (status === 'upcoming') upcomingStations.push(stationData);
            else pastStations.push(stationData);
        });

        // Show "Event starts X" banner if before event
        if (isBeforeEvent && eventStart) {
            const banner = document.createElement('div');
            banner.className = 'access-banner';
            banner.innerHTML = `<i class="ph-bold ph-calendar-check"></i> Event starts ${formatDate(eventStart)}`;
            accessList.appendChild(banner);
        }

        // Render "Today" section (emphasized)
        if (todayStations.length > 0) {
            const header = document.createElement('div');
            header.className = 'access-header today';
            header.innerHTML = `<i class="ph-bold ph-lightning"></i> ${isBeforeEvent ? 'Your Access' : 'Today'}`;
            accessList.appendChild(header);

            todayStations.forEach(station => {
                accessList.appendChild(createAccessItem(station, 'today', formatDate));
            });
        }

        // Render "Upcoming" section (muted)
        if (upcomingStations.length > 0) {
            const header = document.createElement('div');
            header.className = 'access-header upcoming';
            header.innerHTML = '<i class="ph-bold ph-clock"></i> Upcoming';
            accessList.appendChild(header);

            upcomingStations.forEach(station => {
                accessList.appendChild(createAccessItem(station, 'upcoming', formatDate));
            });
        }

        // Render "Past" section (collapsed by default)
        if (pastStations.length > 0) {
            const toggle = document.createElement('button');
            toggle.className = 'access-past-toggle';
            toggle.innerHTML = `<i class="ph-bold ph-caret-down"></i> Show past (${pastStations.length})`;
            toggle.onclick = () => {
                const pastSection = accessList.querySelector('.past-section');
                pastSection.classList.toggle('show');
                toggle.classList.toggle('open');
            };
            accessList.appendChild(toggle);

            const pastSection = document.createElement('div');
            pastSection.className = 'past-section';
            pastStations.forEach(station => {
                pastSection.appendChild(createAccessItem(station, 'past', formatDate));
            });
            accessList.appendChild(pastSection);
        }

        // Empty state
        if (todayStations.length === 0 && upcomingStations.length === 0 && pastStations.length === 0) {
            accessList.innerHTML = '<div class="access-item"><span class="point-name">No access points assigned</span></div>';
        }
    };

    // Helper to create access item element
    const createAccessItem = (station, status, formatDate) => {
        const item = document.createElement('div');
        item.className = `access-item ${status} ${station.isUsed ? 'used' : ''}`;

        const icon = station.isUsed ? 'ph-check-circle' : 'ph-ticket';
        const dateDisplay = station.dateFrom !== 'all'
            ? (station.dateFrom === station.dateTo
                ? formatDate(station.dateFrom)
                : `${formatDate(station.dateFrom)} - ${formatDate(station.dateTo)}`)
            : 'All Days';

        let html = `
            <span class="point-name">
                <i class="ph-bold ${icon}"></i>
                ${station.name}
            </span>
            <span class="point-meta">`;

        if (dateDisplay) {
            html += `<span class="point-date">${dateDisplay}</span>`;
        }

        html += `<span class="point-time">${station.start || '00:00'} — ${station.end || '23:59'}</span>
            </span>`;

        item.innerHTML = html;
        return item;
    };

    /**
     * Finalize view with user and event data
     * Only generates QR code once, but updates text and access points on each call
     */
    const finalizeView = (name, eventData, permissions, stations) => {
        // Update Text
        participantNameEl.textContent = name;
        eventNameEl.textContent = eventData?.name || eventData || 'Event';

        // Check if event has ended (local timezone, not UTC)
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const eventEnd = eventData?.eventEndDate || eventData?.eventDate;
        const isEventEnded = eventEnd && todayStr > eventEnd;

        // Helper to format date
        const formatDate = (d) => {
            if (!d) return '';
            const date = new Date(d + 'T00:00:00');
            const day = date.getDate();
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${day} ${months[date.getMonth()]}`;
        };

        // Handle event-ended state
        if (isEventEnded) {
            // Hide the QR code container and show event-ended overlay
            const eventName = eventData?.name || 'Event';
            qrcodeContainer.innerHTML = `
                <div class="event-ended-overlay">
                    <i class="ph-bold ph-star"></i>
                    <span class="ended-title">You Were There</span>
                    <span class="ended-date">${eventName} • ${formatDate(eventEnd)}</span>
                </div>
            `;
            qrcodeContainer.classList.add('ended');

            // Hide the event name box below (name is already in overlay)
            if (eventNameEl && eventNameEl.parentElement) {
                eventNameEl.parentElement.style.display = 'none';
            }

            // Hide scan instruction (no QR to scan)
            if (scanInstructionEl) {
                scanInstructionEl.style.display = 'none';
            }

            // Don't generate QR for ended events
            qrCodeGenerated = true;

            // Render access points (still shows past access)
            renderAccessPoints(permissions, stations, eventData);

            // Trigger ready state
            document.body.classList.remove('loading-active');
            document.body.classList.add('ready');
            return;
        }

        // Render access points (updates each time data changes)
        renderAccessPoints(permissions, stations, eventData);

        // Generate QR Code only once
        if (!qrCodeGenerated) {
            new QRCode(qrcodeContainer, {
                text: qrToken,
                width: 220,
                height: 220,
                correctLevel: QRCode.CorrectLevel.H
            });
            qrCodeGenerated = true;

            // Trigger the CSS animations (only on first load)
            document.body.classList.remove('loading-active');
            document.body.classList.add('ready');
        }
    };

    /**
     * Set up real-time listener for event data
     * Called when we have eventDocId from user data
     */
    const listenToEvent = (eventDocId, userData) => {
        // Unsubscribe from previous event listener if any
        if (eventUnsubscribe) {
            eventUnsubscribe();
        }

        // Set up real-time listener for event document
        eventUnsubscribe = db.collection('events').doc(eventDocId).onSnapshot(
            (eventDoc) => {
                if (eventDoc.exists) {
                    const eventData = eventDoc.data();
                    finalizeView(
                        userData.name,
                        eventData,
                        userData.permissions || {},
                        eventData.stations || []
                    );
                } else {
                    finalizeView(userData.name, { name: 'Event Not Found' }, userData.permissions || {}, []);
                }
            },
            (error) => {
                console.error("Event listener error:", error);
                finalizeView(userData.name, { name: 'Official Event' }, userData.permissions || {}, []);
            }
        );
    };

    // --- 2. REAL-TIME LISTENER FOR PARTICIPANT DATA ---
    const usersRef = db.collection('users').where('qrToken', '==', qrToken);

    // Use onSnapshot for real-time updates instead of one-time get()
    usersRef.onSnapshot(
        (userSnapshot) => {
            if (userSnapshot.empty) {
                finalizeView('Unknown Participant', { name: 'Invalid or Expired Token' }, {}, []);
                return;
            }

            const userData = userSnapshot.docs[0].data();

            // Fetch the event details using eventDocId (immutable document ID)
            if (userData.eventDocId) {
                listenToEvent(userData.eventDocId, userData);
            } else if (userData.eventId) {
                // Fallback for legacy tokens that only have eventId
                db.collection('events').where('eventId', '==', userData.eventId).get()
                    .then((eventSnapshot) => {
                        if (!eventSnapshot.empty) {
                            const eventDocId = eventSnapshot.docs[0].id;
                            listenToEvent(eventDocId, userData);
                        } else {
                            finalizeView(userData.name, { name: 'Official Event' }, userData.permissions || {}, []);
                        }
                    })
                    .catch((error) => {
                        console.error("Legacy event fetch error:", error);
                        finalizeView(userData.name, { name: 'Official Event' }, userData.permissions || {}, []);
                    });
            } else {
                finalizeView(userData.name, { name: 'Official Event' }, userData.permissions || {}, []);
            }
        },
        (error) => {
            console.error("Critical Viewer Error:", error);
            participantNameEl.textContent = 'System Error';
            document.body.classList.remove('loading-active');
        }
    );
});
