document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const notificationArea = document.getElementById('notification-area');

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = e.target.elements['new-email'].value.trim().toLowerCase();
        const password = e.target.elements['new-password'].value;
        const confirmPassword = e.target.elements['confirm-password'].value;

        // Load existing database from localStorage or create a new one
        let database = JSON.parse(localStorage.getItem('taskAppDatabase')) || { users: {} };

        // --- Validation ---
        if (!email.includes('@') || !email.includes('.')) {
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
        const nameFromEmail = email.split('@')[0]; // Create a display name from the email
        database.users[email] = {
            password: password,
            name: nameFromEmail,
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
        // "Log in" the user by saving their email
        localStorage.setItem('loggedInUser', email);

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
