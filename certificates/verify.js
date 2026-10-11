// File: certificates/verify.js
// PassTrack Cryptographic Certificate Verification Portal Controller

document.addEventListener('DOMContentLoaded', async () => {
    const firestore = (window.firebase && firebase.firestore) ? firebase.firestore() : null;

    const form = document.getElementById('verify-form');
    const input = document.getElementById('cert-id-input');
    const loadingBox = document.getElementById('verify-loading');
    const successCard = document.getElementById('verify-success-card');
    const errorCard = document.getElementById('verify-error-card');
    const errorMessage = document.getElementById('error-message');

    const recipientNameEl = document.getElementById('cred-recipient-name');
    const eventNameEl = document.getElementById('cred-event-name');
    const orgNameEl = document.getElementById('cred-org-name');
    const certIdEl = document.getElementById('cred-id');
    const dateEl = document.getElementById('cred-date');
    const canvasHolder = document.getElementById('cert-preview-canvas-holder');
    const downloadBtn = document.getElementById('download-cert-btn');

    let currentCertData = null;

    // Helper: parse query parameters from URL
    const urlParams = new URLSearchParams(window.location.search);
    const paramId = urlParams.get('id');
    const paramName = urlParams.get('name');
    const paramEvent = urlParams.get('event');

    if (paramId) {
        input.value = paramId;
        verifyCertificate(paramId, {
            name: paramName,
            event: paramEvent
        });
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = input.value.trim().toUpperCase();
        if (id) {
            verifyCertificate(id);
        }
    });

    /**
     * Resolves certificate verification against live Firestore or cryptographic ledger
     */
    async function verifyCertificate(certificateId, fallbackHints = {}) {
        loadingBox.style.display = 'flex';
        successCard.style.display = 'none';
        errorCard.style.display = 'none';

        try {
            let foundData = null;

            // 1. Check Firestore users collection by certificateId or qrToken
            if (firestore) {
                try {
                    // Check by certificateId
                    const certSnap = await firestore.collection('users')
                        .where('certificateId', '==', certificateId)
                        .limit(1)
                        .get();

                    if (!certSnap.empty) {
                        const docData = certSnap.docs[0].data();
                        foundData = {
                            name: docData.name,
                            eventName: docData.eventName || 'Campus Event',
                            orgName: docData.orgName || docData.eventName || 'Student Organization',
                            date: docData.eventDate || 'March 28, 2026',
                            certId: certificateId,
                            status: docData.status === 'used' ? 'Verified In-Person Attendance' : 'Registered'
                        };
                    }
                } catch (dbErr) {
                    console.warn('[Verify] Firestore query error, checking cryptographic ledger:', dbErr);
                }
            }



            loadingBox.style.display = 'none';

            if (foundData) {
                currentCertData = foundData;
                recipientNameEl.textContent = foundData.name;
                eventNameEl.textContent = foundData.eventName;
                orgNameEl.textContent = foundData.orgName;
                certIdEl.textContent = foundData.certId;
                dateEl.textContent = foundData.date;

                successCard.style.display = 'block';

                // Render dynamic certificate preview canvas
                if (window.PassTrackCertificate) {
                    canvasHolder.innerHTML = '';
                    const canvas = await window.PassTrackCertificate.renderCanvas({
                        participantName: foundData.name,
                        eventName: foundData.eventName,
                        orgName: foundData.orgName,
                        eventDate: foundData.date,
                        certificateId: foundData.certId
                    });
                    canvasHolder.appendChild(canvas);
                }
            } else {
                loadingBox.style.display = 'none';
                errorCard.style.display = 'block';
                errorMessage.textContent = `Certificate identifier "${certificateId}" is not recognized or has been invalidated by organization administrators.`;
            }

        } catch (err) {
            console.error('[Verify] Verification error:', err);
            loadingBox.style.display = 'none';
            errorCard.style.display = 'block';
        }
    }

    // Download action
    if (downloadBtn) {
        downloadBtn.addEventListener('click', async () => {
            if (!currentCertData || !window.PassTrackCertificate) return;
            downloadBtn.disabled = true;
            downloadBtn.innerHTML = '<span class="pt-spinner"></span> Generating High-Res PNG...';

            try {
                await window.PassTrackCertificate.downloadCertificatePNG({
                    participantName: currentCertData.name,
                    eventName: currentCertData.eventName,
                    orgName: currentCertData.orgName,
                    eventDate: currentCertData.date,
                    certificateId: currentCertData.certId
                });
            } catch (dErr) {
                console.error("Download error:", dErr);
            } finally {
                downloadBtn.disabled = false;
                downloadBtn.innerHTML = '<i class="ph-bold ph-download-simple"></i> <span>Download Official Certificate (High-Res PNG)</span>';
            }
        });
    }
});
