document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const notificationArea = document.getElementById('notification-area');

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = e.target.elements['new-username'].value.trim();
        const email = e.target.elements['new-email'].value.trim().toLowerCase();
        const password = e.target.elements['new-password'].value;
        const confirmPassword = e.target.elements['confirm-password'].value;

        // Load existing database from localStorage or create a new one
        let database = JSON.parse(localStorage.getItem('taskAppDatabase')) || { users: {} };

        // --- Validation ---
        if (!username || username.length < 3) {
            return showNotification('Username must be at least 3 characters long.', 'error');
        }
        if (username.toLowerCase() === 'admin') {
            return showNotification('This username is reserved.', 'error');
        }
        // Check if username is already taken by iterating through users
        const usernameExists = Object.values(database.users).some(user => user.name.toLowerCase() === username.toLowerCase());
        if (usernameExists) {
            return showNotification('This username is already taken.', 'error');
        }
        if (!email.includes('@') || !email.includes('.')) { // Basic email validation
            return showNotification('Please enter a valid email address.', 'error');
        }
        if (password.length < 6) {
            return showNotification('Password must be at least 6 characters long.', 'error');
        }
        if (password !== confirmPassword) {
            return showNotification('Passwords do not match.', 'error');
        }
        if (database.users[email]) {
            return showNotification('An account with this email already exists.', 'error');
        }

        // --- Create New User ---
        // WARNING: Storing passwords in plain text is insecure.
        // This is for prototyping only. A real app MUST hash passwords on a server.
        database.users[email] = {
            password: password,
            name: username, // Store the chosen username
            email: email, // Store the email as well
            status: 'active', // New users are active by default
            credits: 50, // New users start with 50 credits
            agreement: null, // No agreement submitted initially
            role: 'user',
            tasksCompletedToday: 0,
            tasksAssignedToday: 0,
            dailyTaskQuota: 5, // Default quota for new users
            lastActivityDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
            balance: 0.00, // New users start with $0 balance
            tasks: [], // Start with an empty task list; they can get tasks from the marketplace.
            history: []
        };

        // --- Auto-assign starter tasks for new user (if available in marketplace) ---
        if (database.marketplaceTasks && database.marketplaceTasks.length > 0) {
            const starterTasks = database.marketplaceTasks.slice(0, 20).map(task => ({
                ...task,
                id: Date.now() + Math.random(), // Ensure unique ID
                status: 'available'
            }));
            database.users[email].tasks = starterTasks;
            database.users[email].tasksAssignedToday = starterTasks.length;
        }


        // --- Save and Redirect ---
        // Save the updated database
        localStorage.setItem('taskAppDatabase', JSON.stringify(database));
        // "Lo
