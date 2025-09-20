document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const notificationArea = document.getElementById('notification-area');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = e.target.elements.email.value.trim().toLowerCase();
        const password = e.target.elements.password.value;

        // Load existing database from localStorage
        const database = JSON.parse(localStorage.getItem('taskAppDatabase')) || { users: {} };
        const user = database.users[email];

        // --- Validation ---
        if (user && user.password === password) {
            // "Log in" the user by saving their email
            localStorage.setItem('loggedInUser', email);
            // Redirect to the main dashboard
            window.location.href = 'index.html';
        } else {
            showNotification('Invalid email or password.', 'error');
        }
    });

    function showNotification(message, type) {
        notificationArea.innerHTML = ''; // Clear previous notifications
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notificationArea.appendChild(notification);
    }
});
