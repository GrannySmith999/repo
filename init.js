// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDYcHahEotRafzgRUXLyx1-hDM_WkxdZhs",
    authDomain: "review-master-app-6aeeb.firebaseapp.com",
    databaseURL: "https://review-master-app-6aeeb-default-rtdb.firebaseio.com",
    projectId: "review-master-app-6aeeb",
    storageBucket: "review-master-app-6aeeb.appspot.com",
    messagingSenderId: "610185397699",
    appId: "1:610185397699:web:29ae6847033161c196e976"
};

// Initialize Firebase only if it hasn't been initialized yet
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
