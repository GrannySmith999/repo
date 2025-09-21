
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const notificationArea = document.getElementById('notification-area');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const identifier = e.target.elements.email.value.trim();
        const password = e.target.elements.password.value;

        // --- Validation ---
        if (!identifier || !password) {
            return showNotification('Please enter both an identifier and password.', 'error');
        }

        // Function to attempt login
        const attemptLogin = (email) => {
            return firebase.auth().signInWithEmailAndPassword(email, password);
        };

        try {
            // First, try to log in assuming the identifier is an email
            await attemptLogin(identifier.toLowerCase());
            window.location.replace('index.html');
        } catch (error) {
            // If it fails, check if it might be a username
            if (error.code === 'auth/invalid-email' || error.code === 'auth/user-not-found') {
                try {
                    // Query the database to find a user with a matching username
                    const usersRef = firebase.database().ref('users');
                    const snapshot = await usersRef.orderByChild('name').equalTo(identifier).once('value');
                    const users = snapshot.val();

                    if (users) {
                        const userKey = Object.keys(users)[0];
                        const userEmail = users[userKey].email;
                        // Try logging in with the found email
                        await attemptLogin(userEmail);
                        window.location.replace('index.html');
                    } else {
                        // If no user is found by username either, it's an invalid login
                        showNotification('Invalid email/username or password.', 'error');
                    }
                } catch (finalError) {
                    showNotification('Invalid email/username or password.', 'error');
                }
            } else {
                showNotification('Invalid email/username or password.', 'error');
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
