
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const notificationArea = document.getElementById('notification-area');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = e.target.elements.email.value.trim();
        const password = e.target.elements.password.value;

        // --- Validation ---
        if (!email || !password) {
            return showNotification('Please enter both email and password.', 'error');
        }

        try {
            // Step 1: Sign in the user with Firebase Authentication
            await firebase.auth().signInWithEmailAndPassword(email, password);

            // Step 2: On successful login, redirect to the dashboard
            // The app.js file will handle loading the user's data from this point.
            window.location.replace('index.html');

        } catch (error) {
            // Handle Firebase login errors
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                showNotification('Invalid email or password.', 'error');
            } else {
                showNotification('An error occurred during login. Please try again.', 'error');
                console.error("Firebase login error:", error);
            }
        }
    });

    function showNotification(message, type) {
        notificationArea.innerHTML = ''; // Clear previous notifications
        const notification = document.createElement('div');
        const title = type.charAt(0).toUpperCase() + type.slice(1);
        notification.className = `notification ${type}`;
        notification.innerHTML = `<strong>${title}:</strong> ${message}`;
        notificationArea.appendChild(notification);
    }
});
