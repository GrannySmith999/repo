const ReviewMasterApp = {
    // --- Application State & Data ---
    appState: {},
    allUsers: {},
    marketplaceTasks: [],
    currentFirebaseUser: null,
    listenersAttached: false,
    dom: {}, // To hold DOM element references

    // Constants for task earnings
    TASK_CREDIT_COST: 1,
    TASK_COMPLETION_REWARD: 0.10,

saveAppState() {
    if (this.currentFirebaseUser) {
        firebase.database().ref('users/' + this.currentFirebaseUser.uid).set(this.appState);
    }
},
logHistory(description, amount) {
    const timestamp = new Date().toISOString();
    this.appState.history.unshift({ description, amount, timestamp }); // Add to the beginning of the array
    if (this.appState.history.length > 50) this.appState.history.pop(); // Keep history to a reasonable size
},

// --- UI Update Functions ---
updateBalanceUI() {
    if (this.dom.balanceEl) this.dom.balanceEl.innerText = `$${this.appState.balance.toFixed(2)}`;
    if (this.dom.userInfo) this.dom.userInfo.querySelector('.credits').textContent = `Credits: ${this.appState.credits}`;
},

addNotification(message, type = 'info') { // type can be 'info', 'success', 'error'
    toast.className = `toast notification ${type}`;
    const title = type.charAt(0).toUpperCase() + type.slice(1);
    toast.innerHTML = `<strong>${title}:</strong> ${message}`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 5000);
},

renderTasks() {
    this.dom.taskList.innerHTML = ''; // Clear existing tasks
    if (!this.appState.tasks || this.appState.tasks.length === 0) {
        this.dom.taskList.innerHTML = '<p>You have no active tasks. Find new tasks in the marketplace!</p>';
        return;
    }

    this.appState.tasks.forEach(task => {
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

        this.dom.taskList.appendChild(taskEl);
    });
},

renderMarketplaceTasks() {
    this.dom.marketplaceTaskList.innerHTML = '';
    const userTaskIds = this.appState.tasks ? this.appState.tasks.map(t => t.id) : [];

    this.marketplaceTasks.forEach(task => {
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
        this.dom.marketplaceTaskList.appendChild(taskEl);
    });

    if (this.dom.marketplaceTaskList.innerHTML === '') {
        this.dom.marketplaceTaskList.innerHTML = '<p>No new tasks are available in the marketplace right now. Please check back later.</p>';
    }
},

renderHistory() {
    this.dom.historyList.innerHTML = ''; // Clear existing list
    if (!this.appState.history || this.appState.history.length === 0) {
        this.dom.historyList.innerHTML = '<p>No transaction history yet.</p>';
        return;
    }
    this.appState.history.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'task'; // Re-using 'task' style for consistency
        const amountClass = item.amount >= 0 ? 'success' : 'error';
        itemEl.innerHTML = `<span>${item.description}</span> <strong class="${amountClass}">$${item.amount.toFixed(2)}</strong>`;
        this.dom.historyList.appendChild(itemEl);
    });
},

populateAgreementForm() {
    if (this.appState.agreement) {
        const form = document.getElementById('agreement-form');
        form.elements['full-name'].value = this.appState.agreement.fullName ?? '';
        form.elements['address-line1'].value = this.appState.agreement.addressLine1 ?? '';
        form.elements.city.value = this.appState.agreement.city ?? '';
        form.elements.country.value = this.appState.agreement.country ?? '';
        form.elements['bank-name'].value = this.appState.agreement.bankName ?? '';
        form.elements['account-holder-name'].value = this.appState.agreement.accountHolderName ?? '';
        form.elements['account-number'].value = this.appState.agreement.accountNumber ?? '';
        form.elements['routing-number'].value = this.appState.agreement.routingNumber ?? '';
        form.elements['agree-terms'].checked = this.appState.agreement.agreedToTerms ?? false;
    }
},

// --- Admin UI Functions ---
renderUserManagementTable() {
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
    for (const uid in this.allUsers) {
        const user = this.allUsers[uid];
        if (user.role === 'admin') continue; // Don't show admin in the list
        const statusClass = user.status === 'blocked' ? 'status-blocked' : '';
        const buttonText = user.status === 'active' ? 'Block' : 'Unblock';
        tableHTML += `
            <tr>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>$${user.balance.toFixed(2)}</td>
                <td class="${statusClass}">${user.status.charAt(0).toUpperCase() + user.status.slice(1)}</td>
                <td><button data-action="toggle-block" data-user-uid="${uid}">${buttonText}</button></td>
            </tr>
        `;
    }
    tableHTML += `</tbody></table>`;
    container.innerHTML = tableHTML;
},

