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
        const isDemo = sessionStorage.getItem('demoUser') === 'true' ||
            window.location.search.includes('demo=true') ||
            window.location.hostname.includes('github.io');
        if (isDemo) {
            eventDocId = 'hacknmit-2026';
            eventId = 'hacknmit-2026';
            sessionStorage.setItem('distributorEventDocId', 'hacknmit-2026');
            sessionStorage.setItem('distributorEventId', 'hacknmit-2026');
            sessionStorage.setItem('distributorEventName', 'HackNMIT 2026');
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

    // ==========================================
    // VOICE SOUNDBOX HARDWARE SIMULATOR ENGINE
    // ==========================================
    const VoiceSoundbox = {
        isEnabled: localStorage.getItem('passtrack_soundbox_enabled') !== 'false',
        audioCtx: null,

        initAudio: function() {
            if (!this.audioCtx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) this.audioCtx = new AudioCtx();
            }
        },

        playTone: function(frequency, type, duration) {
            try {
                this.initAudio();
                if (!this.audioCtx) return;
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.type = type;
                osc.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);
                gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
                osc.connect(gain);
                gain.connect(this.audioCtx.destination);
                osc.start();
                osc.stop(this.audioCtx.currentTime + duration);
            } catch(e) {}
        },

        playSuccessChime: function() {
            this.playTone(880, 'sine', 0.15); // A5
            setTimeout(() => this.playTone(1318.51, 'sine', 0.25), 120); // E6
        },

        playAlertBuzz: function() {
            this.playTone(280, 'sawtooth', 0.2);
            setTimeout(() => this.playTone(220, 'sawtooth', 0.35), 180);
        },

        speak: function(text, isPositive = true) {
            if (!this.isEnabled) return;

            // Play hardware soundbox tone first
            if (isPositive) this.playSuccessChime();
            else this.playAlertBuzz();

            if (!('speechSynthesis' in window)) return;

            try {
                window.speechSynthesis.cancel(); // Cancel any lingering utterance

                setTimeout(() => {
                    const utterance = new SpeechSynthesisUtterance(text);
                    utterance.rate = 1.05;
                    utterance.pitch = isPositive ? 1.05 : 0.95;
                    utterance.volume = 1.0;
                    utterance.lang = 'en-US';

                    const voices = window.speechSynthesis.getVoices();
                    if (voices.length > 0) {
                        const naturalVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
                        if (naturalVoice) utterance.voice = naturalVoice;
                    }

                    window.speechSynthesis.speak(utterance);
                }, 180);
            } catch(e) {
                console.warn("Speech synthesis error:", e);
            }
        },

        announceSuccess: function(name, ticketType) {
            const tierStr = ticketType ? `${ticketType} Pass. ` : '';
            this.speak(`Access Granted! ${tierStr}Welcome, ${name}!`, true);
        },

        announceWarning: function(name, time) {
            this.speak(`Warning! Pass already used for ${name} at ${time}. Entry Denied.`, false);
        },

        announceDenied: function(reason) {
            this.speak(`Access Denied! ${reason}`, false);
        },

        toggle: function() {
            this.isEnabled = !this.isEnabled;
            localStorage.setItem('passtrack_soundbox_enabled', this.isEnabled ? 'true' : 'false');
            this.updateUI();
            if (this.isEnabled) {
                this.speak("Voice Soundbox Activated.", true);
            }
        },

        updateUI: function() {
            const toggleBtn = document.getElementById('soundbox-toggle-btn');
            const label = document.getElementById('soundbox-status-label');
            const icon = document.getElementById('soundbox-icon');
            if (!toggleBtn) return;

            if (this.isEnabled) {
                toggleBtn.classList.remove('muted');
                if (label) label.textContent = 'Voice: ON';
                if (icon) icon.className = 'ph-bold ph-speaker-high';
            } else {
                toggleBtn.classList.add('muted');
                if (label) label.textContent = 'Voice: OFF';
                if (icon) icon.className = 'ph-bold ph-speaker-slash';
            }
        }
    };

    // Attach Soundbox Toggle Listener
    const soundboxToggleBtn = document.getElementById('soundbox-toggle-btn');
    if (soundboxToggleBtn) {
        soundboxToggleBtn.addEventListener('click', () => VoiceSoundbox.toggle());
        VoiceSoundbox.updateUI();
    }

    // Attach Soundbox Demo Triggers
    const testGrantBtn = document.getElementById('test-grant-btn');
    const testWarningBtn = document.getElementById('test-warning-btn');
    const testDeniedBtn = document.getElementById('test-denied-btn');

    if (testGrantBtn) {
        testGrantBtn.addEventListener('click', () => {
            VoiceSoundbox.announceSuccess('Verified Attendee', 'Pass Verified');
            showResult(true, 'Access Granted', 'Welcome, Verified Attendee!');
        });
    }
    if (testWarningBtn) {
        testWarningBtn.addEventListener('click', () => {
            VoiceSoundbox.announceWarning('Attendee', 'Prior Scan');
            showResult(false, 'Already Used', 'Pass was already scanned.');
        });
    }
    if (testDeniedBtn) {
        testDeniedBtn.addEventListener('click', () => {
            VoiceSoundbox.announceDenied('Invalid security token.');
            showResult(false, 'Invalid Token', 'This pass does not belong to this event.');
        });
    }

    // --- 3. SCAN SUCCESS LOGIC ---
    async function onScanSuccess(decodedText) {
        if (isProcessing || !currentStation) return;
        isProcessing = true;

        // A. TIMELINE ENFORCEMENT
        if (!isStationActive(currentStation.start, currentStation.end)) {
            const msg = `Hours for ${currentStation.name}: ${currentStation.start} to ${currentStation.end}`;
            showResult(false, 'Station Closed', msg);
            VoiceSoundbox.announceDenied('Station is currently closed.');
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
                VoiceSoundbox.announceDenied('Invalid token. Pass does not belong to this event.');
            } else {
                const userDoc = querySnapshot.docs[0];
                const userData = userDoc.data();
                const perms = userData.permissions || {};

                // B. PERMISSION CHECK
                if (!perms[currentStation.name]) {
                    showResult(false, 'No Access', `${userData.name} is not authorized for this specific station.`);
                    VoiceSoundbox.announceDenied(`${userData.name} is not authorized for ${currentStation.name}.`);
                }
                // C. DUPLICATE CHECK
                else if (perms[currentStation.name].status === 'used') {
                    const time = perms[currentStation.name].scannedAt ?
                        new Date(perms[currentStation.name].scannedAt.seconds * 1000).toLocaleTimeString() : 'Earlier Today';
                    showResult(false, 'Already Used', `${userData.name} checked in at ${time}.`);
                    VoiceSoundbox.announceWarning(userData.name, time);
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
                    VoiceSoundbox.announceSuccess(userData.name, userData.ticketType || '');
                }
            }
        } catch (error) {
            console.error("Scan Error:", error);
            showResult(false, 'Database Error', 'Check connection or index status.');
            VoiceSoundbox.announceDenied('Database connection error.');
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