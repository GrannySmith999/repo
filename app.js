// --- Application State & Data ---
// In a real app, this data would come from a server.
const appState = {
    currentUser: {
        name: 'JaneDoe',
        role: 'user', // Can be 'user' or 'admin'
    },
    balance: 125.50,
    tasks: [
        { id: 1, description: 'Transcribe a 1-minute audio clip', reward: 2.50 },
        { id: 2, description: 'Categorize 10 images', reward: 5.00 },
        { id: 3, description: 'Write a short product review', reward: 7.00 },
    ]
};

// --- DOM Element Selectors ---
const userInfo = document.getElementById('user-info');
const balanceEl = document.getElementById('current-balance');
const notificationList = document.getElementById('notification-list');
const taskList = document.getElementById('task-list');
const adminPanel = document.getElementById('admin-panel');

// --- UI Update Functions ---
function updateBalanceUI() {
    balanceEl.innerText = `$${appState.balance.toFixed(2)}`;
}

function addNotification(message, type = 'info') { // type can be 'info', 'success', 'error'
    const newNotification = document.createElement('div');
    newNotification.className = `notification ${type}`;
    const title = type.charAt(0).toUpperCase() + type.slice(1);
    newNotification.innerHTML = `<strong>${title}:</strong> ${message}`;
    notificationList.prepend(newNotification);
}

function renderTasks() {
    taskList.innerHTML = ''; // Clear existing tasks
    appState.tasks.forEach(task => {
        const taskEl = document.createElement('div');
        taskEl.className = 'task';
        taskEl.innerHTML = `
            <span>${task.description} (Reward: $${task.reward.toFixed(2)})</span>
            <button data-task-id="${task.id}">Complete Task</button>
        `;
        taskList.appendChild(taskEl);
    });
}

// --- Event Handlers ---
document.getElementById('withdraw-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = parseFloat(e.target.elements.amount.value);

    if (isNaN(amount) || amount <= 0) {
        return addNotification('Please enter a valid withdrawal amount.', 'error');
    }
    if (amount > appState.balance) {
        return addNotification('Withdrawal amount cannot exceed your current balance.', 'error');
    }

    appState.balance -= amount;
    updateBalanceUI();
    addNotification(`Successfully requested withdrawal of $${amount.toFixed(2)}.`, 'success');
    e.target.reset();
});

taskList.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
        const taskId = parseInt(e.target.dataset.taskId);
        const task = appState.tasks.find(t => t.id === taskId);

        if (task) {
            appState.balance += task.reward;
            updateBalanceUI();
            addNotification(`Credited $${task.reward.toFixed(2)} for completing task: "${task.description}".`, 'success');
            
            // Remove task from list and re-render
            appState.tasks = appState.tasks.filter(t => t.id !== taskId);
            renderTasks();
        }
    }
});

document.getElementById('admin-credit-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = parseFloat(e.target.elements['credit-amount'].value);

    if (isNaN(amount)) {
        return addNotification('Please enter a valid credit amount.', 'error');
    }

    appState.balance += amount;
    updateBalanceUI();
    addNotification(`Admin adjustment: Balance changed by $${amount.toFixed(2)}.`, 'info');
    e.target.reset();
});

// --- Initialization Function ---
function initializeApp() {
    // Set user info
    userInfo.querySelector('span').textContent = `Welcome, ${appState.currentUser.name}!`;

    // Check role and show admin panel if applicable
    if (appState.currentUser.role === 'admin') {
        adminPanel.classList.remove('hidden');
        userInfo.querySelector('span').textContent += ' (Admin)';
    }

    // Initial UI setup
    updateBalanceUI();
    renderTasks();
    addNotification('Welcome to the platform! Complete tasks to earn money.', 'info');
}

// --- Run the App ---
initializeApp();

// --- For demonstration: How to switch to admin view ---
// You can open your browser's developer console and type:
// appState.currentUser.role = 'admin'; initializeApp();
// This will reload the UI with the admin panel visible.