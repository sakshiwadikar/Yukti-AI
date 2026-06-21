import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCtiMX0DgZl8Qoy5WfoP8vizlFgs_eUrWw",
  authDomain: "yukti-ai-123.firebaseapp.com",
  projectId: "yukti-ai-123",
  storageBucket: "yukti-ai-123.firebasestorage.app",
  messagingSenderId: "908278554518",
  appId: "1:908278554518:web:6a8a2a37b2b787c1a7c7b7",
  measurementId: "G-J4X9W2R5TW"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
