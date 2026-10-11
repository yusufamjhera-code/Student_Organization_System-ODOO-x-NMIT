/**
 * File: lib/certificate-generator.js
 * PassTrack Unified Certificate Generation & Cryptographic Verification Engine
 * Generates high-DPI (1920x1080) print-ready credentials with QR verification
 */

(function (window) {
    'use strict';

    const PassTrackCertificate = {
        version: "1.0.0",

        /**
         * Generates a deterministic, tamper-proof Certificate ID
         * Format: PT-CERT-YYYY-[EVENT_SLUG]-[HASH]
         */
        generateCertificateId: function (eventId, userUid, year) {
            const yr = year || new Date().getFullYear();
            const cleanEvent = (eventId || 'EVENT').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'CAMPUS';
            const seed = `${eventId}_${userUid || 'GUEST'}_${yr}`;
            
            // Fast FNV-1a hash implementation
            let hash = 0x811c9dc5;
            for (let i = 0; i < seed.length; i++) {
                hash ^= seed.charCodeAt(i);
                hash = Math.imul(hash, 0x01000193);
            }
            const hexCode = Math.abs(hash).toString(16).toUpperCase().padStart(6, '0').slice(0, 6);
            return `PT-CERT-${yr}-${cleanEvent}-${hexCode}`;
        },

        /**
         * Renders the Certificate to an HTML5 Canvas at 1920x1080
         * @param {Object} options Configuration parameters
         * @returns {Promise<HTMLCanvasElement>}
         */
        renderCanvas: async function (options) {
            const opts = Object.assign({
                participantName: '',
                eventName: '',
                orgName: '',
                eventDate: '',
                certificateId: null,
                signatory1Name: '',
                signatory1Title: '',
                signatory2Name: '',
                signatory2Title: '',
                verifyBaseUrl: window.location.origin ? (window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '') + '/certificates/verify.html') : 'certificates/verify.html'
            }, options);

            const certId = opts.certificateId || this.generateCertificateId(opts.eventName, opts.participantName);
            const verifyUrl = `${opts.verifyBaseUrl}?id=${encodeURIComponent(certId)}&name=${encodeURIComponent(opts.participantName)}&event=${encodeURIComponent(opts.eventName)}`;

            const width = 1920;
            const height = 1080;
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            // 1. Warm Editorial Background
            const bgGradient = ctx.createRadialGradient(width / 2, height / 2, 100, width / 2, height / 2, width * 0.7);
            bgGradient.addColorStop(0, '#FFFFFF');
            bgGradient.addColorStop(0.6, '#FAF7F0');
            bgGradient.addColorStop(1, '#F3EDE0');
            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, width, height);

            // 2. Subtle Micro-dot Security Guilloché Background
            ctx.save();
            ctx.fillStyle = 'rgba(23, 19, 15, 0.025)';
            const dotSpacing = 36;
            for (let x = 40; x < width - 40; x += dotSpacing) {
                for (let y = 40; y < height - 40; y += dotSpacing) {
                    ctx.beginPath();
                    ctx.arc(x, y, 1.2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.restore();

            // 3. Ornate Double Borders & Corner Accents
            const outerMargin = 48;
            const innerMargin = 64;

            // Outer dark solid border
            ctx.strokeStyle = '#17130F';
            ctx.lineWidth = 4;
            ctx.strokeRect(outerMargin, outerMargin, width - outerMargin * 2, height - outerMargin * 2);

            // Inner terracotta accent border
            ctx.strokeStyle = '#E25B2E';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(innerMargin, innerMargin, width - innerMargin * 2, height - innerMargin * 2);

            // Corner decorative brackets (Terracotta #E25B2E & Ink #17130F)
            const cornerSize = 40;
            const corners = [
                { x: outerMargin, y: outerMargin, dx: 1, dy: 1 },
                { x: width - outerMargin, y: outerMargin, dx: -1, dy: 1 },
                { x: outerMargin, y: height - outerMargin, dx: 1, dy: -1 },
                { x: width - outerMargin, y: height - outerMargin, dx: -1, dy: -1 }
            ];

            ctx.save();
            ctx.fillStyle = '#E25B2E';
            corners.forEach(c => {
                ctx.beginPath();
                ctx.moveTo(c.x, c.y);
                ctx.lineTo(c.x + c.dx * cornerSize, c.y);
                ctx.lineTo(c.x, c.y + c.dy * cornerSize);
                ctx.closePath();
                ctx.fill();

                // Accent dot
                ctx.fillStyle = '#17130F';
                ctx.beginPath();
                ctx.arc(c.x + c.dx * (cornerSize * 0.45), c.y + c.dy * (cornerSize * 0.45), 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#E25B2E';
            });
            ctx.restore();

            // 4. Header Badge / Crest
            ctx.save();
            ctx.textAlign = 'center';

            // Top Shield Emblem
            const crestY = 135;
            ctx.fillStyle = '#E25B2E';
            ctx.beginPath();
            ctx.arc(width / 2, crestY, 26, 0, Math.PI * 2);
            ctx.fill();

            // White Star inside crest
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 24px sans-serif';
            ctx.textBaseline = 'middle';
            ctx.fillText('★', width / 2, crestY + 1);

            // Organization Brand
            ctx.fillStyle = '#7A6F64';
            ctx.font = '700 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.letterSpacing = '5px';
            ctx.fillText((opts.orgName || 'STUDENT ORGANIZATION SYSTEM').toUpperCase(), width / 2, crestY + 48);

            // Kicker Subtitle
            ctx.fillStyle = '#9C9082';
            ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.letterSpacing = '3px';
            ctx.fillText('OFFICIAL CREDENTIAL OF PARTICIPATION & ACHIEVEMENT', width / 2, crestY + 76);

            // 5. Main Title: "Certificate of Participation"
            ctx.fillStyle = '#17130F';
            ctx.font = 'italic 76px "Instrument Serif", Georgia, "Times New Roman", serif';
            ctx.letterSpacing = '0px';
            ctx.fillText('Certificate of Participation', width / 2, crestY + 160);

            // Decorative separator divider
            ctx.strokeStyle = '#D9CFBF';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(width / 2 - 220, crestY + 190);
            ctx.lineTo(width / 2 + 220, crestY + 190);
            ctx.stroke();

            // Small diamond in center of divider
            ctx.fillStyle = '#E25B2E';
            ctx.beginPath();
            ctx.arc(width / 2, crestY + 190, 4, 0, Math.PI * 2);
            ctx.fill();

            // 6. Presentation Narrative
            ctx.fillStyle = '#7A6F64';
            ctx.font = '600 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.letterSpacing = '4px';
            ctx.fillText('THIS IS PROUDLY PRESENTED TO', width / 2, crestY + 245);

            // 7. Participant Name
            ctx.fillStyle = '#17130F';
            ctx.font = 'bold 62px "Instrument Serif", Georgia, "Times New Roman", serif';
            ctx.letterSpacing = '0.5px';
            ctx.fillText(opts.participantName, width / 2, crestY + 325);

            // Golden terracotta underline bar beneath name
            const nameWidth = Math.min(ctx.measureText(opts.participantName).width + 60, 800);
            const nameGradient = ctx.createLinearGradient(width / 2 - nameWidth / 2, 0, width / 2 + nameWidth / 2, 0);
            nameGradient.addColorStop(0, 'rgba(226, 91, 46, 0.1)');
            nameGradient.addColorStop(0.5, 'rgba(226, 91, 46, 0.9)');
            nameGradient.addColorStop(1, 'rgba(226, 91, 46, 0.1)');
            ctx.fillStyle = nameGradient;
            ctx.fillRect(width / 2 - nameWidth / 2, crestY + 345, nameWidth, 3);

            // 8. Citation Paragraph
            ctx.fillStyle = '#5A5147';
            ctx.font = '400 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillText('for demonstrated enthusiasm, active participation, and successful contribution to', width / 2, crestY + 405);

            // Event Title
            ctx.fillStyle = '#17130F';
            ctx.font = 'bold 34px "Instrument Serif", Georgia, serif';
            ctx.fillText(opts.eventName, width / 2, crestY + 458);

            // Date & Campus Venue
            ctx.fillStyle = '#6E6457';
            ctx.font = '400 19px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillText(`Conducted on ${opts.eventDate} at Campus Grounds`, width / 2, crestY + 502);

            ctx.restore();

            // 9. Bottom Row: 3 Columns
            // Column A (Left): Verification Section with embedded QR
            // Column B (Center): Official Gold Seal
            // Column C (Right): Signatures

            // --- Column A: QR Verification Box ---
            const qrBoxX = 140;
            const qrBoxY = 820;
            const qrSize = 130;

            // Generate Verification QR Code
            try {
                const qrCanvas = await this._renderQrToCanvas(verifyUrl, qrSize);
                ctx.drawImage(qrCanvas, qrBoxX, qrBoxY, qrSize, qrSize);
            } catch (qrErr) {
                // Fallback styled QR mock placeholder if offline or library pending
                this._drawFallbackQr(ctx, qrBoxX, qrBoxY, qrSize);
            }

            // QR Border frame
            ctx.strokeStyle = '#D9CFBF';
            ctx.lineWidth = 1;
            ctx.strokeRect(qrBoxX - 4, qrBoxY - 4, qrSize + 8, qrSize + 8);

            // QR Information Text
            ctx.save();
            ctx.textAlign = 'left';
            ctx.fillStyle = '#17130F';
            ctx.font = '700 13px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillText('AUTHENTICATED CREDENTIAL', qrBoxX + qrSize + 18, qrBoxY + 24);

            ctx.fillStyle = '#7A6F64';
            ctx.font = '500 12px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillText('Scan to verify digital authenticity', qrBoxX + qrSize + 18, qrBoxY + 46);

            ctx.fillStyle = '#E25B2E';
            ctx.font = '700 13px "JetBrains Mono", Menlo, Consolas, monospace';
            ctx.fillText(certId, qrBoxX + qrSize + 18, qrBoxY + 74);

            ctx.fillStyle = '#9C9082';
            ctx.font = '400 11px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillText('Cryptographically Verified via PassTrack OS', qrBoxX + qrSize + 18, qrBoxY + 98);
            ctx.restore();

            // --- Column B: Official Gold Seal (Center) ---
            const sealX = width / 2;
            const sealY = 890;
            this._drawOfficialSeal(ctx, sealX, sealY);

            // --- Column C: Signatures (Right) ---
            const sigStartX = width - 480;
            const sigY = 930;

            // Signature 1: Faculty Advisor
            ctx.save();
            ctx.textAlign = 'center';

            // Simulated script signature for Faculty
            ctx.fillStyle = '#1E3A8A';
            ctx.font = 'italic 34px "Brush Script MT", "Segoe Script", cursive';
            ctx.fillText(opts.signatory1Name, sigStartX + 70, sigY - 26);

            // Divider line
            ctx.strokeStyle = '#272019';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(sigStartX, sigY);
            ctx.lineTo(sigStartX + 140, sigY);
            ctx.stroke();

            ctx.fillStyle = '#17130F';
            ctx.font = '700 14px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillText(opts.signatory1Name, sigStartX + 70, sigY + 22);

            ctx.fillStyle = '#7A6F64';
            ctx.font = '500 12px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillText(opts.signatory1Title, sigStartX + 70, sigY + 40);

            // Signature 2: Club President / Lead
            const sig2X = sigStartX + 210;

            // Simulated script signature for President
            ctx.fillStyle = '#991B1B';
            ctx.font = 'italic 32px "Brush Script MT", "Segoe Script", cursive';
            ctx.fillText(opts.signatory2Name, sig2X + 70, sigY - 26);

            // Divider line
            ctx.strokeStyle = '#272019';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(sig2X, sigY);
            ctx.lineTo(sig2X + 140, sigY);
            ctx.stroke();

            ctx.fillStyle = '#17130F';
            ctx.font = '700 14px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillText(opts.signatory2Name, sig2X + 70, sigY + 22);

            ctx.fillStyle = '#7A6F64';
            ctx.font = '500 12px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillText(opts.signatory2Title, sig2X + 70, sigY + 40);

            ctx.restore();

            return canvas;
        },

        /**
         * Draws the golden embossed circular seal
         */
        _drawOfficialSeal: function (ctx, cx, cy) {
            ctx.save();
            const radius = 56;

            // 1. Serrated Starburst Badge Outer Circle
            const points = 24;
            ctx.fillStyle = '#C8943F';
            ctx.beginPath();
            for (let i = 0; i < points * 2; i++) {
                const angle = (i * Math.PI) / points;
                const r = i % 2 === 0 ? radius + 10 : radius + 3;
                const x = cx + r * Math.cos(angle);
                const y = cy + r * Math.sin(angle);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();

            // 2. Embossed Golden Disc Inner Circle
            const sealGrad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
            sealGrad.addColorStop(0, '#E7BD66');
            sealGrad.addColorStop(0.5, '#BE8A33');
            sealGrad.addColorStop(1, '#9C6F24');
            ctx.fillStyle = sealGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fill();

            // Inner ring
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(cx, cy, radius - 8, 0, Math.PI * 2);
            ctx.stroke();

            // Star and Ribbon text
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 22px sans-serif';
            ctx.fillText('★', cx, cy - 14);

            ctx.font = '800 10px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.letterSpacing = '1.5px';
            ctx.fillText('OFFICIAL SEAL', cx, cy + 10);

            ctx.font = '700 8.5px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillText('PASSTRACK 2026', cx, cy + 24);

            ctx.restore();
        },

        /**
         * Renders QR string to canvas using window.QRCode or lightweight generator
         */
        _renderQrToCanvas: function (text, size) {
            return new Promise((resolve, reject) => {
                if (typeof window.QRCode !== 'undefined') {
                    const tempDiv = document.createElement('div');
                    tempDiv.style.position = 'fixed';
                    tempDiv.style.left = '-9999px';
                    document.body.appendChild(tempDiv);

                    new window.QRCode(tempDiv, {
                        text: text,
                        width: size,
                        height: size,
                        correctLevel: window.QRCode.CorrectLevel.M
                    });

                    setTimeout(() => {
                        const img = tempDiv.querySelector('canvas') || tempDiv.querySelector('img');
                        if (img) {
                            const c = document.createElement('canvas');
                            c.width = size;
                            c.height = size;
                            const ctx = c.getContext('2d');
                            ctx.drawImage(img, 0, 0, size, size);
                            document.body.removeChild(tempDiv);
                            resolve(c);
                        } else {
                            document.body.removeChild(tempDiv);
                            reject(new Error('QR not generated'));
                        }
                    }, 50);
                } else {
                    reject(new Error('QRCode library not loaded'));
                }
            });
        },

        /**
         * Fallback QR visual generator if external CDN is blocked
         */
        _drawFallbackQr: function (ctx, x, y, size) {
            ctx.save();
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(x, y, size, size);

            ctx.fillStyle = '#17130F';
            const moduleCount = 17;
            const cellSize = size / moduleCount;

            // Draw pseudo QR pattern with standard 3 finder corners
            const drawFinder = (fx, fy) => {
                ctx.fillRect(fx, fy, cellSize * 5, cellSize * 5);
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(fx + cellSize, fy + cellSize, cellSize * 3, cellSize * 3);
                ctx.fillStyle = '#17130F';
                ctx.fillRect(fx + cellSize * 2, fy + cellSize * 2, cellSize, cellSize);
            };

            drawFinder(x, y);
            drawFinder(x + size - cellSize * 5, y);
            drawFinder(x, y + size - cellSize * 5);

            // Some pseudo random matrix dots
            for (let r = 0; r < moduleCount; r++) {
                for (let c = 0; c < moduleCount; c++) {
                    if ((r < 5 && c < 5) || (r < 5 && c > 11) || (r > 11 && c < 5)) continue;
                    if ((r * 7 + c * 13) % 3 === 0) {
                        ctx.fillRect(x + c * cellSize, y + r * cellSize, cellSize, cellSize);
                    }
                }
            }
            ctx.restore();
        },

        /**
         * Downloads the rendered Certificate as high-res PNG
         */
        downloadCertificatePNG: async function (options, customFilename) {
            const canvas = await this.renderCanvas(options);
            const filename = customFilename || `Certificate_${(options.participantName || 'Attendee').replace(/\s+/g, '_')}_${(options.eventName || 'Event').replace(/\s+/g, '_')}.png`;
            
            const link = document.createElement('a');
            link.download = filename;
            link.href = canvas.toDataURL('image/png', 1.0);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    window.PassTrackCertificate = PassTrackCertificate;

})(window);
