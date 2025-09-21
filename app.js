// --- Application State & Data ---
// In a real app, this data would come from a database on a server.
// We are simulating a database and a logged-in user state.
let database = {
    users: {
        // The key is now the user's email
        "janedoe@example.com": {
            password: 'password123',
            name: 'JaneDoe',
            status: 'active', // 'active' or 'blocked'
            email: 'janedoe@example.com',
            role: 'user',
            balance: 5.00,
            agreement: null, // Will hold agreement details
            tasksCompletedToday: 0,
            lastActivityDate: '2023-01-01', // Example past date
            credits: 50, 
            tasks: [], // User's personal reserved tasks
            history: []
        },
        "johnsmith@example.com": {
            password: 'password123',
            name: 'JohnSmith',
            status: 'active',
            email: 'johnsmith@example.com',
            role: 'user',
            balance: 15.00,
            agreement: null,
            tasksCompletedToday: 10, // Example value
            lastActivityDate: new Date().toISOString().split('T')[0],
            credits: 25, 
            tasks: [],
            history: []
        },
        "admin@example.com": {
            password: 'admin',
            name: 'admin',
            email: 'admin@example.com',
            status: 'active',
            role: 'admin', balance: 0, credits: 999, tasks: [], history: [], agreement: null, tasksCompletedToday: 0, lastActivityDate: new Date().toISOString().split('T')[0]
        }
    },
    // Global pool of tasks available in the marketplace
    marketplaceTasks: [
        { 
            id: 101, 
            type: 'YouTube Comment',
            description: 'Leave a positive comment on a travel vlog.', 
            link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            instructions: 'Watch the video and leave a comment about your favorite part. Keep it positive and engaging.'
        },
        { 
            id: 102, 
            type: 'Google Review',
            description: 'Write a 5-star review for a local cafe.',
            link: 'https://www.google.com/maps/search/?api=1&query=cafe+near+me',
            instructions: 'Mention the friendly staff and the quality of the coffee in your review.'
        },
        { 
            id: 103, 
            type: 'Facebook Comment',
            description: 'Post a supportive comment on a new product launch.',
            link: 'https://www.facebook.com/',
            instructions: 'Comment on the post, mentioning how excited you are for the new product.'
        }
    ]
};

loadState(); // Load the database from localStorage AFTER the default database is defined.
let appState = {}; // This will hold the state for the CURRENTLY LOGGED IN user.

// --- DOM Element Selectors ---
const userInfo = document.getElementById('user-info');
const balanceEl = document.getElementById('current-balance');
const notificationList = document.getElementById('notification-list');
const taskList = document.getElementById('task-list');
const historyList = document.getElementById('history-list');
const mainNav = document.getElementById('main-nav');
const adminPage = document.getElementById('page-admin');
const marketplaceModal = document.getElementById('marketplace-modal');
const openMarketplaceBtn = document.getElementById('open-marketplace-btn');
const closeMarketplaceBtn = document.getElementById('close-marketplace-btn');
const marketplaceTaskList = document.getElementById('marketplace-task-list');
const pages = document.querySelectorAll('.page');

