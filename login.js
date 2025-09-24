
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
            // First, handle the most common error: correct email but wrong password.
            if (error.code === 'auth/wrong-password') {
                return showNotification('Incorrect password for that email. Please try again.', 'error');
            } 
            // If the email itself is bad, then check if it might be a username.
            else if (error.code === 'auth/invalid-email' || error.code === 'auth/user-not-found') {
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
                    if (finalError.code === 'auth/wrong-password') {
                        showNotification('Incorrect password for that username. Please try again.', 'error');
                    } else {
                        showNotification('An unexpected error occurred. Please try again.', 'error');
                        console.error("Secondary Login Error:", finalError);
                    }
                }
            } else {
                // Handle other potential Firebase auth errors
                showNotification('An unexpected error occurred during login. Please try again.', 'error');
                console.error("Login Error:", error);
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
