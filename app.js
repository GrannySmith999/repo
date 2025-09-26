const ReviewMasterApp = {
    appState: {},
    allUsers: {},
    marketplaceTasks: [],
    currentFirebaseUser: null,
    listenersAttached: false,
    dom: {}, // To hold DOM element references

    // Tiered System Configuration
    tiers: {
        'Basic': { earning: 0.20, creditCost: 1, unlockRequirement: 0 },
        'Gold': { earning: 1.00, creditCost: 1, unlockRequirement: 100 },
        'Platinum': { earning: 3.00, creditCost: 3, unlockRequirement: 500 },
        'Diamond': { earning: 10.00, creditCost: 5, unlockRequirement: 1000 }
    },

    // Helper function to get current tier info
    getCurrentTierInfo() {
        const userTier = this.appState.tier || 'Basic';
        return this.tiers[userTier];
    },

    // Helper function to check and update user's tier
    updateUserTier() {
        const creditsPurchased = this.appState.creditsPurchased || 0;
        if (creditsPurchased >= 1000) this.appState.tier = 'Diamond';
        else if (creditsPurchased >= 500) this.appState.tier = 'Platinum';
        else if (creditsPurchased >= 100) this.appState.tier = 'Gold';
        else this.appState.tier = 'Basic';
    },
    
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
    if (this.dom.userInfo) this.dom.userInfo.querySelector('.credits').innerHTML = `⭐ ${this.appState.credits} Credits`;
},

addNotification(message, type = 'info') { // type can be 'info', 'success', 'error'
    const toast = document.createElement('div');
    toast.className = `toast notification ${type}`;
    const title = type.charAt(0).toUpperCase() + type.slice(1);
    toast.innerHTML = `<strong>${title}:</strong> ${message}`;
    this.dom.toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 5000);
},

renderTasks() {
    // Clear all task lists
    this.dom.inProgressTaskList.innerHTML = ''; // This was the only one being cleared, let's clear all.
    this.dom.availableTaskList.innerHTML = '';
    this.dom.pendingTaskList.innerHTML = '';
    this.dom.rejectedTaskList.innerHTML = '';

    // --- UI Clarification for Admin vs User ---
    // For admins, the "Available" tab is their pool of tasks to assign.
    // For users, it's tasks they can start.
    const availableTabButton = document.querySelector('#task-sub-nav button[data-task-tab="available"]');
    if (availableTabButton) availableTabButton.textContent = this.appState.role === 'admin' ? 'Unassigned Pool' : 'Available';

    let hasInProgress = false, hasPending = false, hasRejected = false;

    // If tasks is not an object, or is an array, initialize as an empty object.
    if (typeof this.appState.tasks !== 'object' || this.appState.tasks === null || Array.isArray(this.appState.tasks)) {
        this.appState.tasks = {};
    }
    
    Object.values(this.appState.tasks).forEach(task => {
        const taskEl = document.createElement('div');
        taskEl.className = `task status-${task.status}`; // Add status-specific class

        let targetList = null;

        if (task.status === 'available') {
            statusBadge = `<span class="status-badge" style="background-color: var(--success-color);">Available</span>`;
            taskContent = `<p>This task is ready for you to start!</p><div class="task-actions"><button data-task-id="${task.id}" data-action="start">Start Task (${this.getCurrentTierInfo().creditCost} Credits)</button></div>`;
            targetList = this.dom.availableTaskList;
        } else if (task.status === 'unassigned' && this.appState.role === 'admin') {
            // Special view for admins to see tasks they can assign
            statusBadge = `<span class="status-badge" style="background-color: #555;">Unassigned</span>`;
            taskContent = `<p>This task is in your pool to be assigned to a user.</p><div class="task-actions"><button data-task-id="${task.id}" data-action="assign-to-user" class="assign-btn">Assign to User</button></div>`;
            targetList = this.dom.availableTaskList; // Show in the 'Available' tab for admins
        } else if (task.status === 'started') {
            statusBadge = `<span class="status-badge" style="background-color: #f0ad4e;">In Progress</span>`;
            taskContent = `
                <div class="task-submission">
                    <p><strong>Instructions:</strong> ${task.instructions}</p>
                    <textarea data-task-id="${task.id}" placeholder="Paste the link to your comment/review here as proof."></textarea>
                    <div class="task-actions">
                        <a href="${task.link}" target="_blank" class="link-button" style="text-decoration: none; padding: 0.8rem 1.5rem; border-radius: 12px;">🔗 Go to Review Page</a>
                        <button data-task-id="${task.id}" data-action="finish">Submit for Approval</button>
                    </div>
                </div>
            `;
            targetList = this.dom.inProgressTaskList;
            hasInProgress = true;
        } else if (task.status === 'pending') {
            statusBadge = `<span class="status-badge status-pending">Pending Review</span>`;
            taskContent = `<p><em>Your submission is awaiting admin approval. Thank you!</em></p>`;
            targetList = this.dom.pendingTaskList;
            hasPending = true;
        } else if (task.status === 'completed') {
            statusBadge = `<span class="status-badge" style="background-color: var(--primary-color);">Approved</span>`;
            taskContent = `<p><em>This task was approved. Great job! 🥳</em></p>`;
            targetList = this.dom.pendingTaskList;
            hasPending = true;
        }

        taskEl.innerHTML = `
            <div class="task-info">
                <div class="task-header">
                    <h4>${task.type}</h4>
                    <div>${statusBadge}</div>
                </div>
                <div class="task-body">
                    <p>${task.description}</p>
                    ${taskContent}
                </div>
            </div>
        `;
        if (targetList) targetList.appendChild(taskEl);
    });

    if (!hasInProgress) {
        const message = this.appState.credits === 0 
            ? '<p>You have no credits. Please contact your supervisor to get credits and start working.</p>'
            : '<p>You have no available tasks. Reserve one from the marketplace!</p>';
        this.dom.availableTaskList.innerHTML = message;
    }
    if (!hasPending) this.dom.pendingTaskList.innerHTML = '<p>You have no tasks pending review or approved.</p>';
    // Logic for rejected tasks can be added if a 'rejected' status is implemented
},

