import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import LoadingScreen from '../components/LoadingScreen';

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
        const data = docSnap.data() as UserData;
        
        // Set userData first so they can log in even if the update fails
        setUserData(data);

        // Automatically make 077167330 an admin
        if (data.email === '077167330@phone.pro-gen.com' && data.role !== 'admin') {
          try {
            await setDoc(docRef, { role: 'admin', generationsRemaining: 9999 }, { merge: true });
            setUserData({ ...data, role: 'admin', generationsRemaining: 9999 });
          } catch (e) {
            console.error('Failed to update admin role automatically:', e);
          }
        }
      } else {
        setUserData(null);
      }
    } catch (error: any) {
      console.warn('Error fetching user data:', error);
      // Gracefully handle offline errors by allowing a fallback or just empty data if we can't fetch it.
      if (error?.message?.includes('offline') || error?.code === 'unavailable' || String(error).includes('offline')) {
        // We're offline, but we still want to allow the user to see the UI if they are logged in.
        // We can create a temporary offline user object.
        const currentUser = auth.currentUser;
        const isOfflineAdmin = currentUser?.email === '077167330@phone.pro-gen.com';
        setUserData({
          uid,
          firstName: 'متصل',
          lastName: '(بدون إنترنت)',
          email: currentUser?.email || '', 
          state: '',
          phase: '',
          phone: '',
          role: isOfflineAdmin ? 'admin' : 'user',
          generationsRemaining: isOfflineAdmin ? 9999 : 1, 
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
      {loading ? <LoadingScreen /> : children}
    </AuthContext.Provider>
  );
};
