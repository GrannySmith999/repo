
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const notificationArea = document.getElementById('notification-area');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const loginIdentifier = e.target.elements.email.value.trim(); // Can be email or username
        const password = e.target.elements.password.value;

        // Load existing database from localStorage
        attemptLogin(loginIdentifier, password);
    });

    function attemptLogin(identifier, password) {
        const database = JSON.parse(localStorage.getItem('taskAppDatabase')) || { users: {} };

        let user = null;
        let userKey = null; // The key in the database is the email

        for (const key in database.users) {
            const potentialUser = database.users[key];
            const identifierLower = identifier.toLowerCase();
            if ((potentialUser.email && potentialUser.email.toLowerCase() === identifierLower) || (potentialUser.name && potentialUser.name.toLowerCase() === identifierLower)) {
                user = potentialUser;
                userKey = key;
                break;
            }
        }

        if (user && user.password === password) {
            if (user.status === 'blocked') {
                return showNotification('This account has been suspended. Please contact support.', 'error');
            }
            // "Log in" the user by saving their primary key (email)
            localStorage.setItem('loggedInUser', userKey);
            // Redirect to the main dashboard, removing the query parameters from the URL
            window.location.replace('index.html');
        } else {
            showNotification('Invalid email or password.', 'error');
        }
    }

    function showNotification(message, type) {
        notificationArea.innerHTML = ''; // Clear previous notifications
        const notification = document.createElement('div');
        const title = type.charAt(0).toUpperCase() + type.slice(1);
        notification.className = `notification ${type}`;
        notification.innerHTML = `<strong>${title}:</strong> ${message}`;
        notificationArea.appendChild(notification);
    }
});