renderMarketplaceTasks() {
    // Clear both user and admin marketplace lists before rendering
    // --- UI Clarification ---
    // The marketplace is for USERS to claim tasks. Admins assign from their own pool,
    // so we hide the marketplace view for them to avoid confusion.
    const marketplaceSection = document.getElementById('marketplace-section');
    if (this.appState.role === 'admin') marketplaceSection.style.display = 'none';
    
    this.dom.marketplaceTaskList.innerHTML = '';
    const userTaskIds = this.appState.tasks ? Object.keys(this.appState.tasks).map(id => parseInt(id)) : [];

    if (!this.marketplaceTasks || this.marketplaceTasks.length === 0) {
        return;
    }

    const userTierInfo = this.getCurrentTierInfo();

    const isAdmin = this.appState.role === 'admin';

    // === Render for the main user marketplace view ===
    this.marketplaceTasks.forEach(task => {
        // Marketplace is now only for non-admins. Admins assign from their own task list.
        if (isAdmin || userTaskIds.includes(task.id) || task.tier !== this.appState.tier) {
            return; // Skip this task for the user view
        }

        const actionButton = isAdmin
            ? `<button data-task-id="${task.id}" data-action="assign-to-user" class="assign-btn">Assign to User</button>`
            : `<button data-task-id="${task.id}" data-action="reserve">Reserve Task (${userTierInfo.creditCost} Credits)</button>`;

        const taskEl = document.createElement('div'); 
        taskEl.className = 'task task-marketplace';
        taskEl.innerHTML = `
            <div class="task-info">
                <div class="task-header">
                    <h4>${task.type}</h4>
                    <span class="status-badge" style="background-color: #555;">${task.tier || 'Basic'} Tier</span> 
                </div>
                <div class="task-body">
                    <p>${task.description}</p>
                    <div class="task-actions">
                        ${actionButton}
                    </div>
                </div>
            </div>
        `;
        this.dom.marketplaceTaskList.appendChild(taskEl);
    });
},

