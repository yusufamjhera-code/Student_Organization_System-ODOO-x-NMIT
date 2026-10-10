/**
 * ============================================================================
 * PassTrack Ultra-Realistic UPI Payment Gateway Simulator
 * ============================================================================
 * Simulates end-to-end UPI payment flows (Scan QR, UPI ID Collect, App Intent)
 * with authentic NPCI transaction references (UTR), realistic multi-step
 * banking verification, and synthesized audio feedback (Web Audio API).
 */

(function (window) {
    'use strict';

    // Synthesize authentic payment success chime using Web Audio API
    function playUpiSuccessChime() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();

            const playTone = (freq, startTime, duration, type = 'sine') => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = type;
                osc.frequency.setValueAtTime(freq, startTime);

                gain.gain.setValueAtTime(0.001, startTime);
                gain.gain.exponentialRampToValueAtTime(0.28, startTime + 0.04);
                gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(startTime);
                osc.stop(startTime + duration);
            };

            const now = ctx.currentTime;
            // Melodic 4-note chime (G5, B5, D6, G6) resembling high-fidelity UPI soundbox
            playTone(783.99, now + 0.00, 0.28, 'sine');
            playTone(987.77, now + 0.12, 0.28, 'sine');
            playTone(1174.66, now + 0.24, 0.35, 'sine');
            playTone(1567.98, now + 0.38, 0.55, 'triangle');
        } catch (e) {
            console.debug("Audio chime skipped:", e);
        }
    }

    // Generate realistic 12-digit UPI UTR / RRN (e.g. 429185019284)
    function generateUtrNumber() {
        const yearDay = new Date().getFullYear().toString().slice(-1) + 
                        Math.floor(Math.random() * 300 + 100).toString();
        const randomDigits = Math.floor(10000000 + Math.random() * 90000000).toString();
        return (yearDay + randomDigits).substring(0, 12);
    }

    // Reusable UPI Gateway Object
    const UpiGateway = {
        /**
         * Initiates a realistic UPI payment flow.
         * @param {Object} options
         * @param {number} options.amount - Total amount in INR (e.g. 250)
         * @param {string} [options.merchantName] - Name of student club / organization
         * @param {string} [options.description] - Order description
         * @param {string} [options.customerName] - Name of payer
         * @param {string} [options.customerEmail] - Email of payer
         * @returns {Promise<Object>} Resolves on successful simulation
         */
        pay: function (options) {
            return new Promise((resolve, reject) => {
                const amount = Number(options.amount) || 0;
                const merchantName = options.merchantName || 'PassTrack Student Org';
                const description = options.description || 'PassTrack Booking';
                const customerName = options.customerName || 'Student';
                const merchantVpa = 'passtrack.nmit@hdfcbank';
                const txnRef = 'PT' + Date.now().toString().slice(-8);

                // Build standardized UPI Intent String
                const upiIntentUri = `upi://pay?pa=${merchantVpa}&pn=${encodeURIComponent(merchantName)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(description)}&tr=${txnRef}`;
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(upiIntentUri)}`;

                // Ensure CSS is loaded
                if (!document.getElementById('upi-gateway-stylesheet')) {
                    const link = document.createElement('link');
                    link.id = 'upi-gateway-stylesheet';
                    link.rel = 'stylesheet';
                    link.href = (window.location.pathname.includes('/tickets/') || 
                                 window.location.pathname.includes('/merch/') || 
                                 window.location.pathname.includes('/members/') || 
                                 window.location.pathname.includes('/organizer/'))
                                ? '../lib/upi-gateway.css' : 'lib/upi-gateway.css';
                    document.head.appendChild(link);
                }

                // Remove existing modal if any
                const existing = document.getElementById('upi-payment-modal');
                if (existing) existing.remove();

                // Create Modal DOM
                const backdrop = document.createElement('div');
                backdrop.id = 'upi-payment-modal';
                backdrop.className = 'upi-modal-backdrop';

                backdrop.innerHTML = `
                    <div class="upi-modal-dialog" role="dialog" aria-modal="true">
                        <!-- Header -->
                        <div class="upi-header">
                            <div class="upi-header-top">
                                <div class="upi-brand">
                                    <div class="upi-badge-pill">
                                        <i class="ph-bold ph-shield-check"></i>
                                        <span>NPCI UPI Verified</span>
                                    </div>
                                </div>
                                <button type="button" class="upi-close-btn" id="upi-btn-cancel" title="Cancel payment">
                                    <i class="ph-bold ph-x"></i>
                                </button>
                            </div>
                            <div class="upi-order-info">
                                <div>
                                    <div class="upi-merchant-name">${merchantName}</div>
                                    <div class="upi-order-desc" title="${description}">${description}</div>
                                </div>
                                <div class="upi-amount-display">
                                    <div class="upi-amount-label">Amount Payable</div>
                                    <div class="upi-amount-val">
                                        <span>₹</span>${amount.toFixed(2)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Timer strip -->
                        <div class="upi-timer-bar">
                            <span><i class="ph-bold ph-clock"></i> Session expires in</span>
                            <span class="upi-timer-count" id="upi-countdown">04:59</span>
                        </div>

                        <!-- Tabs -->
                        <div class="upi-tabs" id="upi-tab-bar">
                            <button type="button" class="upi-tab-btn active" data-tab="qr">
                                <i class="ph-bold ph-qr-code"></i> Scan QR
                            </button>
                            <button type="button" class="upi-tab-btn" data-tab="vpa">
                                <i class="ph-bold ph-at"></i> UPI ID / VPA
                            </button>
                            <button type="button" class="upi-tab-btn" data-tab="apps">
                                <i class="ph-bold ph-device-mobile"></i> UPI Apps
                            </button>
                        </div>

                        <!-- Main Views -->
                        <div class="upi-modal-body">
                            <!-- Tab 1: QR Code -->
                            <div class="upi-tab-pane active" id="pane-qr">
                                <div class="upi-qr-wrapper">
                                    <div class="upi-qr-corner tl"></div>
                                    <div class="upi-qr-corner tr"></div>
                                    <div class="upi-qr-corner bl"></div>
                                    <div class="upi-qr-corner br"></div>
                                    <div class="upi-scan-laser"></div>
                                    <img src="${qrUrl}" alt="UPI Payment QR Code" class="upi-qr-img" id="upi-qr-image" 
                                         onerror="this.src='https://chart.googleapis.com/chart?chs=220x220&cht=qr&chl=' + encodeURIComponent('${upiIntentUri}')">
                                </div>
                                <p class="upi-instruction">
                                    Scan QR code with any UPI app on your mobile phone to pay
                                </p>
                                <div class="upi-supported-apps">
                                    <div class="upi-app-badge"><span class="upi-app-dot dot-gpay"></span> Google Pay</div>
                                    <div class="upi-app-badge"><span class="upi-app-dot dot-phonepe"></span> PhonePe</div>
                                    <div class="upi-app-badge"><span class="upi-app-dot dot-paytm"></span> Paytm</div>
                                    <div class="upi-app-badge"><span class="upi-app-dot dot-cred"></span> CRED</div>
                                </div>
                                <button type="button" class="upi-action-btn" id="upi-btn-simulate-qr">
                                    <i class="ph-bold ph-lightning"></i>
                                    <span>Simulate Scan & Pay</span>
                                </button>
                            </div>

                            <!-- Tab 2: VPA / Collect Request -->
                            <div class="upi-tab-pane" id="pane-vpa">
                                <div class="upi-form-group" id="upi-vpa-input-group">
                                    <label class="upi-label" for="upi-vpa-input">Enter UPI ID / Mobile Number</label>
                                    <div class="upi-input-wrap">
                                        <input type="text" id="upi-vpa-input" class="upi-input" placeholder="e.g. 9876543210@okaxis" value="${customerName.toLowerCase().replace(/[^a-z]/g, '') || 'student'}@okhdfcbank">
                                    </div>
                                    <div class="upi-chips">
                                        <span class="upi-chip" data-suffix="@okaxis">@okaxis</span>
                                        <span class="upi-chip" data-suffix="@okhdfcbank">@okhdfcbank</span>
                                        <span class="upi-chip" data-suffix="@paytm">@paytm</span>
                                        <span class="upi-chip" data-suffix="@ybl">@ybl</span>
                                    </div>
                                </div>

                                <div id="upi-vpa-pending-box" style="display: none; width: 100%;">
                                    <div class="upi-collect-notice">
                                        <div class="upi-collect-notice-header">
                                            <i class="ph-bold ph-bell-ringing"></i>
                                            <span>Collect Request Dispatched!</span>
                                        </div>
                                        <p>A collect request of <strong>₹${amount.toFixed(2)}</strong> has been sent to your UPI App. Please accept the request on your phone.</p>
                                    </div>
                                    <button type="button" class="upi-action-btn" id="upi-btn-approve-collect">
                                        <i class="ph-bold ph-check"></i>
                                        <span>Approve Request on Phone (Simulate)</span>
                                    </button>
                                </div>

                                <button type="button" class="upi-action-btn" id="upi-btn-send-collect">
                                    <i class="ph-bold ph-paper-plane-tilt"></i>
                                    <span>Verify & Request Payment</span>
                                </button>
                            </div>

                            <!-- Tab 3: UPI Apps Grid -->
                            <div class="upi-tab-pane" id="pane-apps">
                                <div class="upi-apps-grid">
                                    <div class="upi-app-card" data-app="Google Pay">
                                        <div class="upi-app-icon" style="background: rgba(66, 133, 244, 0.15); color: #4285F4;">G</div>
                                        <div>
                                            <div class="upi-app-title">Google Pay</div>
                                            <div class="upi-app-sub">Instant Pay</div>
                                        </div>
                                    </div>
                                    <div class="upi-app-card" data-app="PhonePe">
                                        <div class="upi-app-icon" style="background: rgba(95, 37, 159, 0.15); color: #a855f7;">P</div>
                                        <div>
                                            <div class="upi-app-title">PhonePe</div>
                                            <div class="upi-app-sub">Instant Pay</div>
                                        </div>
                                    </div>
                                    <div class="upi-app-card" data-app="Paytm">
                                        <div class="upi-app-icon" style="background: rgba(0, 186, 242, 0.15); color: #00baf2;">₹</div>
                                        <div>
                                            <div class="upi-app-title">Paytm UPI</div>
                                            <div class="upi-app-sub">Fast Checkout</div>
                                        </div>
                                    </div>
                                    <div class="upi-app-card" data-app="CRED UPI">
                                        <div class="upi-app-icon" style="background: rgba(255, 255, 255, 0.15); color: #ffffff;">C</div>
                                        <div>
                                            <div class="upi-app-title">CRED UPI</div>
                                            <div class="upi-app-sub">Rewards Eligible</div>
                                        </div>
                                    </div>
                                </div>
                                <p class="upi-instruction" style="font-size:0.8rem;">
                                    Click any UPI app to simulate instant direct authorization.
                                </p>
                            </div>

                            <!-- Processing Stepper View -->
                            <div class="upi-progress-overlay" id="upi-processing-view">
                                <i class="ph-bold ph-spinner-gap spin" style="font-size: 2.4rem; color: #38bdf8; margin-bottom: 12px;"></i>
                                <h3 style="font-size: 1.15rem; color: #f8fafc; margin-bottom: 4px;">Processing Payment</h3>
                                <p style="font-size: 0.82rem; color: #94a3b8; margin: 0;">Please do not refresh or press back</p>

                                <div class="upi-stepper">
                                    <div class="upi-step-item active" id="step-1">
                                        <div class="upi-step-icon"><i class="ph-bold ph-device-mobile"></i></div>
                                        <span>Authorizing with UPI Application</span>
                                    </div>
                                    <div class="upi-step-item" id="step-2">
                                        <div class="upi-step-icon"><i class="ph-bold ph-lock-key"></i></div>
                                        <span>NPCI UPI Switch Verification</span>
                                    </div>
                                    <div class="upi-step-item" id="step-3">
                                        <div class="upi-step-icon"><i class="ph-bold ph-bank"></i></div>
                                        <span>Settlement with Issuing Bank</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Success Screen -->
                            <div class="upi-success-view" id="upi-success-view">
                                <div class="upi-success-badge">
                                    <i class="ph-bold ph-check"></i>
                                </div>
                                <div class="upi-success-title">Payment Successful!</div>
                                <div class="upi-success-sub">Transaction approved by Bank</div>

                                <div class="upi-receipt-box">
                                    <div class="upi-receipt-row">
                                        <span class="upi-receipt-label">Amount Paid</span>
                                        <span class="upi-receipt-val" style="color:#4ade80;">₹${amount.toFixed(2)}</span>
                                    </div>
                                    <div class="upi-receipt-row">
                                        <span class="upi-receipt-label">UPI Ref / UTR</span>
                                        <span class="upi-receipt-val" id="receipt-utr">--</span>
                                    </div>
                                    <div class="upi-receipt-row">
                                        <span class="upi-receipt-label">Merchant VPA</span>
                                        <span class="upi-receipt-val">${merchantVpa}</span>
                                    </div>
                                    <div class="upi-receipt-row">
                                        <span class="upi-receipt-label">Date & Time</span>
                                        <span class="upi-receipt-val" id="receipt-time">--</span>
                                    </div>
                                </div>

                                <button type="button" class="upi-action-btn" id="upi-btn-continue" style="background: linear-gradient(135deg, #16a34a, #22c55e);">
                                    <i class="ph-bold ph-check-circle"></i>
                                    <span>Complete Order</span>
                                </button>
                            </div>
                        </div>

                        <!-- Security Footer -->
                        <div class="upi-security-footer">
                            <i class="ph-fill ph-lock-key"></i>
                            <span>End-to-End 256-bit Encrypted • ISO 27001 NPCI Certified</span>
                        </div>
                    </div>
                `;

                document.body.appendChild(backdrop);

                // Reveal with slight animation tick
                requestAnimationFrame(() => {
                    backdrop.classList.add('active');
                });

                // Countdown Timer (5 Minutes)
                let remainingSec = 299;
                const timerEl = document.getElementById('upi-countdown');
                const timerInterval = setInterval(() => {
                    remainingSec--;
                    if (remainingSec <= 0) {
                        clearInterval(timerInterval);
                        closeModal();
                        reject(new Error("PAYMENT_EXPIRED"));
                        return;
                    }
                    const m = String(Math.floor(remainingSec / 60)).padStart(2, '0');
                    const s = String(remainingSec % 60).padStart(2, '0');
                    if (timerEl) timerEl.textContent = `${m}:${s}`;
                }, 1000);

                // Tab switching
                const tabBtns = backdrop.querySelectorAll('.upi-tab-btn');
                const tabPanes = {
                    qr: document.getElementById('pane-qr'),
                    vpa: document.getElementById('pane-vpa'),
                    apps: document.getElementById('pane-apps')
                };

                tabBtns.forEach(btn => {
                    btn.addEventListener('click', () => {
                        const target = btn.dataset.tab;
                        tabBtns.forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        Object.values(tabPanes).forEach(p => p.classList.remove('active'));
                        if (tabPanes[target]) tabPanes[target].classList.add('active');
                    });
                });

                // VPA Quick Suffix Chips
                const vpaInput = document.getElementById('upi-vpa-input');
                backdrop.querySelectorAll('.upi-chip').forEach(chip => {
                    chip.addEventListener('click', () => {
                        const base = (vpaInput.value.split('@')[0] || 'student').trim();
                        vpaInput.value = base + chip.dataset.suffix;
                    });
                });

                // Close / Cancel Handler
                function closeModal() {
                    clearInterval(timerInterval);
                    backdrop.classList.remove('active');
                    setTimeout(() => {
                        backdrop.remove();
                    }, 350);
                }

                document.getElementById('upi-btn-cancel').onclick = () => {
                    if (confirm("Are you sure you want to cancel the payment?")) {
                        closeModal();
                        reject(new Error("PAYMENT_CANCELLED"));
                    }
                };

                // VPA Collect Flow
                const sendCollectBtn = document.getElementById('upi-btn-send-collect');
                const vpaPendingBox = document.getElementById('upi-vpa-pending-box');
                const vpaInputGroup = document.getElementById('upi-vpa-input-group');

                sendCollectBtn.onclick = () => {
                    const vpaVal = vpaInput.value.trim();
                    if (!vpaVal.includes('@') || vpaVal.length < 5) {
                        alert("Please enter a valid UPI ID (e.g. yourname@okhdfcbank)");
                        return;
                    }
                    sendCollectBtn.style.display = 'none';
                    vpaInputGroup.style.display = 'none';
                    vpaPendingBox.style.display = 'block';
                };

                document.getElementById('upi-btn-approve-collect').onclick = () => {
                    triggerSimulationFlow('upi_collect', vpaInput.value.trim());
                };

                // App Intent Flow
                backdrop.querySelectorAll('.upi-app-card').forEach(card => {
                    card.addEventListener('click', () => {
                        const app = card.dataset.app;
                        triggerSimulationFlow('upi_intent', app);
                    });
                });

                // QR Flow Simulation Button
                document.getElementById('upi-btn-simulate-qr').onclick = () => {
                    triggerSimulationFlow('upi_qr', 'Scan & Pay');
                };

                // The Realistic Multi-Step Simulation Flow
                function triggerSimulationFlow(methodType, methodDetail) {
                    // Hide tabs & standard views
                    document.getElementById('upi-tab-bar').style.display = 'none';
                    Object.values(tabPanes).forEach(p => p.classList.remove('active'));

                    // Show Processing Stepper
                    const processingView = document.getElementById('upi-processing-view');
                    processingView.classList.add('active');

                    const step1 = document.getElementById('step-1');
                    const step2 = document.getElementById('step-2');
                    const step3 = document.getElementById('step-3');

                    // Step 1: Mobile App Authorization (500ms)
                    setTimeout(() => {
                        step1.className = 'upi-step-item completed';
                        step1.querySelector('.upi-step-icon').innerHTML = '<i class="ph-bold ph-check"></i>';
                        step2.className = 'upi-step-item active';

                        // Step 2: NPCI UPI Switch (700ms)
                        setTimeout(() => {
                            step2.className = 'upi-step-item completed';
                            step2.querySelector('.upi-step-icon').innerHTML = '<i class="ph-bold ph-check"></i>';
                            step3.className = 'upi-step-item active';

                            // Step 3: Bank Settlement (600ms)
                            setTimeout(() => {
                                step3.className = 'upi-step-item completed';
                                step3.querySelector('.upi-step-icon').innerHTML = '<i class="ph-bold ph-check"></i>';

                                // Complete payment!
                                finalizeSuccess(methodType, methodDetail);
                            }, 600);
                        }, 700);
                    }, 500);
                }

                function finalizeSuccess(methodType, methodDetail) {
                    clearInterval(timerInterval);
                    const utr = generateUtrNumber();
                    const now = new Date();
                    const formattedDate = now.toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                    });

                    // Play audio chime!
                    playUpiSuccessChime();

                    // Hide processing view
                    const processingView = document.getElementById('upi-processing-view');
                    processingView.classList.remove('active');

                    // Show Success Screen
                    const successView = document.getElementById('upi-success-view');
                    successView.classList.add('active');

                    document.getElementById('receipt-utr').textContent = utr;
                    document.getElementById('receipt-time').textContent = formattedDate;

                    const resultData = {
                        status: 'SUCCESS',
                        utr: utr,
                        method: methodType,
                        methodDetail: methodDetail,
                        amount: amount,
                        timestamp: now.toISOString()
                    };

                    let autoResolved = false;

                    const done = () => {
                        if (autoResolved) return;
                        autoResolved = true;
                        closeModal();
                        resolve(resultData);
                    };

                    // Complete Order button click
                    document.getElementById('upi-btn-continue').onclick = done;

                    // Or automatically proceed smoothly after 2.8 seconds
                    setTimeout(done, 2800);
                }
            });
        }
    };

    // Expose globally
    window.UpiGateway = UpiGateway;

})(window);
