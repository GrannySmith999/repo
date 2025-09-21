document.addEventListener('DOMContentLoaded', () => {
    // Initialize Firebase first to ensure it's available
    const firebaseConfig = {
        apiKey: "AIzaSyArtyLtVTenPgdI6n5FfuXVZlHVqXk56Fo",
        authDomain: "review-master-app-6aeeb.firebaseapp.com",
        databaseURL: "https://review-master-app-6aeeb-default-rtdb.firebaseio.com",
        projectId: "review-master-app-6aeeb",
        storageBucket: "review-master-app-6aeeb.appspot.com",
        messagingSenderId: "610185397699",
        appId: "1:610185397699:web:29ae6847033161c196e976"
    };
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    const registerForm = document.getElementById('register-form');
    const notificationArea = document.getElementById('notification-area');

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = e.target.elements['new-username'].value.trim();
        const email = e.target.elements['new-email'].value.trim().toLowerCase();
        const password = e.target.elements['new-password'].value;
        const confirmPassword = e.target.elements['confirm-password'].value;

        // Load existing database from localStorage or create a new one
        // let database = JSON.parse(localStorage.getItem('taskAppDatabase')) || { users: {} };

        // --- Validation ---
        if (!username || username.length < 3) {
            return showNotification('Username must be at least 3 characters long.', 'error');
        }
        if (username.toLowerCase() === 'admin') {
            return showNotification('This username is reserved.', 'error');
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

        try {
            // Step 1: Create the user with Firebase Authentication
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Step 2: Create the user's profile data in the Realtime Database
            const newUserProfile = {
                name: username,
                email: email,
                status: 'active',
                credits: 50,
                agreement: null,
                role: 'user',
                tasksCompletedToday: 0,
                tasksAssignedToday: 0,
                dailyTaskQuota: 5,
                lastActivityDate: new Date().toISOString().split('T')[0],
                balance: 0.00,
                tasks: [],
                history: []
            };

            // The user's unique ID (uid) from Firebase Auth is used as the key in the database
            await firebase.database().ref('users/' + user.uid).set(newUserProfile);

            // Step 3: Automatically log the user in and redirect
            window.location.href = 'index.html';

        } catch (error) {
            // Handle Firebase errors
            if (error.code === 'auth/email-already-in-use') {
                showNotification('This email address is already in use by another account.', 'error');
            } else if (error.code === 'auth/weak-password') {
                showNotification('The password is too weak. Please use at least 6 characters.', 'error');
            } else {
                showNotification('An error occurred during registration. Please try again.', 'error');
                console.error("Firebase registration error:", error);
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
