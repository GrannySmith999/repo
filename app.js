// --- Application State & Data ---
// In a real app, this data would come from a database on a server.
// We are simulating a database and a logged-in user state.

let appState = {}; // This will hold the state for the CURRENTLY LOGGED IN user.

// This simulates our multi-user database.
let database = {
    users: {
        "JaneDoe": {
            name: 'JaneDoe',
            role: 'user',
            balance: 5.00,
            tasks: [
                { id: 1, description: 'Leave a positive comment on a YouTube video about travel.', status: 'available' },
                { id: 2, description: 'Write a 4-star review for "Central Park" on a popular reviews site.', status: 'available' }
            ],
            history: []
        },
        "JohnSmith": {
            name: 'JohnSmith',
            role: 'user',
            balance: 15.00,
            tasks: [
                { id: 3, description: 'Post a supportive comment on our new Facebook page post.', status: 'available' },
            ],
            history: []
        },
        "admin": { name: 'admin', role: 'admin', balance: 0, tasks: [], history: [] }
    },
};

// --- DOM Element Selectors ---
const userInfo = document.getElementById('user-info');
const balanceEl = document.getElementById('current-balance');
const notificationList = document.getElementById('notification-list');
const taskList = document.getElementById('task-list');
const historyList = document.getElementById('history-list');
const mainNav = document.getElementById('main-nav');
const pages = document.querySelectorAll('.page');

// Constants for task earnings
const TASK_START_COST = 0.02;
const TASK_COMPLETION_REWARD = 1.20;

// --- State Management Functions (with localStorage) ---
function saveState() {
    // Save the entire database to localStorage
    localStorage.setItem('taskAppDatabase', JSON.stringify(database));
}

function loadState() {
    const savedDB = localStorage.getItem('taskAppDatabase');
    if (savedDB) {
        database = JSON.parse(savedDB);
    }
}

function logHistory(description, amount) {
    const timestamp = new Date().toISOString();
    appState.history.unshift({ description, amount, timestamp }); // Add to the beginning of the array
    if (appState.history.length > 50) appState.history.pop(); // Keep history to a reasonable size
}

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
        if (task.status === 'completed') return; // Don't render completed tasks

        const taskEl = document.createElement('div');
        taskEl.className = 'task';

        if (task.status === 'available') {
            taskEl.innerHTML = `
                <span>${task.description}</span>
                <button data-task-id="${task.id}" data-action="start">Start Task (Cost: $${TASK_START_COST.toFixed(2)})</button>
            `;
        } else if (task.status === 'started') {
            taskEl.innerHTML = `
                <span>${task.description} (In Progress)</span>
                <button data-task-id="${task.id}" data-action="finish">Finish Task (Reward: $${TASK_COMPLETION_REWARD.toFixed(2)})</button>
            `;
        }
        taskList.appendChild(taskEl);
    });
}

function renderHistory() {
    historyList.innerHTML = ''; // Clear existing list
    if (appState.history.length === 0) {
        historyList.innerHTML = '<p>No transaction history yet.</p>';
        return;
    }
    appState.history.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'task'; // Re-using 'task' style for consistency
        const amountClass = item.amount >= 0 ? 'success' : 'error';
        itemEl.innerHTML = `<span>${item.description}</span> <strong class="${amountClass}">$${item.amount.toFixed(2)}</strong>`;
        historyList.appendChild(itemEl);
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
    logHistory('Withdrawal request', -amount);
    saveState(); // Save state after balance change
    addNotification(`Successfully requested withdrawal of $${amount.toFixed(2)}.`, 'success');
    e.target.reset();
});