// Constants for task earnings
const TASK_CREDIT_COST = 1;
const TASK_COMPLETION_REWARD = 0.10;

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
    userInfo.querySelector('.credits').textContent = `Credits: ${appState.credits}`;
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
    if (appState.tasks.length === 0) {
        taskList.innerHTML = '<p>You have no active tasks. Find new tasks in the marketplace!</p>';
        return;
    }

    appState.tasks.forEach(task => {
        if (task.status === 'completed') return; // Don't render completed tasks

        const taskEl = document.createElement('div');
        taskEl.className = 'task';

        // Base task info
        let taskHTML = `
            <div class="task-info">
                <strong>${task.type}:</strong> ${task.description}<br>
                <em>Instructions: ${task.instructions}</em>
            </div>
        `;

        if (task.status === 'available') { // User can start the task
            taskHTML += `<button data-task-id="${task.id}" data-action="start">Start Task (Cost: ${TASK_CREDIT_COST} Credit)</button>`;
        } else if (task.status === 'started') { // Task is in progress, user needs to submit proof
            taskEl.innerHTML = `
                ${taskHTML}
                <div class="task-submission">
                    <a href="${task.link}" target="_blank">Go to Task Link</a>
                    <textarea data-task-id="${task.id}" placeholder="Paste the link to your comment/review here as proof."></textarea>
                    <button data-task-id="${task.id}" data-action="finish">Submit for Review</button>
                </div>
            `;
        } else if (task.status === 'pending') { // Task is awaiting admin approval
            taskHTML += `<span><strong>Status:</strong> Pending Review</span>`;
        }

        // Only set innerHTML if it wasn't already set for the 'started' case
        if (task.status !== 'started') taskEl.innerHTML = taskHTML;

        taskList.appendChild(taskEl);
    });
}

