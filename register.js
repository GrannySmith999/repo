document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const notificationArea = document.getElementById('notification-area');

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = e.target.elements['new-username'].value.trim();

        // Load existing database from localStorage or create a new one
        let database = JSON.parse(localStorage.getItem('taskAppDatabase')) || { users: {} };

        // --- Validation ---
        if (!username || username.length < 3) {
            return showNotification('Username must be at least 3 characters long.', 'error');
        }
        if (database.users[username]) {
            return showNotification('This username is already taken. Please choose another.', 'error');
        }

        // --- Create New User ---
        database.users[username] = {
            name: username,
            role: 'user',
            balance: 5.00, // New users start with $5
            tasks: [
                { id: Date.now(), description: 'Complete your profile setup.', status: 'available' },
                { id: Date.now() + 1, description: 'Watch the "Getting Started" tutorial video.', status: 'available' },
            ],
            history: []
        };

        // --- Save and Redirect ---
        // Save the updated database
        localStorage.setItem('taskAppDatabase', JSON.stringify(database));
        // "Log in" the user by saving their username
        localStorage.setItem('loggedInUser', username);

        // Redirect to the main dashboard
        window.location.href = 'index.html';
    });

    function showNotification(message, type) {
        notificationArea.innerHTML = ''; // Clear previous notifications
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notificationArea.appendChild(notification);
    }
});
