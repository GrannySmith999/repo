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
    this.dom.inProgressTaskList.innerHTML = '';
    this.dom.pendingTaskList.innerHTML = '';
    this.dom.rejectedTaskList.innerHTML = '';

    let hasInProgress = false, hasPending = false, hasRejected = false;

    if (!this.appState.tasks) this.appState.tasks = [];
    
    this.appState.tasks.forEach(task => {
        const taskEl = document.createElement('div');
        taskEl.className = `task status-${task.status}`; // Add status-specific class

        let statusBadge = '';
        let taskContent = '';
        let targetList = null;

        if (task.status === 'available') {
            statusBadge = `<span class="status-badge" style="background-color: var(--success-color);">Available</span>`;
            taskContent = `<p>This task is ready for you to start!</p><div class="task-actions"><button data-task-id="${task.id}" data-action="start">Start Task (${this.getCurrentTierInfo().creditCost} Credits)</button></div>`;
            targetList = this.dom.inProgressTaskList; // Show available tasks in the "In Progress" section
            hasInProgress = true;
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
            : '<p>You have no tasks in progress. Reserve one from the marketplace!</p>';
        this.dom.inProgressTaskList.innerHTML = message;
    }
    if (!hasPending) this.dom.pendingTaskList.innerHTML = '<p>You have no tasks pending review or approved.</p>';
    // Logic for rejected tasks can be added if a 'rejected' status is implemented
},

renderMarketplaceTasks() {
    this.dom.marketplaceTaskList.innerHTML = '';
    const userTaskIds = this.appState.tasks ? this.appState.tasks.map(t => t.id) : [];

    if (!this.marketplaceTasks || this.marketplaceTasks.length === 0) {
        const message = this.appState.credits === 0 && (!this.appState.tasks || this.appState.tasks.length === 0)
            ? '<p>You have no credits. Please contact your supervisor to get credits and start working.</p>'
            : '<p>No new tasks are available right now. The admin can generate more.</p>';
        this.dom.marketplaceTaskList.innerHTML = message;
        return;
    }

    const userTierInfo = this.getCurrentTierInfo();

    this.marketplaceTasks.forEach(task => {
        // Don't show tasks the user has already reserved
        if (userTaskIds.includes(task.id)) {
            return;
        }

        const isAdmin = this.appState.role === 'admin';
        // For users, only show tasks matching their tier. Admins see all.
        if (!isAdmin && task.tier !== this.appState.tier) {
            return;
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
        if (user.tasks && Array.isArray(user.tasks)) {
            user.tasks.forEach(task => {
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
        if (user.tasks && Array.isArray(user.tasks)) user.tasks.forEach(task => {
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
        const tierInfo = this.tiers[task.tier] || this.tiers['Basic'];
        user.balance += tierInfo.earning;
    } else {
        task.status = 'started'; // Return task to user to re-submit
        // We don't reclaim the money on rejection in this model
    }
    userRef.set(user); // Save the updated user object back to Firebase
    this.renderPendingTasks(); // Refresh the list
},

handleAssignTaskToUser(taskId) {
    const userEmail = prompt("Enter the email of the user to assign this task to:");
    if (!userEmail) return;

    const targetUserEntry = Object.entries(this.allUsers).find(([uid, user]) => user.email === userEmail.toLowerCase());
    if (!targetUserEntry) {
        return this.addNotification("User not found. Please enter a valid user email.", "error");
    }

    const [targetUid, targetUser] = targetUserEntry;
    const taskToAssign = this.marketplaceTasks.find(t => t.id === taskId);

    if (taskToAssign) {
        const newTask = { ...taskToAssign, status: 'available' };
        const userTasksRef = firebase.database().ref(`users/${targetUid}/tasks`);
        userTasksRef.push(newTask); // Use push to add to a list in Firebase
        this.addNotification(`Task "${taskToAssign.description}" assigned to ${targetUser.name}.`, 'success');
    }
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
    let tier = 'Basic'; // Default tier

    // Assign a tier to the generated task randomly for variety.
    const rand = Math.random();
    if (rand > 0.9) tier = 'Diamond';
    else if (rand > 0.7) tier = 'Platinum';
    else if (rand > 0.4) tier = 'Gold';

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
            const newTask = {
                id: Date.now(),
                type: taskType,
                description: `Perform a task for: ${firstResult.title}`,
                link: firstResult.link,
                instructions: `Please leave a positive and relevant ${taskType.toLowerCase()}.`,
                tier: tier,
                status: 'available'
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
        this.renderPendingTasks();
        this.renderUserManagementTable();
    }

    // Initial UI setup
    this.updateBalanceUI();
    this.renderTasks();
    this.renderMarketplaceTasks();
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
        if (e.target.tagName === 'BUTTON') {
            // Find the task before making any changes
            const action = e.target.dataset.action;
            const taskId = parseInt(e.target.dataset.taskId);
            let stateChanged = false;
            let task = this.appState.tasks ? this.appState.tasks.find(t => t.id === taskId) : null;

            if (!task) return;

            if (action === 'start') {
                const creditCost = this.getCurrentTierInfo().creditCost;
                if (this.appState.credits < creditCost) {
                    return this.addNotification('You do not have enough credits to start this task.', 'error');
                }
                this.appState.credits -= creditCost;
                task.status = 'started';
                this.updateBalanceUI();
                this.logHistory(`Used ${creditCost} credit for task: "${task.description}"`, 0); // Logging credit use, no monetary change
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
            } else if (action === 'assign-to-user') {
                const taskId = parseInt(e.target.dataset.taskId, 10);
                if (this.appState.role === 'admin') {
                    this.handleAssignTaskToUser(taskId);
                }
            }
        } else if (e.target.dataset.action === 'reserve') {
            if (this.appState.tasksAssignedToday >= this.appState.dailyTaskQuota) {
                return this.addNotification(`You have reached your daily limit of ${this.appState.dailyTaskQuota} assigned tasks.`, 'error');
            }
            const creditCost = this.getCurrentTierInfo().creditCost;
            if (this.appState.credits < creditCost) {
                return this.addNotification('You do not have enough credits to reserve this task.', 'error');
            }

            const taskId = parseInt(e.target.dataset.taskId);
            const taskToReserve = this.marketplaceTasks.find(t => t.id === taskId);

            if (taskToReserve) {
                this.appState.credits -= creditCost;
                this.appState.tasksAssignedToday = (this.appState.tasksAssignedToday || 0) + 1;

                const newTask = { ...taskToReserve, status: 'available' };
                if (!this.appState.tasks) this.appState.tasks = [];
                this.appState.tasks.push(newTask);

                this.saveAppState();
                this.addNotification(`Task "${taskToReserve.description}" reserved successfully!`, 'success');
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
            userToCredit.credits = (userToCredit.credits || 0) + amount;
            userToCredit.creditsPurchased = (userToCredit.creditsPurchased || 0) + amount;
            this.updateUserTier.call({ appState: userToCredit }); // Update tier based on new purchase total
            // Save the updated user data back to Firebase
            firebase.database().ref('users/' + selectedUsername).set(userToCredit);
            this.addNotification(`Admin credit: ${amount} credits have been added to ${userToCredit.name}'s account.`, 'success');
        }

        e.target.reset();
    });

    // This listener is for the header (logout and profile button)
    this.dom.userInfo.addEventListener('click', (e) => {
        if (e.target.getAttribute('href') === '#logout') {
            e.preventDefault();
            firebase.auth().signOut();
        }
    });

    // More specific listener for the user management table
    const userManagementTable = document.getElementById('user-management-table');
    if (userManagementTable) {
        userManagementTable.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            const userUid = e.target.dataset.userUid;
            const target = e.target;

            if (!action || !userUid) return;

            // Handle tier changes directly on the select element
            if (action === 'set-tier' && target.tagName === 'SELECT') {
                const newTier = target.value;
                firebase.database().ref(`users/${userUid}/tier`).set(newTier);
                this.addNotification(`User's tier updated to ${newTier}.`, 'success');
                return; // Stop further processing for this event
            }

            if (action === 'toggle-block') {
                const user = this.allUsers[userUid];
                if (user) {
                    user.status = user.status === 'active' ? 'blocked' : 'active';
                    firebase.database().ref(`users/${userUid}/status`).set(user.status);
                    this.addNotification(`User ${user.name} has been ${user.status}.`, 'success');
                    // The table will re-render automatically due to the database listener
                }
            } else if (action === 'set-quota') {
                const user = this.allUsers[userUid];
                const input = userManagementTable.querySelector(`.quota-input[data-user-uid="${userUid}"]`);
                if (user && input) {
                    const newQuota = parseInt(input.value, 10);
                    firebase.database().ref(`users/${userUid}/dailyTaskQuota`).set(newQuota);
                    this.addNotification(`${user.name}'s daily task quota has been set to ${newQuota}.`, 'success');
                }
            }
        });
    }    
    
    // This listener is for the admin page container, handling approvals/rejections
    this.dom.adminPage.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        if (!action) return;

        if (action === 'approve' || action === 'reject') {
            const userUid = e.target.dataset.userUid;
            const taskId = parseInt(e.target.dataset.taskId);
            this.handleTaskApproval(userUid, taskId, action === 'approve');
        }
    });

    // Listener for the task generation button
    const generateTasksBtn = document.getElementById('generate-tasks-btn');
    if (generateTasksBtn) {
        generateTasksBtn.addEventListener('click', async () => {
            const numToGenerate = parseInt(document.getElementById('generate-tasks-amount').value, 10);

            if (isNaN(numToGenerate) || numToGenerate <= 0 || numToGenerate > 100) {
                return this.addNotification('Please enter a number between 1 and 100.', 'error');
            }

            this.addNotification('Generating new tasks... Please wait.', 'info');
            const newTasks = [];
            // Generate half YouTube, half Google Review
            for (let i = 0; i < Math.ceil(numToGenerate / 2); i++) {
                newTasks.push(this.generateNewTaskFromAPI('YouTube Comment'));
            }
            for (let i = 0; i < Math.floor(numToGenerate / 2); i++) {
                newTasks.push(this.generateNewTaskFromAPI('Google Review'));
            }

            const generatedTasks = (await Promise.all(newTasks)).filter(Boolean);
            const updatedMarketplace = [...this.marketplaceTasks, ...generatedTasks];
            firebase.database().ref('marketplaceTasks').set(updatedMarketplace);
            this.addNotification(`${generatedTasks.length} new tasks have been generated!`, 'success');
        });
    }

    const autoAssignForm = document.getElementById('auto-assign-form');
    if (autoAssignForm) {
        autoAssignForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const amountToAssign = parseInt(e.target.elements['auto-assign-amount'].value, 10);
    
            if (isNaN(amountToAssign) || amountToAssign <= 0) {
                return this.addNotification('Please enter a valid number of tasks to assign.', 'error');
            }
    
            let assignedCount = 0;
            let userCount = 0;
            const availableMarketplaceTasks = [...this.marketplaceTasks];
    
            for (const uid in this.allUsers) {
                const user = this.allUsers[uid];
                if (user.role === 'user' && user.status === 'active') {
                    userCount++;
                    for (let i = 0; i < amountToAssign; i++) {
                        if ((user.tasksAssignedToday || 0) < user.dailyTaskQuota && availableMarketplaceTasks.length > 0) {
                            const taskToAssign = availableMarketplaceTasks.shift();
                            const userTasksRef = firebase.database().ref(`users/${uid}/tasks`);
                            userTasksRef.push({ ...taskToAssign, status: 'available' });
                            assignedCount++;
                        }
                    }
                }
            }
            this.addNotification(`Assigned a total of ${assignedCount} tasks to ${userCount} active users.`, 'success');
        });
    }
},

start(user) {
    this.currentFirebaseUser = user;
    const userRef = firebase.database().ref('users/' + user.uid);

    // Fetch user's profile data
    userRef.once('value').then((snapshot) => {
        this.appState = snapshot.val();
        if (this.appState) {
            // Set up listeners that depend on the user's role.
            if (this.appState.role === 'admin') {
                // For admins, listen to changes on ALL users in real-time.
                firebase.database().ref('users').on('value', (userSnapshot) => {
                    this.allUsers = userSnapshot.val() || {};
                    // Re-render admin components whenever user data changes.
                    this.renderUserManagementTable();
                    this.renderPendingTasks();
                    this.populateAdminUserDropdown();
                });
            }

            this.checkAndResetDailyCounter();
            this.initializeApp();
        }
    });

    // Listen for marketplace tasks and re-render the list when they change.
    firebase.database().ref('marketplaceTasks').on('value', (snapshot) => { this.marketplaceTasks = snapshot.val() || []; this.renderMarketplaceTasks(); });
},

cacheDom() {
    this.dom.userInfo = document.getElementById('user-info');
    this.dom.balanceEl = document.getElementById('current-balance');
    this.dom.toastContainer = document.getElementById('toast-container');
    this.dom.pageTasks = document.getElementById('page-tasks');
    this.dom.inProgressTaskList = document.getElementById('in-progress-task-list');
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