taskList.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
        // Find the task before making any changes
        const action = e.target.dataset.action;
        const taskId = parseInt(e.target.dataset.taskId);
        const task = appState.tasks.find(t => t.id === taskId);
        let stateChanged = false;

        if (!task) return;

        if (action === 'start') {
            if (appState.balance < TASK_START_COST) {
                return addNotification('Insufficient balance to start the task.', 'error');
            }
            appState.balance -= TASK_START_COST;
            task.status = 'started';
            updateBalanceUI();
            logHistory(`Started task: "${task.description}"`, -TASK_START_COST);
            stateChanged = true;
            addNotification(`Task started. $${TASK_START_COST.toFixed(2)} has been deducted.`, 'info');
        } else if (action === 'finish') {
            appState.balance += TASK_COMPLETION_REWARD;
            task.status = 'completed'; // Mark as completed
            updateBalanceUI();
            logHistory(`Finished task: "${task.description}"`, TASK_COMPLETION_REWARD);
            stateChanged = true;
            addNotification(`Task finished! $${TASK_COMPLETION_REWARD.toFixed(2)} has been credited to your account.`, 'success');
        }

        if (stateChanged) {
            // Re-render tasks to reflect the new status
            renderTasks();
            // Save the new state to localStorage
            saveState();
        }
    }
});

// --- Page Navigation ---
mainNav.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
        const pageId = e.target.dataset.page;

        // Update active button
        mainNav.querySelector('.active').classList.remove('active');
        e.target.classList.add('active');

        // Update active page
        pages.forEach(page => {
            page.classList.toggle('active', page.id === `page-${pageId}`);
        });

        if (pageId === 'history') {
            renderHistory();
        }
    }
});

document.getElementById('admin-credit-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const formElements = e.target.elements;
    const selectedUsername = formElements['user-select'].value;
    const amount = parseFloat(e.target.elements['credit-amount'].value);

    if (!selectedUsername) {
        return addNotification('Please select a user to credit.', 'error');
    }
    if (isNaN(amount) || amount <= 0) {
        return addNotification('Please enter a valid credit amount.', 'error');
    }

    // Find the user in the database and update their balance
    const userToCredit = database.users[selectedUsername];
    if (userToCredit) {
        userToCredit.balance += amount;
        logHistory(`Admin credit for ${selectedUsername}`, amount); // This logs to the admin's history
        addNotification(`Admin credit: $${amount.toFixed(2)} has been added to ${selectedUsername}'s account.`, 'success');
    }

    saveState(); // Save state after admin credit
    e.target.reset();
});

// --- Initialization Function ---
function populateAdminUserDropdown() {
    const adminForm = document.getElementById('admin-credit-form');
    const select = document.createElement('select');
    select.id = 'user-select';
    select.name = 'user-select';

    let options = '<option value="">-- Select a User --</option>';
    for (const username in database.users) {
        if (database.users[username].role !== 'admin') { // Don't let admin credit themselves this way
            options += `<option value="${username}">${username}</option>`;
        }
    }
    select.innerHTML = options;

    // Add the dropdown to the form
    const creditLabel = adminForm.querySelector('label[for="credit-amount"]');
    adminForm.insertBefore(select, creditLabel);
}

function initializeApp() {
    // Set user info
    userInfo.querySelector('span').textContent = `Welcome, ${appState.currentUser.name}!`;

    // Check role and show admin panel if applicable
    if (appState.currentUser.role === 'admin') {
        userInfo.querySelector('span').textContent += ' (Admin)';
        document.querySelector('button[data-page="deposit"]').style.display = 'inline-block';
        populateAdminUserDropdown();
    }

    // Initial UI setup
    updateBalanceUI();
    renderTasks();
    // renderHistory(); // No need to render it initially, only when page is viewed
    addNotification('Welcome to the platform! Complete tasks to earn money.', 'info');
}

// --- Run the App ---
loadState(); // Load the entire database from localStorage
const loggedInUsername = localStorage.getItem('loggedInUser');

if (!loggedInUsername) {
    // If no user is logged in, redirect to a login page (which we'll create next)
    // For now, let's link to the new register page.
    window.location.href = 'register.html';
} else if (database.users[loggedInUsername]) {
    // If a user is logged in, load their data into the appState
    appState = database.users[loggedInUsername];
    appState.currentUser = { name: loggedInUsername, role: appState.role };
    initializeApp(); // Initialize the dashboard
}


// To reset the state for testing, you can open the browser console and run:
// localStorage.removeItem('taskAppDatabase'); location.reload();
