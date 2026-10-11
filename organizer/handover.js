// File: organizer/handover.js - Executive Transition Dossier Aggregator
document.addEventListener('DOMContentLoaded', async () => {
    const auth = firebase.auth();
    const firestore = db;

    // Elements
    const yearSelect = document.getElementById('handover-year-select');
    const refreshBtn = document.getElementById('refresh-data-btn');
    const exportJsonBtn = document.getElementById('export-json-btn');
    const printBtn = document.getElementById('print-dossier-btn');

    // KPI Elements
    const kpiAttendees = document.getElementById('kpi-total-attendees');
    const kpiGrossRevenue = document.getElementById('kpi-gross-revenue');
    const kpiTotalExpenses = document.getElementById('kpi-total-expenses');
    const kpiNetSurplus = document.getElementById('kpi-net-surplus');

    // Tables
    const eventsTableBody = document.getElementById('events-table-body');
    const reimbursementsTableBody = document.getElementById('reimbursements-table-body');
    const membersTableBody = document.getElementById('members-table-body');

    // Income / Expense breakdown elements
    const incomeTicketsEl = document.getElementById('income-tickets');
    const incomeMerchEl = document.getElementById('income-merch');
    const incomeDuesEl = document.getElementById('income-dues');
    const incomeTotalEl = document.getElementById('income-total');
    const expenseReimbursementsEl = document.getElementById('expense-reimbursements');
    const expenseTotalEl = document.getElementById('expense-total');

    let currentOrgId = 'demo-org-acm';
    let dossierData = null;

    // Default Seed Dataset
    const DEMO_HANDOVER_DATA = {
        organization: 'ACM Student Chapter • NMIT',
        academicYear: '2025 – 2026',
        kpis: {
            totalAttendees: 520,
            grossRevenue: 140500,
            totalExpenses: 30500,
            netSurplus: 110000
        },
        events: [
            {
                name: 'HackNMIT 2026 Annual Hackathon',
                date: '2026-03-28',
                capacity: 300,
                sold: 285,
                turnout: '95%',
                revenue: 84000
            },
            {
                name: 'Open Source Developer Summit',
                date: '2026-04-15',
                capacity: 150,
                sold: 140,
                turnout: '93%',
                revenue: 35000
            },
            {
                name: 'AI & Neural Networks Hands-on Series',
                date: '2025-11-20',
                capacity: 65,
                sold: 65,
                turnout: '100%',
                revenue: 12500
            },
            {
                name: 'Freshmen Club Orientation & Welcome',
                date: '2025-09-05',
                capacity: 120,
                sold: 110,
                turnout: '92%',
                revenue: 9000
            }
        ],
        financials: {
            income: {
                tickets: 84000,
                merchandise: 24500,
                dues: 32000,
                total: 140500
            },
            expenses: {
                venue: 18000,
                hospitality: 12500,
                reimbursements: 1450,
                total: 31950
            }
        },
        reimbursements: [
            {
                id: 'claim-101',
                claimant: 'Aarav Patel (aarav@okaxis)',
                event: 'HackNMIT 2026',
                merchant: 'Campus Cafeteria & Midnight Snacks',
                amount: 1450,
                status: 'Approved & Reimbursed'
            },
            {
                id: 'claim-102',
                claimant: 'Sanya Mir (sanya@paytm)',
                event: 'Open Source Summit',
                merchant: 'Badge Lanyards & Plastic Sleeves',
                amount: 680,
                status: 'Approved & Reimbursed'
            }
        ],
        members: [
            {
                name: 'Arjun Nambiar',
                usn: '1NT23CS042',
                dept: 'Computer Science',
                role: 'President & Outgoing Lead',
                status: 'Active',
                expiry: '2026-07-31'
            },
            {
                name: 'Ananya Sharma',
                usn: '1NT23IS019',
                dept: 'Information Science',
                role: 'Incoming President & Tech Lead',
                status: 'Active',
                expiry: '2026-07-31'
            },
            {
                name: 'Karthik Hegde',
                usn: '1NT23EC088',
                dept: 'Electronics & Comm.',
                role: 'Outgoing Treasury Lead',
                status: 'Active',
                expiry: '2026-07-31'
            },
            {
                name: 'Pooja Kulkarni',
                usn: '1NT23CS112',
                dept: 'Computer Science',
                role: 'Incoming Vice President',
                status: 'Active',
                expiry: '2026-07-31'
            },
            {
                name: 'Vikramaditya Rao',
                usn: '1NT20CS099',
                dept: 'Computer Science',
                role: 'Alumni Advisor & Mentor',
                status: 'Alumni',
                expiry: '2027-12-31'
            }
        ]
    };

    // --- AGGREGATE LIVE DATA ---
    async function aggregateHandoverData() {
        dossierData = JSON.parse(JSON.stringify(DEMO_HANDOVER_DATA));

        // Incorporate dynamically created transactions from localStorage
        try {
            const localTxns = JSON.parse(localStorage.getItem('passtrack_treasury_txns') || '[]');
            if (localTxns.length > 0) {
                let dynamicIncome = 0;
                let dynamicExpense = 0;
                localTxns.forEach(t => {
                    const amt = Number(t.amount) || 0;
                    if (t.type === 'income') {
                        dynamicIncome += amt;
                        if (t.category === 'tickets') dossierData.financials.income.tickets += amt;
                        else if (t.category === 'merchandise') dossierData.financials.income.merchandise += amt;
                        else if (t.category === 'dues') dossierData.financials.income.dues += amt;
                    } else {
                        dynamicExpense += amt;
                    }
                });
                dossierData.financials.income.total += dynamicIncome;
                dossierData.financials.expenses.total += dynamicExpense;
                dossierData.kpis.grossRevenue = dossierData.financials.income.total;
                dossierData.kpis.totalExpenses = dossierData.financials.expenses.total;
                dossierData.kpis.netSurplus = dossierData.kpis.grossRevenue - dossierData.kpis.totalExpenses;
            }
        } catch(e) {}

        // Incorporate volunteer claims
        try {
            const localClaims = JSON.parse(localStorage.getItem('passtrack_volunteer_claims') || '[]');
            if (localClaims.length > 0) {
                const formatted = localClaims.map(c => ({
                    id: c.id,
                    claimant: `${c.claimantName} (${c.upiId || 'UPI'})`,
                    event: c.event || 'General Operations',
                    merchant: `${c.merchant || 'Expense'}: ${c.category || ''}`,
                    amount: Number(c.amount || 0),
                    status: (c.status || 'pending').toUpperCase()
                }));
                dossierData.reimbursements = [...formatted, ...dossierData.reimbursements].slice(0, 6);
            }
        } catch(e) {}

        renderDossier();
    }

    // --- RENDER DOSSIER UI ---
    function renderDossier() {
        if (!dossierData) return;

        // KPIs
        kpiAttendees.textContent = dossierData.kpis.totalAttendees.toLocaleString();
        kpiGrossRevenue.textContent = `₹${dossierData.kpis.grossRevenue.toLocaleString()}`;
        kpiTotalExpenses.textContent = `₹${dossierData.kpis.totalExpenses.toLocaleString()}`;
        kpiNetSurplus.textContent = `₹${dossierData.kpis.netSurplus.toLocaleString()}`;

        // Financials breakdown
        incomeTicketsEl.textContent = `₹${dossierData.financials.income.tickets.toLocaleString()}`;
        incomeMerchEl.textContent = `₹${dossierData.financials.income.merchandise.toLocaleString()}`;
        incomeDuesEl.textContent = `₹${dossierData.financials.income.dues.toLocaleString()}`;
        incomeTotalEl.textContent = `₹${dossierData.financials.income.total.toLocaleString()}`;
        expenseReimbursementsEl.textContent = `₹${dossierData.financials.expenses.reimbursements.toLocaleString()}`;
        expenseTotalEl.textContent = `₹${dossierData.financials.expenses.total.toLocaleString()}`;

        // Events Table
        eventsTableBody.innerHTML = '';
        dossierData.events.forEach(ev => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${ev.name}</strong></td>
                <td>${ev.date}</td>
                <td>${ev.capacity}</td>
                <td>${ev.sold}</td>
                <td><span style="color:#059669; font-weight:700;">${ev.turnout}</span></td>
                <td><strong>₹${Number(ev.revenue).toLocaleString()}</strong></td>
            `;
            eventsTableBody.appendChild(tr);
        });

        // Reimbursements Table
        reimbursementsTableBody.innerHTML = '';
        dossierData.reimbursements.forEach(r => {
            const tr = document.createElement('tr');
            const isApproved = (r.status || '').toLowerCase().includes('approved');
            tr.innerHTML = `
                <td><code>${r.id}</code></td>
                <td>${r.claimant}</td>
                <td>${r.event}</td>
                <td>${r.merchant}</td>
                <td><strong>₹${Number(r.amount).toLocaleString()}</strong></td>
                <td><span style="color:${isApproved ? '#059669' : '#d97706'}; font-weight:700;">✓ ${r.status}</span></td>
            `;
            reimbursementsTableBody.appendChild(tr);
        });

        // Members Table
        membersTableBody.innerHTML = '';
        dossierData.members.forEach(m => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${m.name}</strong></td>
                <td><code>${m.usn}</code></td>
                <td>${m.dept}</td>
                <td><span style="background:rgba(226,91,46,0.1); color:#e25b2e; padding:2px 8px; border-radius:6px; font-weight:700; font-size:0.75rem;">${m.role}</span></td>
                <td><span style="color:#059669; font-weight:700;">✓ Active / Paid</span></td>
                <td>${m.expiry}</td>
            `;
            membersTableBody.appendChild(tr);
        });
    }

    // --- BUTTON EVENT LISTENERS ---
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i class="ph-bold ph-spinner spin"></i> <span>Syncing...</span>';
            await aggregateHandoverData();
            setTimeout(() => {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = '<i class="ph-bold ph-arrows-clockwise"></i> <span>Sync Live Data</span>';
            }, 600);
        });
    }

    if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', () => {
            if (!dossierData) return;
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dossierData, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `PassTrack_Handover_Packet_${(dossierData.academicYear || '2025-2026').replace(/\s+/g, '_')}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        });
    }

    if (yearSelect) {
        yearSelect.addEventListener('change', (e) => {
            const year = e.target.value;
            const termEl = document.getElementById('dossier-term');
            if (termEl) termEl.textContent = `Academic Year ${year.replace('-', ' – ')}`;
            const stampDate = document.getElementById('stamp-date');
            if (stampDate) stampDate.textContent = year.startsWith('2024') ? 'MAY 2025' : 'OCTOBER 2026';
            aggregateHandoverData();
        });
    }

    // Initialize
    await aggregateHandoverData();
});