renderHistory() {
    this.dom.historyList.innerHTML = ''; // Clear existing list
    if (!this.appState.history || this.appState.history.length === 0) {
        this.dom.historyList.innerHTML = '<p>No transaction history yet.</p>';
        return;
    }
    this.appState.history.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'history-item';
        const amountClass = item.amount >= 0 ? 'success' : 'error';
        itemEl.innerHTML = `<div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #4a4a68;"><span>${item.description}</span> <strong class="${amountClass}">$${item.amount.toFixed(2)}</strong></div>`;
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
                    <th>Daily Quota</th>
                    <th>Tier</th>
                    <th>Tasks Completed</th>
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
        const blockButtonText = user.status === 'active' ? 'Block' : 'Unblock';

        // Calculate completed tasks and tier breakdown
        let completedTasksCount = 0;
        const tierCounts = { Basic: 0, Gold: 0, Platinum: 0, Diamond: 0 };
        if (user.tasks && typeof user.tasks === 'object') {
            Object.values(user.tasks).forEach(task => {
                if (task.status === 'completed') {
                    completedTasksCount++;
                    if (tierCounts.hasOwnProperty(task.tier)) {
                        tierCounts[task.tier]++;
                    }
                }
            });
        }

        // Create the tier selection dropdown
        let tierOptions = '';
        for (const tierName in this.tiers) {
            const selected = user.tier === tierName ? 'selected' : '';
            tierOptions += `<option value="${tierName}" ${selected}>${tierName}</option>`;
        }

        tableHTML += `
            <tr>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>
                    <input type="number" value="${user.dailyTaskQuota || 5}" min="5" max="100" style="width: 60px; padding: 0.2rem;" data-user-uid="${uid}" class="quota-input">
                    <button data-action="set-quota" data-user-uid="${uid}">Set</button>
                </td>
                <td>
                    <select data-action="set-tier" data-user-uid="${uid}" class="tier-select">${tierOptions}</select>
                </td>
                <td>
                    ${completedTasksCount} Total <small>(B:${tierCounts.Basic}, G:${tierCounts.Gold}, P:${tierCounts.Platinum}, D:${tierCounts.Diamond})</small>
                </td>
                <td>$${user.balance.toFixed(2)}</td>
                <td class="${statusClass}">${user.status.charAt(0).toUpperCase() + user.status.slice(1)}</td>
                <td><button data-action="toggle-block" data-user-uid="${uid}">${blockButtonText}</button></td>
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
        if (user.tasks && typeof user.tasks === 'object') {
            Object.values(user.tasks).forEach(task => {
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
    }

    if (!hasPendingTasks) {
        container.innerHTML = '<p>There are no pending tasks to review.</p>';
    }
},

renderAdminPage() {
    if (this.appState.role !== 'admin') return;

    // Always render the content
    this.renderUserManagementTable();
    this.renderPendingTasks();

    // Populate all dropdowns needed on the admin page
    this.populateAdminUserDropdown(document.getElementById('assign-by-category-form'));
    this.populateAdminUserDropdown(document.getElementById('admin-credit-form'));
    this.populateAdminUserDropdown(document.getElementById('admin-fund-form'));
    this.populateAdminCategoryDropdown(document.getElementById('assign-by-category-form'));
},

handleTaskApproval(userUid, taskId, isApproved) {
    const userRef = firebase.database().ref('users/' + userUid);
    userRef.once('value').then((snapshot) => {
        const user = snapshot.val();
        if (!user || !user.tasks) return;

        const taskRef = firebase.database().ref(`users/${userUid}/tasks/${taskId}`);

        if (isApproved) {
            const tierInfo = this.tiers[user.tasks[taskId].tier] || this.tiers['Basic'];
            const newBalance = (user.balance || 0) + tierInfo.earning;
            taskRef.update({ status: 'completed' });
            firebase.database().ref(`users/${userUid}/balance`).set(newBalance);
        } else {
            taskRef.update({ status: 'started' }); // Return task to user to re-submit
        }
        // The real-time listener for admins will automatically refresh the UI.
    });
},

handleAssignTaskToUser(taskId) {
    const userEmail = prompt("Enter the email of the user to assign this task to:");
    if (!userEmail) return;

    const targetUserEntry = Object.entries(this.allUsers).find(([uid, user]) => user.email === userEmail.toLowerCase());
    if (!targetUserEntry) {
        return this.addNotification("User not found. Please enter a valid user email.", "error");
    }

    const [targetUid, targetUser] = targetUserEntry;
    
    // Admins assign from their own task pool
    const adminTasks = this.appState.tasks ? Object.values(this.appState.tasks) : [];
    const taskToAssign = adminTasks.find(t => t.id === taskId && t.status === 'unassigned');

    if (taskToAssign) {
        const newTask = { ...taskToAssign, status: 'available' };
        // Use the task's unique ID as the key to prevent duplicates and ensure object structure
        const userTaskRef = firebase.database().ref(`users/${targetUid}/tasks/${taskToAssign.id}`);
        userTaskRef.set(newTask);
        this.addNotification(`Task "${taskToAssign.description}" assigned to ${targetUser.name}.`, 'success');

        // Remove the task from the admin's pool
        const adminTaskRef = firebase.database().ref(`users/${this.currentFirebaseUser.uid}/tasks/${taskId}`);
        adminTaskRef.remove();

    }
},

handleBulkAssign(targetUid, amountToAssign, category = null) {
    const targetUser = this.allUsers[targetUid];
    if (!targetUser) {
        return this.addNotification('User not found.', 'error');
    }

    // Filter out tasks the user already has
    const userTaskIds = targetUser.tasks ? Object.keys(targetUser.tasks).map(id => parseInt(id)) : [];
    
    // Admins assign from their own pool of 'unassigned' tasks, not the global marketplace.
    const adminTasks = this.appState.tasks ? Object.values(this.appState.tasks) : [];
    let availableMarketplaceTasks = adminTasks.filter(task => task.status === 'unassigned' && !userTaskIds.includes(task.id));

    // If a category is specified, filter by it
    if (category) {
        availableMarketplaceTasks = availableMarketplaceTasks.filter(task => task.type === category);
    }

    if (availableMarketplaceTasks.length < amountToAssign) {
        const categoryText = category ? ` in the '${category}' category` : 'in your assignment pool';
        return this.addNotification(`Not enough unique tasks${categoryText}. Only ${availableMarketplaceTasks.length} available.`, 'error');
    }

    const tasksToAssign = availableMarketplaceTasks.slice(0, amountToAssign);
    const updates = {};
    tasksToAssign.forEach(task => {
        // Assign the task to the target user
        updates[`/users/${targetUid}/tasks/${task.id}`] = { ...task, status: 'available' };
        // Remove the task from the admin's pool by setting it to null
        updates[`/users/${this.currentFirebaseUser.uid}/tasks/${task.id}`] = null;
    });

    firebase.database().ref().update(updates);
    this.addNotification(`Successfully assigned ${amountToAssign} tasks to ${targetUser.name}.`, 'success');
},

// --- Initialization Function ---
populateAdminUserDropdown(targetForm) {
    // Default to the credit form if no specific form is provided.
    const form = targetForm || document.getElementById('admin-credit-form');
    if (!form) return; // Exit if the form doesn't exist

    // Prevent adding duplicate dropdowns
    const existingSelect = form.querySelector('select[name="user-select"]');
    if (existingSelect) {
        existingSelect.remove();
    }

    const select = document.createElement('select');
    select.name = 'user-select'; // The name attribute for the form

    let options = '<option value="">-- Select a User --</option>';
    for (const uid in this.allUsers) {
        const user = this.allUsers[uid];
        if (user.role !== 'admin') {
            options += `<option value="${uid}">${user.name} (${user.email})</option>`;
        }
    }
    select.innerHTML = options;

    // Add the dropdown to the form
    const firstInput = form.querySelector('label');
    form.insertBefore(select, firstInput);
},
addFormElements(formId, elements) {
    const form = document.getElementById(formId);
    if (form) {
        form.innerHTML = elements;
    }
},
populateAdminCategoryDropdown(targetForm) {
    if (!targetForm) return;

    // Get unique task types from the admin's unassigned task pool
    const adminTasks = this.appState.tasks ? Object.values(this.appState.tasks) : [];
    const categories = [...new Set(adminTasks.filter(t => t.status === 'unassigned').map(task => task.type))];

    let options = '<option value="">-- Select a Category --</option>';
    categories.forEach(category => {
        options += `<option value="${category}">${category}</option>`;
    });

    let select = targetForm.querySelector('select[name="category-select"]');
    if (!select) {
        // If the select element doesn't exist, create and insert it.
        select = document.createElement('select');
        select.name = 'category-select';
        targetForm.insertBefore(select, targetForm.querySelector('label')); // Insert before the amount label
    }
    
    select.innerHTML = options; // Populate with the latest categories

    const userSelect = targetForm.querySelector('select[name="user-select"]');
    if (userSelect && !existingSelect) {
        userSelect.parentNode.insertBefore(select, userSelect.nextSibling);
    }
},

/**
 * CONCEPTUAL FUNCTION: Generates a new task by calling an external API.
 * This is a placeholder to show where you would integrate a service like Google Custom Search API.
 * @param {string} taskType - The type of task to generate (e.g., 'YouTube Comment').
 * @returns {Promise<object|null>} A new task object or null if generation fails.
 */
async generateNewTaskFromAPI(taskType, category, location, API_KEY) {
    const SEARCH_ENGINE_ID = '814c00fbd2f1544e6'; // Your Search Engine ID

    let query = '';
    let tier = 'Basic'; // Default tier

    // Assign a tier to the generated task randomly for variety.
    const rand = Math.random();
    if (rand > 0.9) tier = 'Diamond';
    else if (rand > 0.7) tier = 'Platinum';
    else if (rand > 0.4) tier = 'Gold';

    // --- Define your search categories and topics here ---
    const googleReviewCategories = ['restaurant', 'beauty salon', 'mechanic', 'bookstore', 'plumber'];
    const googleReviewLocations = ['new york ny', 'los angeles ca', 'chicago il', 'houston tx', 'phoenix az'];
    const youtubeTopics = ['product review', 'unboxing video', 'educational tutorial', 'comedy sketch', 'documentary short'];

    if (taskType === 'YouTube Comment') {
        // Select a random topic for YouTube
        query = `inurl:youtube.com "${category}"`;
    } else if (taskType === 'Google Review') {
        // Select a random category and location for Google Reviews
        query = `inurl:google.com/maps "${category}" in "${location || ''}"`;
    } else {
        console.error('Unsupported task type for generation');
        return null;
    }

    try {
        // Add &num=1 to the URL to request only a single search result
        const url = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&num=1`;
        console.log("Requesting URL:", url); // Added for easier debugging
        const response = await fetch(url);
        const data = await response.json();

        if (data.items && data.items.length > 0) {
            const firstResult = data.items[0]; // Get the first search result
            const newTask = {
                // Use a more unique ID to prevent collisions when generating tasks quickly
                id: Date.now() + Math.floor(Math.random() * 1000),
                type: taskType,
                description: `Perform a task for: ${firstResult.title}`,
                link: firstResult.link, 
                instructions: `Please leave a positive and relevant ${taskType.toLowerCase()}.`,
                tier: tier,
                status: 'unassigned'
            };
            return newTask;
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
    this.dom.userInfo.querySelector('span:first-child').textContent = `Welcome, ${this.appState.name}!`;

    // Check role and show admin panel if applicable
    if (this.appState.role === 'admin') {
        this.dom.userInfo.querySelector('span:first-child').textContent += ' (Admin)'; // Add admin tag to welcome message
        this.dom.mainNav.querySelector('button[data-page="admin"]').style.display = 'inline-block'; // Show the Admin button in the nav
        // --- Hide unnecessary tabs for admin ---
        this.dom.mainNav.querySelector('button[data-page="stats"]').style.display = 'none';
        this.dom.mainNav.querySelector('button[data-page="info"]').style.display = 'none';
        this.dom.mainNav.querySelector('button[data-page="finances"]').style.display = 'none'; // Keep profile for logout
    }

    // Initial UI setup
    this.updateBalanceUI();
    // renderHistory(); // No need to render it initially, only when page is viewed
    this.addNotification('Welcome to the platform! Complete tasks to earn money.', 'info');
},

// --- Event Handlers ---
attachEventListeners() {
    // This listener is for the withdraw form on the "Finances" page
    this.dom.withdrawForm.addEventListener('submit', (e) => {
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

    // This listener is for the main tasks page container
    this.dom.pageTasks.addEventListener('click', (e) => {
        const button = e.target.closest('button'); // Find the nearest button, even if the click was on an icon/text inside it

        if (button) {
            // Find the task before making any changes
            const action = button.dataset.action;
            const taskId = parseInt(button.dataset.taskId);
            let stateChanged = false;

            if (action === 'reserve' && this.appState.role !== 'admin') {
                if (this.appState.status === 'blocked') {
                    return this.addNotification('Your account is currently suspended. Please contact an administrator.', 'error');
                }
                if (this.appState.tasksAssignedToday >= this.appState.dailyTaskQuota) {
                    return this.addNotification(`You have reached your daily limit of ${this.appState.dailyTaskQuota} assigned tasks.`, 'error');
                }
                const creditCost = this.getCurrentTierInfo().creditCost;
                if (this.appState.credits < creditCost) {
                    return this.addNotification('You do not have enough credits to reserve this task.', 'error');
                }
                const taskToReserve = this.marketplaceTasks.find(t => t.id === taskId);
                if (taskToReserve) {
                    this.appState.credits -= creditCost;
                    this.appState.tasksAssignedToday = (this.appState.tasksAssignedToday || 0) + 1;
                    const newTask = { ...taskToReserve, status: 'available' };
                    // Use update to add the new task to the tasks object, using its ID as the key
                    firebase.database().ref(`users/${this.currentFirebaseUser.uid}/tasks/${newTask.id}`).set(newTask);
                    this.addNotification(`Task "${taskToReserve.description}" reserved successfully!`, 'success');
                }
                return;
            } else if (action === 'assign-to-user' && this.appState.role === 'admin') {
                // This handles the "Assign" button on individual marketplace tasks
                this.handleAssignTaskToUser(taskId);
                return;
            }

            const task = this.appState.tasks ? this.appState.tasks[taskId] : null;

            // If the task is not in the user's list, it might be a marketplace action (like admin assign)
            if (!task) {
                if (action === 'assign-to-user' && this.appState.role === 'admin') {
                    this.handleAssignTaskToUser(taskId);
                }
                return; // Stop if no user task is found and it's not a known marketplace action
            }

            if (task && action === 'start') {
                const creditCost = this.getCurrentTierInfo().creditCost;
                if (this.appState.credits < creditCost) {
                    return this.addNotification('You do not have enough credits to start this task.', 'error');
                }
                this.appState.credits -= creditCost;
                task.status = 'started';
                this.updateBalanceUI();
                this.logHistory(`Used ${creditCost} credit for task: "${task.description}"`, 0); // Logging credit use, no monetary change
                stateChanged = true;
                this.addNotification(`Task started! ${creditCost} credit has been used.`, 'info');
            } else if (task && action === 'finish') {
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

    // --- Page Navigation ---
    this.dom.mainNav.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const pageId = e.target.dataset.page;

            // Update active button
            this.dom.mainNav.querySelector('.active').classList.remove('active');
            e.target.classList.add('active');

            // Update active page
            this.dom.pages.forEach(page => {
                page.classList.toggle('active', page.id === `page-${pageId}`);
            });

            if (pageId === 'finances') {
                this.renderHistory();
            }
            if (pageId === 'tasks') {
                this.renderMarketplaceTasks();
                // Also re-render the user's personal tasks when they navigate back to the tasks page
                this.renderTasks();
            }
            if (pageId === 'profile') {
                // Profile button is now in the header, this page is less relevant for main nav
            }
            if (pageId === 'admin') {
                // Re-render the admin table every time the page is viewed
                this.renderUserManagementTable();
                this.renderPendingTasks();
                this.renderMarketplaceTasks();
                this.renderAdminPage();
            }
        }
    });

    // Listener for the new task sub-navigation tabs
    const taskSubNav = document.getElementById('task-sub-nav');
    if (taskSubNav) {
        taskSubNav.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                const tabId = e.target.dataset.taskTab;
                // Update active button
                taskSubNav.querySelector('.active')?.classList.remove('active');
                e.target.classList.add('active');
                // Update active tab content
                document.querySelectorAll('.task-tab-content').forEach(content => {
                    content.style.display = content.id === `${tabId}-task-list` ? 'block' : 'none';
                });
            }
        });
    }

    // Listener for the new ADMIN sub-navigation tabs
    const adminSubNav = document.getElementById('admin-sub-nav');
    if (adminSubNav) {
        adminSubNav.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                const tabId = e.target.dataset.adminTab;
                adminSubNav.querySelector('.active')?.classList.remove('active');
                e.target.classList.add('active');
                document.querySelectorAll('.admin-tab-content').forEach(content => {
                    content.style.display = content.id === `admin-tab-${tabId}` ? 'block' : 'none';
                });
            }
        });
    }
    // This listener is for the profile form
    this.dom.profileForm.addEventListener('submit', (e) => {
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

    // This listener is for the admin credit form
    this.dom.adminCreditForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formElements = e.target.elements;
        const selectedUid = formElements['user-select'].value;
        const amount = parseInt(e.target.elements['credit-amount'].value, 10);

        if (!selectedUid) {
            return this.addNotification('Please select a user to credit.', 'error');
        }
        if (isNaN(amount) || amount <= 0) {
            return this.addNotification('Please enter a valid credit amount.', 'error');
        }

        // Find the user in the database and update their balance
        const userToCredit = this.allUsers[selectedUid];
        if (userToCredit) {
            userToCredit.credits = (userToCredit.credits || 0) + amount;
            userToCredit.creditsPurchased = (userToCredit.creditsPurchased || 0) + amount;
            // Call updateUserTier to determine the new tier, but don't save the whole object.
            this.updateUserTier.call({ appState: userToCredit }); 
            // Use .update() to safely change only the necessary fields without overwriting the whole user object.
            firebase.database().ref('users/' + selectedUid).update({
                credits: userToCredit.credits,
                creditsPurchased: userToCredit.creditsPurchased,
                tier: userToCredit.tier
            });
            this.addNotification(`Admin credit: ${amount} credits have been added to ${userToCredit.name}'s account.`, 'success');
        }

        e.target.reset();
    });

    // Listener for the new admin fund form
    const adminFundForm = document.getElementById('admin-fund-form');
    if (adminFundForm) {
        adminFundForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formElements = e.target.elements;
            const selectedUid = formElements['user-select'].value;
            const amount = parseFloat(e.target.elements['fund-amount'].value);

            if (!selectedUid) return this.addNotification('Please select a user.', 'error');
            if (isNaN(amount) || amount <= 0) return this.addNotification('Please enter a valid amount.', 'error');

            const userToFund = this.allUsers[selectedUid];
            if (userToFund) {
                const newBalance = (userToFund.balance || 0) + amount;
                firebase.database().ref(`users/${selectedUid}/balance`).set(newBalance);
                this.addNotification(`$${amount.toFixed(2)} has been added to ${userToFund.name}'s balance.`, 'success');
            }
            e.target.reset();
        });
    }


    // This listener is for the header (logout and profile button)
    this.dom.userInfo.addEventListener('click', (e) => {
        if (e.target.id === 'logout-btn') {
            e.preventDefault();
            firebase.auth().signOut();
        }
    });

    // Consolidated listener for the entire admin page.
    this.dom.adminPage.addEventListener('click', async (e) => {
        const target = e.target;
        const action = target.dataset.action;
        const userUid = target.dataset.userUid || target.closest('[data-user-uid]')?.dataset.userUid;

        if (!action) return; // Exit if the clicked element has no action

        if (action === 'approve' || action === 'reject') {
            const taskId = parseInt(target.dataset.taskId);
            this.handleTaskApproval(userUid, taskId, action === 'approve');
        } else if (action === 'set-tier' && target.tagName === 'SELECT') {
            const newTier = target.value;
            firebase.database().ref(`users/${userUid}/tier`).set(newTier);
            this.addNotification(`User's tier updated to ${newTier}.`, 'success');
        } else if (action === 'toggle-block') {
            const user = this.allUsers[userUid];
            if (user) {
                const newStatus = user.status === 'active' ? 'blocked' : 'active';
                firebase.database().ref(`users/${userUid}/status`).set(newStatus);
                this.addNotification(`User ${user.name} has been set to ${newStatus}.`, 'success');
            }
        } else if (action === 'set-quota') {
            // Find the input field associated with the clicked "Set" button
            const input = target.previousElementSibling;
            if (input && input.classList.contains('quota-input')) {
                const user = this.allUsers[userUid];
                if (user) {
                    const newQuota = parseInt(input.value, 10);
                    if (!isNaN(newQuota)) {
                        firebase.database().ref(`users/${userUid}/dailyTaskQuota`).set(newQuota);
                        this.addNotification(`${user.name}'s daily task quota has been set to ${newQuota}.`, 'success');
                    }
                }
            }
        }
    });

    this.dom.adminPage.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;

        if (form.id === 'task-generation-form') {
            const category = document.getElementById('generate-task-category').value;
            const location = document.getElementById('generate-task-location').value;
            const numToGenerate = parseInt(document.getElementById('generate-tasks-amount').value, 10);

            if (isNaN(numToGenerate) || numToGenerate < 1 || numToGenerate > 100) {
                return this.addNotification('Please enter a number between 1 and 100.', 'error');
            }
            if (!category) return this.addNotification('Please enter a category or topic to search for.', 'error');

            // --- Add loading state to the button ---
            console.log('Starting task generation...');
            const button = form.querySelector('button');
            button.disabled = true;
            button.textContent = 'Generating...';

            this.addNotification('Generating new tasks... Please wait.', 'info');
            const newTasksPromises = [];
            // Determine task type based on whether a location was provided
            const taskType = location ? 'Google Review' : 'YouTube Comment';
            const googleSearchApiKey = 'AIzaSyDYcHahEotRafzgRUXLyx1-hDM_WkxdZhs'; // This key is now isolated.
            for (let i = 0; i < numToGenerate; i++) {
                newTasksPromises.push(this.generateNewTaskFromAPI(taskType, category, location, googleSearchApiKey));
            }
            const generatedTasks = await Promise.all(newTasksPromises);
            const filteredTasks = generatedTasks.filter(task => task !== null);

            // Instead of adding to the marketplace, add to the admin's own task list.
            const updates = {};
            filteredTasks.forEach(task => {
                // Use a special status to denote tasks ready for assignment.
                updates[`/users/${this.currentFirebaseUser.uid}/tasks/${task.id}`] = { ...task, status: 'unassigned' };
            });
            firebase.database().ref().update(updates);

            this.addNotification(`${filteredTasks.length} new tasks have been generated and added to your assignment pool.`, 'success');

            // --- Restore the button's original state ---
            button.disabled = false;
            button.textContent = 'Generate New Tasks';
        } else if (form.id === 'auto-assign-form') {
            const amountToAssign = parseInt(e.target.elements['auto-assign-amount'].value, 10);
            if (isNaN(amountToAssign) || amountToAssign <= 0) {
                return this.addNotification('Please enter a valid number of tasks to assign.', 'error');
            }
            // The logic for auto-assign needs to be implemented. For now, just acknowledging.
            this.addNotification(`Auto-assign functionality for ${amountToAssign} tasks is not yet fully implemented.`, 'info');
        } else if (form.id === 'manual-assign-form') {
            // This form is now obsolete and replaced by the category assignment form.
        } else if (form.id === 'assign-by-category-form') {
            const targetUid = e.target.elements['user-select'].value;
            const category = e.target.elements['category-select'].value;
            const amountToAssign = parseInt(e.target.elements['assign-by-category-amount'].value, 10);
            if (!targetUid || !category) {
                return this.addNotification('Please select a user and a category.', 'error');
            }
            if (isNaN(amountToAssign) || amountToAssign <= 0) {
                return this.addNotification('Please enter a valid number of tasks.', 'error');
            }
            this.handleBulkAssign(targetUid, amountToAssign, category); // Use the more generic bulk assign function
        }
    });
},