function renderMarketplaceTasks() {
    marketplaceTaskList.innerHTML = '';
    const userTaskIds = appState.tasks.map(t => t.id);

    database.marketplaceTasks.forEach(task => {
        // Don't show tasks the user has already reserved
        if (userTaskIds.includes(task.id)) {
            return;
        }

        const taskEl = document.createElement('div');
        taskEl.className = 'task';
        taskEl.innerHTML = `
            <div class="task-info">
                <strong>${task.type}:</strong> ${task.description}<br>
                <em>Instructions: ${task.instructions}</em>
            </div>
            <button data-task-id="${task.id}" data-action="reserve">Reserve Task (1 Credit)</button>
        `;
        marketplaceTaskList.appendChild(taskEl);
    });

    if (marketplaceTaskList.innerHTML === '') {
        marketplaceTaskList.innerHTML = '<p>No new tasks are available in the marketplace right now. Please check back later.</p>';
    }
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

function populateAgreementForm() {
    if (appState.agreement) {
        const form = document.getElementById('agreement-form');
        form.elements['full-name'].value = appState.agreement.fullName ?? '';
        form.elements['address-line1'].value = appState.agreement.addressLine1 ?? '';
        form.elements.city.value = appState.agreement.city ?? '';
        form.elements.country.value = appState.agreement.country ?? '';
        form.elements['payment-method'].value = appState.agreement.paymentMethod ?? '';
        form.elements['payment-email'].value = appState.agreement.paymentEmail ?? '';
        form.elements['agree-terms'].checked = appState.agreement.agreedToTerms ?? false;
    }
}

// --- Admin UI Functions ---
function renderUserManagementTable() {
    const container = document.getElementById('user-management-table');
    let tableHTML = `
        <table class="user-table">
            <thead>
                <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
    `;
    for (const email in database.users) {
        const user = database.users[email];
        if (user.role === 'admin') continue; // Don't show admin in the list
        const statusClass = user.status === 'blocked' ? 'status-blocked' : '';
        const buttonText = user.status === 'active' ? 'Block' : 'Unblock';
        tableHTML += `
            <tr>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>$${user.balance.toFixed(2)}</td>
                <td class="${statusClass}">${user.status.charAt(0).toUpperCase() + user.status.slice(1)}</td>
                <td><button data-action="toggle-block" data-user-email="${email}">${buttonText}</button></td>
            </tr>
        `;
    }
    tableHTML += `</tbody></table>`;
    container.innerHTML = tableHTML;
}

function renderPendingTasks() {
    const container = document.getElementById('pending-tasks-list');
    container.innerHTML = '';
    let hasPendingTasks = false;

    for (const userEmail in database.users) {
        const user = database.users[userEmail];
        user.tasks.forEach(task => {
            if (task.status === 'pending') {
                hasPendingTasks = true;
                const taskEl = document.createElement('div');
                taskEl.className = 'task';
                taskEl.innerHTML = `
                    <div class="task-info">
                        <strong>User:</strong> ${user.name} (${user.email})<br>
                        <strong>Task:</strong> ${task.description}<br>
                        <strong>Submission:</strong> <em>"${task.submission}"</em>
                    </div>
                    <div>
                        <button data-action="approve" data-user-email="${userEmail}" data-task-id="${task.id}" style="background-color: var(--success-color);">Approve</button>
                        <button data-action="reject" data-user-email="${userEmail}" data-task-id="${task.id}" style="background-color: var(--error-color); margin-left: 0.5rem;">Reject</button>
                    </div>
                `;
                container.appendChild(taskEl);
            }
        });
    }

    if (!hasPendingTasks) {
        container.innerHTML = '<p>There are no pending tasks to review.</p>';
    }
}

function handleTaskApproval(userEmail, taskId, isApproved) {
    const user = database.users[userEmail];
    const task = user.tasks.find(t => t.id === taskId);
    if (!task) return;

    if (isApproved) {
        task.status = 'completed';
    } else {
        task.status = 'started'; // Return task to user to re-submit
        user.balance -= TASK_COMPLETION_REWARD; // Reclaim the reward
        logHistory(`Task rejected: "${task.description}"`, -TASK_COMPLETION_REWARD);
    }
    saveState();
    renderPendingTasks(); // Refresh the list
}

// --- Initialization Function ---
function populateAdminUserDropdown() {
    const adminForm = document.getElementById('admin-credit-form');
    // Prevent adding duplicate dropdowns
    const existingSelect = document.getElementById('user-select');
    if (existingSelect) {
        existingSelect.remove();
    }

    const select = document.createElement('select');
    select.id = 'user-select'; // The ID for the select element
    select.name = 'user-select'; // The name attribute for the form

    let options = '<option value="">-- Select a User --</option>';
    for (const emailKey in database.users) {
        const user = database.users[emailKey];
        if (user.role !== 'admin') { // Don't let admin credit themselves this way
            options += `<option value="${emailKey}">${user.name} (${emailKey})</option>`;
        }
    }
    select.innerHTML = options;

    // Add the dropdown to the form
    const creditLabel = adminForm.querySelector('label[for="credit-amount"]');
    adminForm.insertBefore(select, creditLabel);
}

/**
 * CONCEPTUAL FUNCTION: Generates a new task by calling an external API.
 * This is a placeholder to show where you would integrate a service like Google Custom Search API.
 * @param {string} taskType - The type of task to generate (e.g., 'YouTube Comment').
 * @returns {Promise<object|null>} A new task object or null if generation fails.
 */
async function generateNewTaskFromAPI(taskType) {
    // In a real implementation, you would get these from a secure place.
    const API_KEY = 'PASTE_YOUR_NEW_API_KEY_HERE'; // IMPORTANT: Replace with your new, secure key
    const SEARCH_ENGINE_ID = '01efd7843a7744ad0'; // Your Search Engine ID

    let query = '';
    if (taskType === 'YouTube Comment') {
        query = 'inurl:youtube.com "travel vlog" "new york"';
    } else if (taskType === 'Google Review') {
        query = 'inurl:google.com/maps "coffee shop" "miami fl"';
    } else {
        console.error('Unsupported task type for generation');
        return null;
    }

    try {
        const response = await fetch(`https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.items && data.items.length > 0) {
            const firstResult = data.items[0]; // Get the first search result
            return {
                id: Date.now(),
                type: taskType,
                description: `Perform a task for: ${firstResult.title}`,
                link: firstResult.link,
                instructions: `Please leave a positive and relevant ${taskType.toLowerCase()}.`,
                status: 'available'
            };
        }
    } catch (error) {
        console.error('Error fetching new task from API:', error);
        return null;
    }
    return null; // Return null if no items are found or an error occurs
}

function checkAndResetDailyCounter() {
    const today = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD

    // If the last activity was yesterday or earlier
    if (appState.lastActivityDate < today) {
        // Check if the user met the quota for the last active day
        if (appState.tasksCompletedToday < 20 && appState.role === 'user') {
            appState.status = 'blocked';
            addNotification(`Your account has been suspended for not meeting the daily task requirement of 20 tasks.`, 'error');
        }

        // Reset the counter for the new day
        appState.tasksCompletedToday = 0;
    }
    // Update the last activity date to today
    appState.lastActivityDate = today;
}

function initializeApp() {
    // Set user info
    userInfo.querySelector('span').textContent = `Welcome, ${appState.name}!`;

    // Check role and show admin panel if applicable
    if (appState.currentUser.role === 'admin') {
        userInfo.querySelector('span').textContent += ' (Admin)'; // Add admin tag to welcome message
        document.querySelector('button[data-page="admin"]').style.display = 'inline-block'; // Show the Admin button in the nav
        populateAdminUserDropdown();
        renderUserManagementTable();
        renderPendingTasks();
    }

    // Initial UI setup
    updateBalanceUI();
    renderTasks();
    // renderHistory(); // No need to render it initially, only when page is viewed
    addNotification('Welcome to the platform! Complete tasks to earn money.', 'info');
}

// --- Event Handlers ---
function attachEventListeners() {
    document.getElementById('withdraw-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = parseFloat(e.target.elements['withdraw-amount'].value);

        if (isNaN(amount) || amount <= 0) {
            return addNotification('Please enter a valid withdrawal amount.', 'error');
        }
        if (amount > appState.balance) {
            return addNotification('Withdrawal amount cannot exceed your current balance.', 'error');
        }
        if (!appState.agreement || !appState.agreement.paymentMethod) {
            return addNotification('Please complete your payment information in the Profile section before requesting a withdrawal.', 'error');
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
                if (appState.credits < TASK_CREDIT_COST) {
                    return addNotification('You do not have enough credits to start this task.', 'error');
                }
                appState.credits -= TASK_CREDIT_COST;
                task.status = 'started';
                updateBalanceUI();
                logHistory(`Used ${TASK_CREDIT_COST} credit for task: "${task.description}"`, 0); // Logging credit use, no monetary change
                stateChanged = true;
                addNotification(`Task started! ${TASK_CREDIT_COST} credit has been used.`, 'info');
            } else if (action === 'finish') {
                const submissionText = document.querySelector(`textarea[data-task-id="${taskId}"]`).value;
                if (!submissionText || submissionText.trim().length < 10) {
                    return addNotification('Please provide valid proof of completion (e.g., a link or description).', 'error');
                }

                task.status = 'pending'; // Mark as pending for admin review
                task.submission = submissionText; // Store the user's submission

                // In a real app, the reward is given only after admin approval.
                // For this prototype, we'll give the reward immediately to show the flow.
                appState.balance += TASK_COMPLETION_REWARD;

                // Increment daily task counter
                checkAndResetDailyCounter();
                appState.tasksCompletedToday++;
                updateBalanceUI();
                logHistory(`Task submitted for review: "${task.description}"`, TASK_COMPLETION_REWARD);
                stateChanged = true;
                addNotification(`Task submitted for review! $${TASK_COMPLETION_REWARD.toFixed(2)} has been credited.`, 'success');
            }

            if (stateChanged) {
                // Re-render tasks to reflect the new status
                renderTasks();
                // Save the new state to localStorage
                saveState();
            }
        }
    });

    marketplaceTaskList.addEventListener('click', (e) => {
        if (e.target.dataset.action === 'reserve') {
            if (appState.credits < TASK_CREDIT_COST) {
                return addNotification('You do not have enough credits to reserve this task.', 'error');
            }

            const taskId = parseInt(e.target.dataset.taskId);
            const taskToReserve = database.marketplaceTasks.find(t => t.id === taskId);

            if (taskToReserve) {
                appState.credits -= TASK_CREDIT_COST;

                // Add the task to the user's personal list with 'available' status
                const newTask = { ...taskToReserve, status: 'available' };
                appState.tasks.push(newTask);

                saveState();
                renderTasks(); // Update the user's main task list view
                marketplaceModal.classList.remove('active'); // Close the modal
                addNotification(`Task "${taskToReserve.description}" reserved successfully!`, 'success');
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
            if (pageId === 'profile') {
                populateAgreementForm();
            }
            if (pageId === 'info') {
                // No special function needed, the content is static HTML
            }
            if (pageId === 'admin') {
                // Re-render the admin table every time the page is viewed
                renderUserManagementTable();
            }
        }
    });

    // --- Marketplace Modal Handlers ---
    openMarketplaceBtn.addEventListener('click', () => {
        renderMarketplaceTasks();
        marketplaceModal.classList.add('active');
    });

    closeMarketplaceBtn.addEventListener('click', () => {
        marketplaceModal.classList.remove('active');
    });

    document.getElementById('agreement-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const form = e.target;

        if (!form.elements['agree-terms'].checked) {
            return addNotification('You must agree to the terms to save your profile.', 'error');
        }

        const agreementDetails = {
            fullName: form.elements['full-name'].value,
            addressLine1: form.elements['address-line1'].value,
            city: form.elements.city.value,
            country: form.elements.country.value,
            paymentMethod: form.elements['payment-method'].value,
            paymentEmail: form.elements['payment-email'].value,
            agreedToTerms: form.elements['agree-terms'].checked,
            submittedAt: new Date().toISOString(),
        };

        // Save details to the current user's state
        appState.agreement = agreementDetails;
        saveState();

        addNotification('Your profile and payout details have been saved successfully.', 'success');
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

    userInfo.addEventListener('click', (e) => {
        if (e.target.tagName === 'A' && e.target.getAttribute('href') === '#logout') {
            e.preventDefault();
            localStorage.removeItem('loggedInUser');
            window.location.href = 'login.html';
        }
    });

    adminPage.addEventListener('click', (e) => {
        if (e.target.dataset.action === 'toggle-block') {
            const userEmail = e.target.dataset.userEmail;
            const user = database.users[userEmail];
            if (user) {
                // Toggle the user's status
                user.status = user.status === 'active' ? 'blocked' : 'active';
                saveState();
                renderUserManagementTable(); // Re-render the table to show the change
                addNotification(`User ${user.name} has been ${user.status}.`, 'success');
            }
        } else if (e.target.dataset.action === 'approve') {
            const userEmail = e.target.dataset.userEmail;
            const taskId = parseInt(e.target.dataset.taskId);
            handleTaskApproval(userEmail, taskId, true);
        } else if (e.target.dataset.action === 'reject') {
            const userEmail = e.target.dataset.userEmail;
            const taskId = parseInt(e.target.dataset.taskId);
            handleTaskApproval(userEmail, taskId, false);
        }
    });
}

// --- Run the App ---
const loggedInUsername = localStorage.getItem('loggedInUser');

if (!loggedInUsername) {
    // If no user is logged in, redirect to the login page.
    window.location.href = 'login.html';
} else if (database.users[loggedInUsername]) {
    // If a user is logged in, load their data into the appState
    appState = database.users[loggedInUsername];
    // The key in the database is the email, which serves as the unique ID
    checkAndResetDailyCounter(); // Check activity status on login
    appState.currentUser = { name: appState.name, role: database.users[loggedInUsername].role };
    saveState(); // Save any changes from the daily check
    attachEventListeners(); // Attach all event listeners for the dashboard
    initializeApp(); // Initialize the dashboard
}


// To reset the state for testing, you can open the browser console and run:
// localStorage.removeItem('taskAppDatabase'); location.reload();
