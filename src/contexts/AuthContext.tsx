import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export type UserRole = 'user' | 'admin';

export interface UserData {
  uid: string;
  firstName: string;
  lastName: string;
  state: string;
  phase: string;
  email: string;
  phone: string;
  role: UserRole;
  generationsRemaining: number;
  totalGenerations: number;
  profilePic?: string;
  isActive: boolean;
  createdAt: number;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  signOut: async () => {},
  refreshUserData: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (uid: string) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserData(docSnap.data() as UserData);
      } else {
        setUserData(null);
      }
    } catch (error: any) {
      console.error('Error fetching user data:', error);
      // Gracefully handle offline errors by allowing a fallback or just empty data if we can't fetch it.
      if (error?.message?.includes('offline') || error?.code === 'unavailable') {
        // We're offline, but we still want to allow the user to see the UI if they are logged in.
        // We can create a temporary offline user object.
        setUserData({
          uid,
          firstName: 'متصل',
          lastName: '(بدون إنترنت)',
          email: '', // Not passing user object directly because it's out of scope here
          state: '',
          phase: '',
          phone: '',
          role: 'user',
          generationsRemaining: 1, // Allow 1 generation just so the UI works, though the API will fail anyway.
          totalGenerations: 0,
          isActive: true,
          createdAt: Date.now()
        });
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchUserData(currentUser.uid);
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const refreshUserData = async () => {
    if (user) {
      await fetchUserData(user.uid);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, signOut, refreshUserData }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
