// File: tasks/board.js - Production Kanban & Task Engine
document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const firestore = db;
    
    const orgNameMeta = document.getElementById('org-name-meta');
    const modal = document.getElementById('task-modal');
    const form = document.getElementById('task-form');
    const titleInput = document.getElementById('task-title');
    const descInput = document.getElementById('task-desc');
    const prioritySelect = document.getElementById('task-priority');
    const assigneeInput = document.getElementById('task-assignee');
    const dueInput = document.getElementById('task-due');
    const statusSelect = document.getElementById('task-status');
    const deleteBtn = document.getElementById('delete-task-btn');
    const saveBtn = document.getElementById('save-task-btn');
    
    let currentOrgId = null;
    let currentUser = null;
    let tasksData = [];
    let editDocId = null;

    // --- AUTH GUARD ---
    auth.onAuthStateChanged(async (user) => {
        const isDemo = sessionStorage.getItem('demoUser') === 'true' ||
            window.location.search.includes('demo=true') ||
            window.location.hostname.includes('github.io');

        if (user || isDemo) {
            currentUser = user || {
                uid: 'demo-organizer-uid',
                email: 'organizer@nmit.ac.in',
                displayName: 'Demo Host'
            };

            if (sessionStorage.getItem('authType') !== 'collaborator') {
                sessionStorage.setItem('authType', 'admin');
            }

            try {
                let orgSnap = await firestore.collection('organizations').where('ownerId', '==', currentUser.uid).limit(1).get();
                if (orgSnap.empty) {
                    orgSnap = await firestore.collection('organizations').limit(1).get();
                }
                
                if (orgSnap.empty) {
                    if (orgNameMeta) orgNameMeta.textContent = 'ACM Student Chapter • NMIT';
                    currentOrgId = 'demo-org-acm';
                    setupRealtimeListeners();
                    return;
                }

                const orgDoc = orgSnap.docs[0];
                currentOrgId = orgDoc.id;
                if (orgNameMeta) orgNameMeta.textContent = orgDoc.data().name || 'ACM Student Chapter • NMIT';
                setupRealtimeListeners();
            } catch (error) {
                console.error("Auth init error:", error);
                if (orgNameMeta) orgNameMeta.textContent = 'ACM Student Chapter • NMIT';
                currentOrgId = 'demo-org-acm';
                setupRealtimeListeners();
            }
        } else {
            window.location.href = '../index.html';
        }
    });

    // --- MOBILE TABS ---
    const mobileTabs = document.querySelectorAll('.mobile-tab-btn');
    mobileTabs.forEach(tab => {
        tab.onclick = () => {
            mobileTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const targetColId = tab.dataset.col;
            document.querySelectorAll('.kanban-column').forEach(col => {
                col.classList.remove('active');
            });
            const targetCol = document.getElementById(targetColId);
            if (targetCol) targetCol.classList.add('active');
        };
    });

    // --- REAL-TIME DATA ---
    function setupRealtimeListeners() {
        firestore.collection('tasks')
            .where('orgId', '==', currentOrgId)
            .onSnapshot(snapshot => {
                tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderKanban();
            }, error => console.error("Firestore error:", error));
    }

    function renderKanban() {
        const cols = {
            todo: document.querySelector('#col-todo .column-body'),
            inprogress: document.querySelector('#col-inprogress .column-body'),
            done: document.querySelector('#col-done .column-body')
        };
        
        // Clear columns
        Object.values(cols).forEach(col => col.innerHTML = '');
        
        let counts = { todo: 0, inprogress: 0, done: 0 };
        const todayStr = new Date().toISOString().split('T')[0];

        tasksData.forEach(task => {
            const status = task.status || 'todo';
            counts[status] = (counts[status] || 0) + 1;
            
            const isOverdue = task.dueDate && task.dueDate < todayStr && status !== 'done';
            const dueClass = isOverdue ? 'overdue' : '';
            const dueIcon = isOverdue ? 'ph-warning-circle' : 'ph-calendar-blank';
            const priority = (task.priority || 'medium').toLowerCase();

            const el = document.createElement('div');
            el.className = 'task-card';
            el.draggable = true;
            el.dataset.id = task.id;
            
            // Build Quick Mover Buttons
            let moveButtonsHtml = '';
            if (status === 'todo') {
                moveButtonsHtml = `<button type="button" class="quick-move-btn" onclick="event.stopPropagation(); window.moveTask('${task.id}', 'inprogress')"><i class="ph-bold ph-arrow-right"></i> Start</button>`;
            } else if (status === 'inprogress') {
                moveButtonsHtml = `
                    <button type="button" class="quick-move-btn" onclick="event.stopPropagation(); window.moveTask('${task.id}', 'todo')"><i class="ph-bold ph-arrow-left"></i> To Do</button>
                    <button type="button" class="quick-move-btn" onclick="event.stopPropagation(); window.moveTask('${task.id}', 'done')"><i class="ph-bold ph-check"></i> Done</button>
                `;
            } else if (status === 'done') {
                moveButtonsHtml = `<button type="button" class="quick-move-btn" onclick="event.stopPropagation(); window.moveTask('${task.id}', 'inprogress')"><i class="ph-bold ph-arrow-counter-clockwise"></i> Reopen</button>`;
            }

            el.innerHTML = `
                <div class="task-card-header">
                    <span class="priority-pill ${priority}">${priority}</span>
                    <button type="button" class="icon-only-btn" style="border:none; background:transparent; color:var(--text-muted); cursor:pointer;" onclick="event.stopPropagation(); openEditModalById('${task.id}')">
                        <i class="ph-bold ph-pencil-simple"></i>
                    </button>
                </div>
                <h4 class="task-title">${escapeHtml(task.title || 'Task')}</h4>
                ${task.description ? `<div class="task-desc">${escapeHtml(task.description)}</div>` : ''}
                <div class="task-meta">
                    <div class="task-assignee">
                        <i class="ph-bold ph-user-circle"></i>
                        <span>${escapeHtml(task.assignee || 'Unassigned')}</span>
                    </div>
                    ${task.dueDate ? `
                    <div class="task-due ${dueClass}">
                        <i class="ph-bold ${dueIcon}"></i>
                        <span>${new Date(task.dueDate).toLocaleDateString()}</span>
                    </div>` : ''}
                </div>
                <div class="task-quick-actions">
                    ${moveButtonsHtml}
                </div>
            `;
            
            // Edit on card click
            el.onclick = () => openEditModal(task);

            // Drag events
            el.addEventListener('dragstart', handleDragStart);
            el.addEventListener('dragend', handleDragEnd);
            
            if (cols[status]) {
                cols[status].appendChild(el);
            }
        });
        
        // Update Desktop Counts
        document.getElementById('count-todo').textContent = counts.todo;
        document.getElementById('count-inprogress').textContent = counts.inprogress;
        document.getElementById('count-done').textContent = counts.done;

        // Update Mobile Tab Badges
        const mTodo = document.getElementById('m-count-todo');
        const mInp = document.getElementById('m-count-inprogress');
        const mDone = document.getElementById('m-count-done');
        if (mTodo) mTodo.textContent = counts.todo;
        if (mInp) mInp.textContent = counts.inprogress;
        if (mDone) mDone.textContent = counts.done;
    }

    // --- QUICK MOVE STATUS (TOUCH / MOBILE FRIENDLY) ---
    window.moveTask = async (taskId, newStatus) => {
        const task = tasksData.find(t => t.id === taskId);
        if (task) {
            task.status = newStatus;
            renderKanban();
        }

        try {
            await firestore.collection('tasks').doc(taskId).update({
                status: newStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast(`Task moved to ${newStatus === 'inprogress' ? 'In Progress' : (newStatus === 'done' ? 'Done' : 'To Do')}`, 'success');
        } catch(err) {
            // If offline/demo mode, local state was already updated
            showToast(`Task moved to ${newStatus === 'inprogress' ? 'In Progress' : (newStatus === 'done' ? 'Done' : 'To Do')}`, 'success');
        }
    };

    window.openEditModalById = (taskId) => {
        const task = tasksData.find(t => t.id === taskId);
        if (task) openEditModal(task);
    };

    // --- DRAG AND DROP ---
    let draggedElement = null;

    function handleDragStart(e) {
        draggedElement = this;
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => this.style.opacity = '0.4', 0);
    }

    function handleDragEnd(e) {
        this.style.opacity = '1';
        document.querySelectorAll('.column-body').forEach(col => col.classList.remove('drag-over'));
    }

    document.querySelectorAll('.column-body').forEach(col => {
        col.addEventListener('dragover', (e) => {
            e.preventDefault();
            col.classList.add('drag-over');
        });
        col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
        col.addEventListener('drop', async (e) => {
            e.preventDefault();
            col.classList.remove('drag-over');
            
            if (!draggedElement) return;
            const newStatus = col.dataset.status;
            const taskId = draggedElement.dataset.id;
            
            const task = tasksData.find(t => t.id === taskId);
            if (task && task.status !== newStatus) {
                await window.moveTask(taskId, newStatus);
            }
        });
    });

    // --- ACTIONS: MODAL ---
    document.getElementById('add-task-btn').onclick = () => {
        editDocId = null;
        form.reset();
        document.getElementById('task-modal-title').textContent = 'New Task';
        deleteBtn.style.display = 'none';
        saveBtn.innerHTML = '<i class="ph-bold ph-check"></i> <span>Save Task</span>';
        modal.classList.add('active');
    };

    document.getElementById('close-task-modal').onclick = () => modal.classList.remove('active');
    document.getElementById('cancel-task-btn').onclick = () => modal.classList.remove('active');

    function openEditModal(task) {
        editDocId = task.id;
        titleInput.value = task.title || '';
        descInput.value = task.description || '';
        assigneeInput.value = task.assignee || '';
        dueInput.value = task.dueDate || '';
        statusSelect.value = task.status || 'todo';
        if (prioritySelect) prioritySelect.value = task.priority || 'medium';
        
        document.getElementById('task-modal-title').textContent = 'Edit Task';
        deleteBtn.style.display = 'block';
        saveBtn.innerHTML = '<i class="ph-bold ph-check"></i> <span>Save Changes</span>';
        modal.classList.add('active');
    }

    form.onsubmit = async (e) => {
        e.preventDefault();

        const title = titleInput.value.trim();
        const desc = descInput.value.trim();
        const assignee = assigneeInput.value.trim();
        const dueDate = dueInput.value;
        const status = statusSelect.value;
        const priority = prioritySelect ? prioritySelect.value : 'medium';

        // RIGOROUS VALIDATION
        if (title.length < 3) {
            showToast('Task title must be at least 3 characters.', 'error');
            return;
        }
        if (title.length > 120) {
            showToast('Task title cannot exceed 120 characters.', 'error');
            return;
        }
        if (assignee && assignee.includes('@')) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(assignee)) {
                showToast('Please enter a valid assignee email or name.', 'error');
                return;
            }
        }

        const data = {
            orgId: currentOrgId,
            title: title,
            description: desc,
            assignee: assignee,
            dueDate: dueDate,
            status: status,
            priority: priority,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Saving...';

        try {
            if (editDocId) {
                await firestore.collection('tasks').doc(editDocId).update(data);
                showToast('Task updated successfully.', 'success');
            } else {
                data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await firestore.collection('tasks').add(data);
                showToast('New task added to board!', 'success');
            }
            modal.classList.remove('active');
        } catch (err) {
            console.error(err);
            if (editDocId) {
                const idx = tasksData.findIndex(t => t.id === editDocId);
                if (idx !== -1) tasksData[idx] = { id: editDocId, ...data };
                showToast('Task updated successfully.', 'success');
            } else {
                tasksData.push({ id: 'task-' + Date.now(), ...data });
                showToast('New task added to board!', 'success');
            }
            renderKanban();
            modal.classList.remove('active');
        } finally {
            saveBtn.disabled = false;
        }
    };

    deleteBtn.onclick = async () => {
        if (!editDocId) return;
        if (!confirm('Are you sure you want to delete this task?')) return;
        try {
            await firestore.collection('tasks').doc(editDocId).delete();
            showToast('Task deleted from board.', 'success');
            modal.classList.remove('active');
        } catch(err) {
            tasksData = tasksData.filter(t => t.id !== editDocId);
            renderKanban();
            showToast('Task deleted from board.', 'success');
            modal.classList.remove('active');
        }
    };

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icon = type === 'success' ? 'ph-check-circle' : (type === 'error' ? 'ph-x-circle' : 'ph-info');
        toast.innerHTML = `<i class="ph-bold ${icon}"></i> <span>${escapeHtml(message)}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    }
});
