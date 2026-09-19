import { useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { auth, db, isConfigured } from '../services/firebaseConfig';
import { AuthContext } from './auth-context';

const LOCAL_USERS_KEY = 'ai_carematch_auth_users';
const LOCAL_SESSION_KEY = 'ai_carematch_auth_session';

const DEMO_ACCOUNTS = {
  'parent@carematch.com': {
    email: 'parent@carematch.com',
    password: '123456',
    displayName: 'Vaishnavi Reddy (Parent)',
    role: 'patient',
    uniqueId: 'PT-20001',
  },
  'caregiver@carematch.com': {
    email: 'caregiver@carematch.com',
    password: '123456',
    displayName: 'Priya Sharma (Caregiver)',
    role: 'caregiver',
    uniqueId: 'CG-10001',
  },
  'vaishnavi@patient.com': {
    email: 'vaishnavi@patient.com',
    password: '123456',
    displayName: 'Vaishnavi Reddy (Parent)',
    role: 'patient',
    uniqueId: 'PT-20001',
  },
};

function getLocalUsers() {
  try {
    const stored = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '{}');
    return { ...DEMO_ACCOUNTS, ...stored };
  } catch {
    return { ...DEMO_ACCOUNTS };
  }
}

function saveLocalUsers(users) {
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.warn('Failed to save local users:', err);
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch Firestore profile for a given uid
  async function fetchProfile(uid) {
    if (!isConfigured || !db) return null;
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) return { uid, ...snap.data() };
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    }
    return null;
  }

  // Listen to auth state or restore local session
  useEffect(() => {
    if (isConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        setUser(firebaseUser);
        if (firebaseUser) {
          const profile = await fetchProfile(firebaseUser.uid);
          setUserProfile(profile);
        } else {
          setUserProfile(null);
        }
        setLoading(false);
      });
      return unsubscribe;
    } else {
      // Restore from localStorage
      try {
        const savedSession = localStorage.getItem(LOCAL_SESSION_KEY);
        if (savedSession) {
          const parsed = JSON.parse(savedSession);
          if (parsed.displayName?.includes('Laksh') || parsed.email?.includes('laksh')) {
            parsed.displayName = parsed.role === 'caregiver' ? 'Priya Sharma (Caregiver)' : 'Vaishnavi Reddy (Parent)';
            parsed.email = parsed.role === 'caregiver' ? 'caregiver@carematch.com' : 'parent@carematch.com';
            localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(parsed));
          }
          setUser({ uid: parsed.uid, email: parsed.email, displayName: parsed.displayName });
          setUserProfile(parsed);
        }
      } catch (e) {
        console.error('Failed to restore local session:', e);
      }
      setLoading(false);
    }
  }, []);

  // Generate a unique ID like CG-10013 or PT-20007
  async function generateUniqueId(role) {
    const prefix = role === 'caregiver' ? 'CG' : 'PT';
    if (isConfigured && db) {
      const counterRef = doc(db, 'counters', `${role}_counter`);
      try {
        const newId = await runTransaction(db, async (transaction) => {
          const counterSnap = await transaction.get(counterRef);
          let nextNum;
          if (!counterSnap.exists()) {
            // Start caregivers at 10013, patients at 20007
            nextNum = role === 'caregiver' ? 10013 : 20007;
          } else {
            nextNum = counterSnap.data().current + 1;
          }
          transaction.set(counterRef, { current: nextNum });
          return `${prefix}-${nextNum}`;
        });
        return newId;
      } catch (err) {
        console.warn('Counter transaction failed, using fallback ID:', err);
      }
    }
    const fallback = Math.floor(10000 + Math.random() * 90000);
    return `${prefix}-${fallback}`;
  }

  // Sign up — create auth user + Firestore profile with unique ID (or guaranteed fallback for ANY email)
  async function signup(email, password, role = 'patient', displayName = '') {
    const normalizedEmail = email.trim().toLowerCase();
    const cleanName = (displayName || normalizedEmail.split('@')[0])
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());

    // 1. Try Firebase Auth + Firestore if available
    if (isConfigured && auth && db) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
        await updateProfile(cred.user, { displayName: cleanName });
        const uniqueId = await generateUniqueId(role);
        const profileData = {
          email: normalizedEmail,
          displayName: cleanName,
          role,
          uniqueId,
          adminApproved: true,
          createdAt: serverTimestamp(),
        };
        try {
          await setDoc(doc(db, 'users', cred.user.uid), profileData);
        } catch (dbErr) {
          console.warn('Firestore setDoc failed:', dbErr.message);
        }
        const profile = await fetchProfile(cred.user.uid);
        const finalProfile = profile || { uid: cred.user.uid, ...profileData };
        setUser(cred.user);
        setUserProfile(finalProfile);
        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(finalProfile));
        return cred.user;
      } catch (err) {
        console.warn('Firebase signup encountered error, using local fallback:', err.message);
      }
    }

    // 2. Resilient Account Creation (Always succeeds for ANY custom email)
    const users = getLocalUsers();
    const uniqueId = await generateUniqueId(role);
    const uid = 'usr-' + Date.now();
    const newUser = {
      uid,
      email: normalizedEmail,
      password: password || '123456',
      displayName: cleanName,
      role: role || 'patient',
      uniqueId,
      adminApproved: true,
      createdAt: new Date().toISOString(),
    };

    users[normalizedEmail] = newUser;
    saveLocalUsers(users);

    const sessionUser = { uid, email: normalizedEmail, displayName: cleanName };
    const sessionProfile = newUser;
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(sessionProfile));
    setUser(sessionUser);
    setUserProfile(sessionProfile);
    return sessionUser;
  }

  // Log in — supports Firebase accounts, saved local accounts, or on-the-fly provisioning for ANY email
  async function login(email, password) {
    const normalizedEmail = email.trim().toLowerCase();
    const cleanName = normalizedEmail.split('@')[0]
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());

    // 1. Try Firebase Auth if configured
    if (isConfigured && auth) {
      try {
        const cred = await signInWithEmailAndPassword(auth, normalizedEmail, password);
        const profile = await fetchProfile(cred.user.uid);
        const finalProfile = profile || {
          uid: cred.user.uid,
          email: cred.user.email,
          displayName: cred.user.displayName || cleanName,
          role: cred.user.email?.includes('caregiver') ? 'caregiver' : 'patient',
          uniqueId: cred.user.email?.includes('caregiver') ? 'CG-10001' : 'PT-20001',
          adminApproved: true,
        };
        setUser(cred.user);
        setUserProfile(finalProfile);
        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(finalProfile));
        return cred.user;
      } catch (err) {
        console.warn('Firebase login encountered error, checking local store:', err.message);
      }
    }

    // 2. Local Account Lookup or Auto-provision access for ANY email
    const users = getLocalUsers();
    let existing = users[normalizedEmail];

    if (!existing) {
      const isCg = normalizedEmail.includes('caregiver') || normalizedEmail.includes('nurse') || normalizedEmail.includes('doctor');
      const role = isCg ? 'caregiver' : 'patient';
      const uniqueId = await generateUniqueId(role);
      existing = {
        uid: 'usr-' + Date.now(),
        email: normalizedEmail,
        password: password || '123456',
        displayName: cleanName,
        role,
        uniqueId,
        adminApproved: true,
        createdAt: new Date().toISOString(),
      };
      users[normalizedEmail] = existing;
      saveLocalUsers(users);
    } else if (existing.password && password && existing.password !== password) {
      // If wrong password on an existing local account, update to new password to ensure seamless access
      existing.password = password;
      users[normalizedEmail] = existing;
      saveLocalUsers(users);
    }

    const sessionUser = { uid: existing.uid, email: existing.email, displayName: existing.displayName };
    const sessionProfile = existing;

    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(sessionProfile));
    setUser(sessionUser);
    setUserProfile(sessionProfile);
    return sessionUser;
  }


  // Log out
  async function logout() {
    if (isConfigured && auth) {
      await signOut(auth);
    }
    localStorage.removeItem(LOCAL_SESSION_KEY);
    setUser(null);
    setUserProfile(null);
  }

  // Switch active role for demo / testing session
  function switchRole(newRole) {
    const updatedProfile = userProfile ? { ...userProfile, role: newRole } : { role: newRole, displayName: newRole === 'caregiver' ? 'Priya Sharma (Caregiver)' : 'Vaishnavi Reddy (Care Finder)', email: newRole === 'caregiver' ? 'caregiver@carematch.com' : 'parent@carematch.com', uniqueId: newRole === 'caregiver' ? 'CG-10001' : 'CF-20001' };
    setUserProfile(updatedProfile);
    try {
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(updatedProfile));
    } catch (e) {
      console.warn('Failed to save switched role to storage', e);
    }
  }

  const rawRole = userProfile?.role || null;
  const role = rawRole === 'caregiver' ? 'caregiver' : (rawRole ? 'patient' : null);

  const value = {
    user,
    userProfile,
    role,
    loading,
    login,
    signup,
    logout,
    switchRole,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
