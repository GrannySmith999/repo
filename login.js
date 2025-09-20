document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const notificationArea = document.getElementById('notification-area');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const loginIdentifier = e.target.elements.email.value.trim(); // Can be email or username
        const password = e.target.elements.password.value;

        // Load existing database from localStorage
        const database = JSON.parse(localStorage.getItem('taskAppDatabase')) || { users: {} };

        // Find user by either email or username
        let user = null;
        let userKey = null; // The key in the database is the email

        for (const key in database.users) {
            const potentialUser = database.users[key];
            if (potentialUser.email.toLowerCase() === loginIdentifier.toLowerCase() || potentialUser.name.toLowerCase() === loginIdentifier.toLowerCase()) {
                user = potentialUser;
                userKey = key;
                break;
            }
        }

        // --- Validation ---
        if (user && user.password === password) {
            if (user.status === 'blocked') {
                return showNotification('This account has been suspended. Please contact support.', 'error');
            }
            // "Log in" the user by saving their primary key (email)
   