start(user) {
    this.currentFirebaseUser = user;
    const userRef = firebase.database().ref('users/' + user.uid);

    // Add a real-time listener for the current user's data.
    // This listener ONLY updates the state object and the balance UI. It does NOT render pages.
    userRef.on('value', (userSnapshot) => {
        this.appState = userSnapshot.val() || {};
        if (!this.appState) return; // Stop if there's no data

        this.updateBalanceUI(); // Always keep balance updated

        // This block should only run ONCE to set up role-specific listeners and initial UI
        if (!this.listenersAttached) {
            this.listenersAttached = true; // Prevent this from running on every data update

            // If the user is an admin, set up the listener for all users.
            if (this.appState.role === 'admin') {
                // This listener will now handle rendering the admin-specific components
                // once the data is available, solving the race condition.
                firebase.database().ref('users').on('value', (allUsersSnapshot) => {
                    this.allUsers = allUsersSnapshot.val() || {};
                    this.renderUserManagementTable();
                    this.renderPendingTasks();
                });
            }

            this.checkAndResetDailyCounter();
            this.initializeApp();
        }
    });

    // Listen for marketplace tasks.
    // This listener ONLY updates the state object. It does NOT render pages.
    firebase.database().ref('marketplaceTasks').on('value', (snapshot) => { 
        this.marketplaceTasks = snapshot.val() || []; // Ensure it's always an array
        // Re-render ONLY if the user is currently on the tasks page.
        if (this.dom.pageTasks.classList.contains('active')) {
            this.renderMarketplaceTasks(); 
        }
        // Also update category dropdown if admin is on the admin page
        if (this.appState.role === 'admin' && this.dom.adminPage.classList.contains('active')) {
            this.renderAdminPage();
        }
    });
},

