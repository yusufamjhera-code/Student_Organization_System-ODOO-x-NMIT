// File: tasks/board.js
document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const firestore = db;
    
    const orgNameMeta = document.getElementById('org-name-meta');
    const modal = document.getElementById('task-modal');
    const form = document.getElementById('task-form');
    const titleInput = document.getElementById('task-title');
    const descInput = document.getElementById('task-desc');
    const assigneeInput = document.getElementById('task-assignee');
    const dueInput = document.getElementById('task-due');
    const statusSelect = document.getElementById('task-status');
    const deleteBtn = document.getElementById('delete-task-btn');
    const saveBtn = document.getElementById('save-task-btn');
    
    let currentOrgId = null;
    let tasksData = [];
    let editDocId = null;

    // --- AUTH GUARD ---
    auth.onAuthStateChanged(async (user) => {
        if (!user || sessionStorage.getItem('authType') !== 'admin') {
            window.location.href = '../index.html';
            return;
        }
        try {
            const orgsSnapshot = await firestore.collection('organizations').where('ownerId', '==', user.uid).get();
            if (orgsSnapshot.empty) {
                showToast('Organization not found.', 'error');
                return;
            }
            const orgDoc = orgsSnapshot.docs[0];
            currentOrgId = orgDoc.id;
            orgNameMeta.textContent = orgDoc.data().name;
            setupRealtimeListeners();
        } catch (error) {
            console.error(error);
        }
    });

    // --- REAL-TIME DATA ---
    function setupRealtimeListeners() {
        firestore.collection('tasks')
            .where('orgId', '==', currentOrgId)
            .onSnapshot(snapshot => {
                tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderKanban();
            }, error => console.error(error));
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
            counts[status]++;
            
            const isOverdue = task.dueDate && task.dueDate < todayStr && status !== 'done';
            const dueClass = isOverdue ? 'overdue' : '';
            const dueIcon = isOverdue ? 'ph-warning-circle' : 'ph-calendar-blank';

            const el = document.createElement('div');
            el.className = 'task-card';
            el.draggable = true;
            el.dataset.id = task.id;
            
            el.innerHTML = `
                <h4 class="task-title">${task.title}</h4>
                ${task.description ? `<div class="task-desc">${task.description}</div>` : ''}
                <div class="task-meta">
                    <div class="task-assignee">
                        <i class="ph-bold ph-user-circle"></i>
                        <span>${task.assignee || 'Unassigned'}</span>
                    </div>
                    ${task.dueDate ? `
                    <div class="task-due ${dueClass}">
                        <i class="ph-bold ${dueIcon}"></i>
                        <span>${new Date(task.dueDate).toLocaleDateString()}</span>
                    </div>` : ''}
                </div>
            `;
            
            // Edit on click
            el.onclick = (e) => {
                if (e.target.closest('.task-card')) openEditModal(task);
            };

            // Drag events
            el.addEventListener('dragstart', handleDragStart);
            el.addEventListener('dragend', handleDragEnd);
            
            if (cols[status]) {
                cols[status].appendChild(el);
            }
        });
        
        document.getElementById('count-todo').textContent = counts.todo;
        document.getElementById('count-inprogress').textContent = counts.inprogress;
        document.getElementById('count-done').textContent = counts.done;
    }

    // --- DRAG AND DROP ---
    let draggedElement = null;

    function handleDragStart(e) {
        draggedElement = this;
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => this.style.opacity = '0.5', 0);
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
                // Optimistic UI update could go here
                try {
                    await firestore.collection('tasks').doc(taskId).update({
                        status: newStatus,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } catch(err) {
                    showToast('Failed to update status', 'error');
                }
            }
        });
    });

    // --- ACTIONS ---
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
        titleInput.value = task.title;
        descInput.value = task.description || '';
        assigneeInput.value = task.assignee || '';
        dueInput.value = task.dueDate || '';
        statusSelect.value = task.status || 'todo';
        
        document.getElementById('task-modal-title').textContent = 'Edit Task';
        deleteBtn.style.display = 'block';
        saveBtn.innerHTML = '<i class="ph-bold ph-check"></i> <span>Save Changes</span>';
        modal.classList.add('active');
    }

    form.onsubmit = async (e) => {
        e.preventDefault();

        const data = {
            orgId: currentOrgId,
            title: titleInput.value.trim(),
            description: descInput.value.trim(),
            assignee: assigneeInput.value.trim(),
            dueDate: dueInput.value,
            status: statusSelect.value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Validation (Task 3.5)
        if (data.title.length < 2) {
            showToast('Task title must be at least 2 characters.', 'error');
            return;
        }

        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i>';

        try {
            if (editDocId) {
                await firestore.collection('tasks').doc(editDocId).update(data);
                showToast('Task updated', 'success');
            } else {
                data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await firestore.collection('tasks').add(data);
                showToast('Task added', 'success');
            }
            modal.classList.remove('active');
        } catch (err) {
            console.error(err);
            showToast('Failed to save task', 'error');
        } finally {
            saveBtn.disabled = false;
        }
    };

    deleteBtn.onclick = async () => {
        if (!editDocId) return;
        if (!confirm('Delete this task?')) return;
        try {
            await firestore.collection('tasks').doc(editDocId).delete();
            showToast('Task deleted', 'success');
            modal.classList.remove('active');
        } catch(err) {
            showToast('Failed to delete', 'error');
        }
    };

    function showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icon = type === 'success' ? 'ph-check-circle' : (type === 'error' ? 'ph-x-circle' : 'ph-info');
        toast.innerHTML = `<i class="ph-bold ${icon}"></i> <span>${message}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
});
