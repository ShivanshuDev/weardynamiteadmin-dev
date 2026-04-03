import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
// Optionally get analytics/db/storage later if needed

const firebaseConfig = {
  apiKey: "AIzaSyAP5swxqPQB3_Xcvd2d6Na7d8bD5Qeh1ro",
  authDomain: "weardynamite-test.firebaseapp.com",
  projectId: "weardynamite-test",
  storageBucket: "weardynamite-test.firebasestorage.app",
  messagingSenderId: "235583110370",
  appId: "1:235583110370:web:2864b29cf1b30dfc3572bb",
  measurementId: "G-93D1B3Y8MC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export default app;