cacheDom() {
    this.dom.userInfo = document.getElementById('user-info');
    this.dom.balanceEl = document.getElementById('current-balance');
    this.dom.toastContainer = document.getElementById('toast-container');
    this.dom.pageTasks = document.getElementById('page-tasks');
    this.dom.inProgressTaskList = document.getElementById('in-progress-task-list');
    this.dom.availableTaskList = document.getElementById('available-task-list');
    this.dom.pendingTaskList = document.getElementById('pending-task-list');
    this.dom.rejectedTaskList = document.getElementById('rejected-task-list');
    this.dom.historyList = document.getElementById('history-list');
    this.dom.mainNav = document.getElementById('main-nav');
    this.dom.adminPage = document.getElementById('page-admin');
    this.dom.marketplaceTaskList = document.getElementById('marketplace-task-list');
    this.dom.pages = document.querySelectorAll('.page');
    this.dom.withdrawForm = document.getElementById('withdraw-form');
    this.dom.profileForm = document.getElementById('profile-form');
    this.dom.adminCreditForm = document.getElementById('admin-credit-form');

    // --- Pre-populate empty forms with their inner HTML ---
    this.addFormElements('assign-by-category-form', `
        <!-- User and category dropdowns will be inserted here by JavaScript -->
        <label for="assign-by-category-amount">Number of Tasks to Assign:</label>
        <input type="number" id="assign-by-category-amount" name="assign-by-category-amount" min="1" value="5" required>
        <button type="submit">Assign Tasks</button>
    `);
    this.addFormElements('admin-credit-form', `
        <!-- User dropdown will be inserted here -->
        <label for="credit-amount">Credits to Add (+)</label>
        <input type="number" id="credit-amount" name="credit-amount" placeholder="e.g., 50" step="1" required min="1">
        <button type="submit">Add Credits</button>
    `);
    this.addFormElements('admin-fund-form', `
        <!-- User dropdown will be inserted here -->
        <label for="fund-amount">Funds to Add ($)</label>
        <input type="number" id="fund-amount" name="fund-amount" placeholder="e.g., 25.00" step="0.01" required min="0.01">
        <button type="submit">Add Funds</button>
    `);
}
};

// --- Run the App ---
document.addEventListener('DOMContentLoaded', () => {
    // This flag ensures event listeners are only attached once.
    let appInitialized = false;

    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            if (!appInitialized) {
                ReviewMasterApp.cacheDom();
                ReviewMasterApp.attachEventListeners();
                appInitialized = true;
            }
            ReviewMasterApp.start(user);
        } else {
            // User is signed out.
            window.location.replace('login.html');
        }
    });
});
