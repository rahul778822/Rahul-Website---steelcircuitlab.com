import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut 
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBfwZkGAwiGTALq8-clYU7iqFFXzJsqsbY",
  authDomain: "steelcircuitlab.firebaseapp.com",
  projectId: "steelcircuitlab",
  storageBucket: "steelcircuitlab.firebasestorage.app",
  messagingSenderId: "734672895679",
  appId: "1:734672895679:web:6fae807e2c3bacf3f8100a",
  measurementId: "G-E499BX9RW8"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);

// Authentication Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Sign-In Helper
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Google login failed", error);
    throw error;
  }
};

// Log Out Helper
export const logOut = async () => {
  await signOut(auth);
};

// Firestore User-cart Sync Helpers
export const saveUserCartToFirestore = async (userId: string, cartItems: any[]) => {
  try {
    const userCartRef = doc(db, "users", userId);
    await setDoc(userCartRef, { cart: cartItems }, { merge: true });
  } catch (error) {
    console.error("Error saving user cart to Firestore", error);
  }
};

export const loadUserCartFromFirestore = async (userId: string): Promise<any[] | null> => {
  try {
    const userCartRef = doc(db, "users", userId);
    const docSnap = await getDoc(userCartRef);
    if (docSnap.exists() && docSnap.data().cart) {
      return docSnap.data().cart;
    }
  } catch (error) {
    console.error("Error loading user cart from Firestore", error);
  }
  return null;
};