renderPendingTasks() {
    const container = document.getElementById('pending-tasks-list');
    container.innerHTML = '';
    let hasPendingTasks = false;

    for (const uid in this.allUsers) {
        const user = this.allUsers[uid];
        if (user.tasks) user.tasks.forEach(task => {
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
                        <button data-action="approve" data-user-uid="${uid}" data-task-id="${task.id}" style="background-color: var(--success-color);">Approve</button>
                        <button data-action="reject" data-user-uid="${uid}" data-task-id="${task.id}" style="background-color: var(--error-color); margin-left: 0.5rem;">Reject</button>
                    </div>
                `;
                container.appendChild(taskEl);
            }
        });
    }

    if (!hasPendingTasks) {
        container.innerHTML = '<p>There are no pending tasks to review.</p>';
    }
},

handleTaskApproval(userEmail, taskId, isApproved) {
    // This function now needs to update the user's data in Firebase
    const userRef = firebase.database().ref('users/' + userEmail); // userEmail is now the UID
    const user = this.allUsers[userEmail];
    const task = user.tasks.find(t => t.id === taskId);
    if (!task) return;

    if (isApproved) {
        task.status = 'completed';
        user.balance += this.TASK_COMPLETION_REWARD;
    } else {
        task.status = 'started'; // Return task to user to re-submit
        this.logHistory(`Task rejected: "${task.description}"`, -this.TASK_COMPLETION_REWARD);
    }
    userRef.set(user); // Save the updated user object back to Firebase
    this.renderPendingTasks(); // Refresh the list
},

// --- Initialization Function ---
populateAdminUserDropdown() {
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
    for (const uid in this.allUsers) {
        const user = this.allUsers[uid];
        if (user.role !== 'admin') { // Don't let admin credit themselves this way
            options += `<option value="${uid}">${user.name} (${user.email})</option>`;
        }
    }
    select.innerHTML = options;

    // Add the dropdown to the form
    const creditLabel = adminForm.querySelector('label[for="credit-amount"]');
    adminForm.insertBefore(select, creditLabel);
},

/**
 * CONCEPTUAL FUNCTION: Generates a new task by calling an external API.
 * This is a placeholder to show where you would integrate a service like Google Custom Search API.
 * @param {string} taskType - The type of task to generate (e.g., 'YouTube Comment').
 * @returns {Promise<object|null>} A new task object or null if generation fails.
 */
async generateNewTaskFromAPI(taskType) {
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
},

checkAndResetDailyCounter() {
    const today = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD

    // If the last activity was yesterday or earlier
    if (this.appState.lastActivityDate < today) {
        // Check if the user met the quota for the last active day
        if (this.appState.tasksCompletedToday < 20 && this.appState.role === 'user') {
            this.appState.status = 'blocked';
            this.addNotification(`Your account has been suspended for not meeting the daily task requirement of 20 tasks.`, 'error');
        }

        // Reset the counter for the new day
        this.appState.tasksCompletedToday = 0;
    }
    // Update the last activity date to today
    this.appState.lastActivityDate = today;
},

initializeApp() {
    // Set user info
    this.dom.userInfo.querySelector('span').textContent = `Welcome, ${this.appState.name}!`;

    // Check role and show admin panel if applicable
    if (this.appState.role === 'admin') {
        this.dom.userInfo.querySelector('span').textContent += ' (Admin)'; // Add admin tag to welcome message
        this.dom.mainNav.querySelector('button[data-page="admin"]').style.display = 'inline-block'; // Show the Admin button in the nav
        this.populateAdminUserDropdown();
        this.renderUserManagementTable();
        this.renderPendingTasks();
    }

    // Initial UI setup
    this.updateBalanceUI();
    this.renderTasks();
    // renderHistory(); // No need to render it initially, only when page is viewed
    this.addNotification('Welcome to the platform! Complete tasks to earn money.', 'info');
},

// --- Event Handlers ---
attachEventListeners() {
    if (this.dom.withdrawForm) this.dom.withdrawForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = parseFloat(e.target.elements['withdraw-amount'].value);

        if (isNaN(amount) || amount <= 0) {
            return this.addNotification('Please enter a valid withdrawal amount.', 'error');
        }
        if (amount > this.appState.balance) {
            return this.addNotification('Withdrawal amount cannot exceed your current balance.', 'error');
        }
        if (!this.appState.agreement || !this.appState.agreement.bankName) {
            return this.addNotification('Please complete your payment information in the Profile section before requesting a withdrawal.', 'error');
        }

        this.appState.balance -= amount;
        this.updateBalanceUI();
        this.logHistory('Withdrawal request', -amount);
        this.saveAppState(); // Save state after balance change
        this.addNotification(`Successfully requested withdrawal of $${amount.toFixed(2)}.`, 'success');
        e.target.reset();
    });

    this.dom.taskList.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            // Find the task before making any changes
            const action = e.target.dataset.action;
            const taskId = parseInt(e.target.dataset.taskId);
            const task = appState.tasks.find(t => t.id === taskId);
            let stateChanged = false;

            if (!task) return;

            if (action === 'start') {
                if (this.appState.credits < this.TASK_CREDIT_COST) {
                    return this.addNotification('You do not have enough credits to start this task.', 'error');
                }
                this.appState.credits -= this.TASK_CREDIT_COST;
                task.status = 'started';
                this.updateBalanceUI();
                this.logHistory(`Used ${this.TASK_CREDIT_COST} credit for task: "${task.description}"`, 0); // Logging credit use, no monetary change
                stateChanged = true;
                this.addNotification(`Task started! ${this.TASK_CREDIT_COST} credit has been used.`, 'info');
            } else if (action === 'finish') {
                const submissionText = document.querySelector(`textarea[data-task-id="${taskId}"]`).value;
                if (!submissionText || submissionText.trim().length < 10) {
                    return this.addNotification('Please provide valid proof of completion (e.g., a link or description).', 'error');
                }

                task.status = 'pending'; // Mark as pending for admin review
                task.submission = submissionText; // Store the user's submission

                // In a real app, the reward is given only after admin approval.

                // Increment daily task counter
                this.checkAndResetDailyCounter();
                this.appState.tasksCompletedToday++;
                this.updateBalanceUI();
                stateChanged = true;
                this.addNotification(`Task submitted for review!`, 'success');
            }

            if (stateChanged) {
                // Re-render tasks to reflect the new status
                this.renderTasks();
                // Save the new state to localStorage
                this.saveAppState();
            }
        }
    });

    this.dom.marketplaceTaskList.addEventListener('click', (e) => {
        if (e.target.dataset.action === 'reserve') {
            if (this.appState.credits < this.TASK_CREDIT_COST) {
                return this.addNotification('You do not have enough credits to reserve this task.', 'error');
            }

            const taskId = parseInt(e.target.dataset.taskId);
            const taskToReserve = this.marketplaceTasks.find(t => t.id === taskId);

            if (taskToReserve) {
                this.appState.credits -= this.TASK_CREDIT_COST;

                // Add the task to the user's personal list with 'available' status
                const newTask = { ...taskToReserve, status: 'available' };
                this.appState.tasks.push(newTask);

                this.saveAppState();
                this.renderTasks(); // Update the user's main task list view
                this.dom.marketplaceModal.classList.remove('active'); // Close the modal
                this.addNotification(`Task "${taskToReserve.description}" reserved successfully!`, 'success');
            }
        }
    });

    // --- Page Navigation ---
    this.dom.mainNav.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const pageId = e.target.dataset.page;

            // Update active button
            mainNav.querySelector('.active').classList.remove('active');
            e.target.classList.add('active');

            // Update active page
            this.dom.pages.forEach(page => {
                page.classList.toggle('active', page.id === `page-${pageId}`);
            });

            if (pageId === 'history') {
                this.renderHistory();
            }
            if (pageId === 'profile') {
                this.populateAgreementForm();
            }
            if (pageId === 'info') {
                // No special function needed, the content is static HTML
            }
            if (pageId === 'admin') {
                // Re-render the admin table every time the page is viewed
                this.renderUserManagementTable();
                this.renderPendingTasks();
            }
        }
    });

    // --- Marketplace Modal Handlers ---
    this.dom.openMarketplaceBtn.addEventListener('click', () => {
        this.renderMarketplaceTasks();
        this.dom.marketplaceModal.classList.add('active');
    });

    this.dom.closeMarketplaceBtn.addEventListener('click', () => {
        this.dom.marketplaceModal.classList.remove('active');
    });

    if (this.dom.agreementForm) this.dom.agreementForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const form = e.target;

        if (!form.elements['agree-terms'].checked) {
            return this.addNotification('You must agree to the terms to save your profile.', 'error');
        }

        const agreementDetails = {
            fullName: form.elements['full-name'].value,
            addressLine1: form.elements['address-line1'].value,
            city: form.elements.city.value,
            country: form.elements.country.value,
            bankName: form.elements['bank-name'].value,
            accountHolderName: form.elements['account-holder-name'].value,
            accountNumber: form.elements['account-number'].value,
            routingNumber: form.elements['routing-number'].value,
            agreedToTerms: form.elements['agree-terms'].checked,
            submittedAt: new Date().toISOString(),
        };

        // Save details to the current user's state
        this.appState.agreement = agreementDetails;
        this.saveAppState();

        this.addNotification('Your profile and payout details have been saved successfully.', 'success');
    });

    if (this.dom.adminCreditForm) this.dom.adminCreditForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formElements = e.target.elements;
        const selectedUsername = formElements['user-select'].value;
        const amount = parseInt(e.target.elements['credit-amount'].value, 10);

        if (!selectedUsername) {
            return this.addNotification('Please select a user to credit.', 'error');
        }
        if (isNaN(amount) || amount <= 0) {
            return this.addNotification('Please enter a valid credit amount.', 'error');
        }

        // Find the user in the database and update their balance
        const userToCredit = this.allUsers[selectedUsername];
        if (userToCredit) {
            userToCredit.credits += amount;
            // Save the updated user data back to Firebase
            firebase.database().ref('users/' + selectedUsername).set(userToCredit);
            this.addNotification(`Admin credit: ${amount} credits have been added to ${userToCredit.name}'s account.`, 'success');
        }

        e.target.reset();
    });

    this.dom.userInfo.addEventListener('click', (e) => {
        if (e.target.tagName === 'A' && e.target.getAttribute('href') === '#logout') {
            e.preventDefault();
            firebase.auth().signOut();
        }
    });

    this.dom.adminPage.addEventListener('click', (e) => {
        if (e.target.dataset.action === 'toggle-block') {
            const userUid = e.target.dataset.userUid;
            const user = this.allUsers[userUid];
            if (user) {
                // Toggle the user's status
                user.status = user.status === 'active' ? 'blocked' : 'active';
                firebase.database().ref('users/' + userUid).child('status').set(user.status);
                this.renderUserManagementTable(); // Re-render the table to show the change
                this.addNotification(`User ${user.name} has been ${user.status}.`, 'success');
            }
        } else if (e.target.dataset.action === 'approve') {
            const userUid = e.target.dataset.userUid;
            const taskId = parseInt(e.target.dataset.taskId);
            this.handleTaskApproval(userUid, taskId, true);
        } else if (e.target.dataset.action === 'reject') {
            const userUid = e.target.dataset.userUid;
            const taskId = parseInt(e.target.dataset.taskId);
            this.handleTaskApproval(userUid, taskId, false);
        }
    });
},

