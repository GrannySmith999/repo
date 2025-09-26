// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA3-nTaUBoevijH4Ajt8HDG6_ouD3vjt7Q",
    authDomain: "taskmanager-88b83.firebaseapp.com",
    // This is the correct URL for your new Realtime Database
    databaseURL: "https://taskmanager-88b83-default-rtdb.firebaseio.com/", 
    projectId: "taskmanager-88b83",
    storageBucket: "taskmanager-88b83.appspot.com",
    messagingSenderId: "915611634915",
    appId: "1:915611634915:web:06f51aafb6de38877109d6",
    measurementId: "G-TZSGXEFJLT"
};

// Initialize Firebase only if it hasn't been initialized yet
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
