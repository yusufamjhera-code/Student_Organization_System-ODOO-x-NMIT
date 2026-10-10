// File: distributor/scanner.js
document.addEventListener('DOMContentLoaded', () => {

    const firestore = db; // Initialized in lib/firebase-config.js

    // --- 1. AUTHENTICATION & INITIALIZATION ---
    let eventDocId = sessionStorage.getItem('distributorEventDocId');
    let eventId = sessionStorage.getItem('distributorEventId');
    const urlParams = new URLSearchParams(window.location.search);
    const paramId = urlParams.get('id');

    if (paramId) {
        eventDocId = paramId;
        eventId = paramId;
        sessionStorage.setItem('distributorEventDocId', paramId);
        sessionStorage.setItem('distributorEventId', paramId);
    } else if (!eventDocId) {
        const isDemo = sessionStorage.getItem('demoUser') === 'true' || sessionStorage.getItem('authType') === 'admin' || (window.firebaseConfig && firebaseConfig.apiKey === "YOUR_API_KEY");
        if (isDemo) {
            eventDocId = 'hacknmit-2026';
            eventId = 'hacknmit-2026';
            sessionStorage.setItem('distributorEventDocId', 'hacknmit-2026');
            sessionStorage.setItem('distributorEventId', 'hacknmit-2026');
        } else {
            window.location.href = 'distributor.html';
            return;
        }
    }

    // DOM Elements
    const stationOverlay = document.getElementById('station-selection-overlay');
    const stationOptions = document.getElementById('station-options');
    const activeStationEl = document.getElementById('active-station-name');
    const resultContainer = document.getElementById('result-container');
    const resultIcon = document.getElementById('result-icon');
    const resultText = document.getElementById('result-text');
    const logoutBtn = document.getElementById('logout-btn');
    const changeCameraBtn = document.getElementById('change-camera-btn');
    const switchStationBtn = document.getElementById('switch-station-btn');

    let html5QrCode;
    let isProcessing = false;
    let currentStation = null;
    let cameras = [];
    let activeCameraIndex = 0;

    // --- 2. STATION & TIMELINE HELPERS ---

    const isStationActive = (start, end) => {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        return currentTime >= start && currentTime <= end;
    };

    const loadStations = async () => {
        try {
            let stations = [];
            try {
                const eventDoc = await firestore.collection('events').doc(eventDocId).get();
                if (eventDoc.exists) {
                    stations = eventDoc.data().stations || [];
                }
            } catch (err) {
                // Ignore firestore permission error in demo mode
            }

            if (stations.length === 0) {
                stations = [
                    { name: 'Entrance', start: '00:00', end: '23:59', dateFrom: 'all', dateTo: 'all' },
                    { name: 'Lab 3', start: '09:00', end: '18:00', dateFrom: 'all', dateTo: 'all' }
                ];
            }

            // Filter stations by today's date
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

            const filteredStations = stations.filter(s => {
                const from = s.dateFrom || s.date || 'all';
                const to = s.dateTo || s.date || 'all';
                if (from === 'all' || to === 'all') return true;
                return todayStr >= from && todayStr <= to;
            });

            stationOptions.innerHTML = '';
            if (filteredStations.length === 0) {
                stationOptions.innerHTML = '<p style="color:#ef4444; font-weight:600; padding:20px;">No scan points active for today.</p>';
                return;
            }

            filteredStations.forEach(s => {
                const btn = document.createElement('button');
                btn.className = 'station-btn';
                btn.style.cssText = "width:100%; padding:16px; margin-bottom:12px; border-radius:14px; border:1.5px solid #e2e8f0; background:#fff; cursor:pointer; text-align:left; transition: all 0.2s;";
                btn.innerHTML = `
                    <strong style="color:#1e293b; display:block; font-size:1rem; margin-bottom:4px;">${s.name}</strong>
                    <small style="color:#64748b; font-weight:600;">🕒 Time: ${s.start} - ${s.end}</small>
                `;
                btn.onclick = () => selectStation(s);
                stationOptions.appendChild(btn);
            });
        } catch (e) {
            console.error("Load error:", e);
            showResult(false, 'Sync Error', 'Failed to fetch stations.');
        }
    };

    const selectStation = (station) => {
        currentStation = station;
        activeStationEl.textContent = `Station: ${station.name}`;
        stationOverlay.style.display = 'none';
        showResult(null, 'Scanner Ready', 'Point your camera at a QR code.');
    };

    switchStationBtn.onclick = () => {
        stationOverlay.style.display = 'grid';
    };

    // --- 3. SCAN SUCCESS LOGIC ---
    async function onScanSuccess(decodedText) {
        if (isProcessing || !currentStation) return;
        isProcessing = true;

        // A. TIMELINE ENFORCEMENT
        if (!isStationActive(currentStation.start, currentStation.end)) {
            showResult(false, 'Station Closed', `Hours for ${currentStation.name}: ${currentStation.start} to ${currentStation.end}`);
            setTimeout(() => { isProcessing = false; }, 3000);
            return;
        }

        try {
            const usersRef = firestore.collection('users');
            // Use eventDocId (immutable) so tokens don't break when public ID changes
            const query = usersRef
                .where('qrToken', '==', decodedText)
                .where('eventDocId', '==', eventDocId);

            const querySnapshot = await query.get();

            if (querySnapshot.empty) {
                showResult(false, 'Invalid Token', 'This QR does not belong to this event.');
            } else {
                const userDoc = querySnapshot.docs[0];
                const userData = userDoc.data();
                const perms = userData.permissions || {};

                // B. PERMISSION CHECK
                if (!perms[currentStation.name]) {
                    showResult(false, 'No Access', `${userData.name} is not authorized for this specific station.`);
                }
                // C. DUPLICATE CHECK
                else if (perms[currentStation.name].status === 'used') {
                    const time = perms[currentStation.name].scannedAt ?
                        new Date(perms[currentStation.name].scannedAt.seconds * 1000).toLocaleTimeString() : 'Previously';
                    showResult(false, 'Already Used', `${userData.name} checked in at ${time}.`);
                }
                // D. SUCCESS
                else {
                    const updatedPerms = { ...perms };
                    updatedPerms[currentStation.name] = {
                        status: 'used',
                        scannedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        scannedBy: 'Staff_Mobile'
                    };

                    // Update database - Dashboard listens to this document
                    await userDoc.ref.update({
                        permissions: updatedPerms,
                        status: 'used' // Root level sync
                    });

                    showResult(true, 'Access Granted', `Welcome, ${userData.name}!`);
                }
            }
        } catch (error) {
            console.error("Scan Error:", error);
            showResult(false, 'Database Error', 'Check connection or index status.');
        }

        setTimeout(() => { isProcessing = false; }, 2500);
    }

    // --- 4. UI FEEDBACK ---
    function showResult(isSuccess, title, message) {
        if (isSuccess === null) {
            resultContainer.className = '';
            resultIcon.textContent = '📷';
        } else {
            resultContainer.className = isSuccess ? 'success' : 'failure';
            resultIcon.textContent = isSuccess ? '✅' : '❌';
        }
        resultText.innerHTML = `<strong>${title}</strong><br>${message}`;
    }

    // --- 5. CAMERA INIT ---
    html5QrCode = new Html5Qrcode("reader");
    const config = { fps: 15, qrbox: { width: 250, height: 250 } };

    const startCamera = (cameraId) => {
        html5QrCode.start(cameraId, config, onScanSuccess)
            .catch(err => {
                showResult(false, 'Camera Error', 'Lens initialization failed.');
            });
    };

    Html5Qrcode.getCameras().then(availableCameras => {
        cameras = availableCameras;
        if (cameras && cameras.length) {
            const backCam = cameras.find(c => c.label.toLowerCase().includes('back')) || cameras[0];
            activeCameraIndex = cameras.indexOf(backCam);
            startCamera(backCam.id);

            if (cameras.length > 1) {
                changeCameraBtn.addEventListener('click', () => {
                    if (html5QrCode.isScanning) {
                        html5QrCode.stop().then(() => {
                            activeCameraIndex = (activeCameraIndex + 1) % cameras.length;
                            startCamera(cameras[activeCameraIndex].id);
                        });
                    }
                });
            }
        }
    });

    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('distributorEventId');
        window.location.href = '../index.html';
    });

    loadStations();
});