start(user) {
    this.currentFirebaseUser = user;
    const userRef = firebase.database().ref('users/' + user.uid);

    // Fetch user's profile data
    userRef.on('value', (snapshot) => {
        this.appState = snapshot.val();
        if (this.appState) {
            if (!this.listenersAttached) {
                this.cacheDom();
                this.attachEventListeners();
                this.listenersAttached = true;
            }
            this.checkAndResetDailyCounter();
            this.initializeApp();
        }
    });

    // Fetch all users for admin panel and marketplace tasks
    firebase.database().ref('users').on('value', (snapshot) => { this.allUsers = snapshot.val() || {}; });
    firebase.database().ref('marketplaceTasks').on('value', (snapshot) => { this.marketplaceTasks = snapshot.val() || []; });
},

cacheDom() {
    this.dom.userInfo = document.getElementById('user-info');
    this.dom.balanceEl = document.getElementById('current-balance');
    this.dom.toastContainer = document.getElementById('toast-container');
    this.dom.taskList = document.getElementById('task-list');
    this.dom.historyList = document.getElementById('history-list');
    this.dom.mainNav = document.getElementById('main-nav');
    this.dom.adminPage = document.getElementById('page-admin');
    this.dom.marketplaceModal = document.getElementById('marketplace-modal');
    this.dom.openMarketplaceBtn = document.getElementById('open-marketplace-btn');
    this.dom.closeMarketplaceBtn = document.getElementById('close-marketplace-btn');
    this.dom.marketplaceTaskList = document.getElementById('marketplace-task-list');
    this.dom.pages = document.querySelectorAll('.page');
    this.dom.withdrawForm = document.getElementById('withdraw-form');
    this.dom.agreementForm = document.getElementById('agreement-form');
    this.dom.adminCreditForm = document.getElementById('admin-credit-form');
}
};

// --- Run the App ---
document.addEventListener('DOMContentLoaded', () => {
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            ReviewMasterApp.start(user);
        } else {
            // User is signed out.
            window.location.replace('login.html');
        }
    });
});

// To reset the state for testing, you can open the browser console and run:
// localStorage.removeItem('taskAppDatabase'); location.reload();
