import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

export interface Site {
  id?: string;
  url: string;
  siteId: string;
  cms: string;
  template: string;
  createdAt?: string;
}

const isBrowser = typeof window !== 'undefined';

export const INITIAL_SITES: Site[] = [
  { url: 'suaramerdeka.com', siteId: '04', cms: '1', template: 'news', createdAt: new Date().toISOString() },
  { url: 'smol.id', siteId: '05', cms: '1', template: 'news', createdAt: new Date().toISOString() },
  { url: 'ayosemarang.com', siteId: '08', cms: '2', template: 'portal', createdAt: new Date().toISOString() },
  { url: 'jateng.tribunnews.com', siteId: '12', cms: '2', template: 'news', createdAt: new Date().toISOString() },
  { url: 'krjogja.com', siteId: '15', cms: '1', template: 'news', createdAt: new Date().toISOString() },
  { url: 'solopos.com', siteId: '22', cms: '1', template: 'portal', createdAt: new Date().toISOString() }
];

let app: any = null;
let db: any = null;
let usingFirebase = false;

export function getFirebaseConfig() {
  if (!isBrowser) {
    return {
      apiKey: '',
      authDomain: '',
      projectId: '',
      storageBucket: '',
      messagingSenderId: '',
      appId: ''
    };
  }

  // Check .env first, then localStorage
  return {
    apiKey: (import.meta.env.PUBLIC_FIREBASE_API_KEY as string) || localStorage.getItem('fb_apiKey') || '',
    authDomain: (import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN as string) || localStorage.getItem('fb_authDomain') || '',
    projectId: (import.meta.env.PUBLIC_FIREBASE_PROJECT_ID as string) || localStorage.getItem('fb_projectId') || '',
    storageBucket: (import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET as string) || localStorage.getItem('fb_storageBucket') || '',
    messagingSenderId: (import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string) || localStorage.getItem('fb_messagingSenderId') || '',
    appId: (import.meta.env.PUBLIC_FIREBASE_APP_ID as string) || localStorage.getItem('fb_appId') || ''
  };
}

export function saveFirebaseConfigLocal(config: {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}) {
  if (!isBrowser) return;
  localStorage.setItem('fb_apiKey', config.apiKey);
  localStorage.setItem('fb_authDomain', config.authDomain);
  localStorage.setItem('fb_projectId', config.projectId);
  localStorage.setItem('fb_storageBucket', config.storageBucket);
  localStorage.setItem('fb_messagingSenderId', config.messagingSenderId);
  localStorage.setItem('fb_appId', config.appId);
}

export function clearFirebaseConfigLocal() {
  if (!isBrowser) return;
  localStorage.removeItem('fb_apiKey');
  localStorage.removeItem('fb_authDomain');
  localStorage.removeItem('fb_projectId');
  localStorage.removeItem('fb_storageBucket');
  localStorage.removeItem('fb_messagingSenderId');
  localStorage.removeItem('fb_appId');
}

export function isUsingFirebase() {
  return usingFirebase;
}

export function initializeFirebase() {
  if (!isBrowser) return false;

  const config = getFirebaseConfig();
  if (!config.apiKey || !config.projectId) {
    console.log('Firebase credentials not configured.');
    usingFirebase = false;
    return false;
  }

  try {
    if (getApps().length === 0) {
      app = initializeApp(config);
    } else {
      app = getApp();
    }
    db = getFirestore(app);
    usingFirebase = true;
    console.log('Successfully connected to Firebase Firestore.');
    return true;
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    usingFirebase = false;
    return false;
  }
}

export async function prepopulateInitialSites(force = false) {
  if (!isBrowser) return;

  if (usingFirebase && db) {
    try {
      // ONLY pre-populate when force is explicitly true (i.e. clicked Reset & Seeding in UI)
      if (force) {
        console.log('Pre-populating Cloud Firestore with initial sites list...');
        const sitesCol = collection(db, 'sites');
        for (const site of INITIAL_SITES) {
          await addDoc(sitesCol, {
            url: site.url.trim().toLowerCase(),
            siteId: site.siteId.trim(),
            cms: site.cms.trim(),
            template: site.template.trim(),
            createdAt: site.createdAt || new Date().toISOString()
          });
        }
        console.log('Cloud Firestore pre-population completed.');
      }
    } catch (e) {
      console.error('Failed to pre-populate Firestore database:', e);
      throw e;
    }
  } else {
    throw new Error('Database not connected. Cannot seed.');
  }
}

export async function getSites(): Promise<Site[]> {
  if (!isBrowser) return [];

  if (usingFirebase && db) {
    try {
      const querySnapshot = await getDocs(collection(db, 'sites'));
      const sites: Site[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        sites.push({
          id: doc.id,
          url: data.url || '',
          siteId: data.siteId || '',
          cms: data.cms || '',
          template: data.template || '',
          createdAt: data.createdAt || new Date().toISOString()
        });
      });
      return sites.sort((a, b) => a.siteId.localeCompare(b.siteId, undefined, { numeric: true }));
    } catch (error) {
      console.error('Error fetching sites from Firestore:', error);
      throw error;
    }
  } else {
    return []; // Return empty list if Firebase is not configured
  }
}

export async function addSite(site: Omit<Site, 'id'>): Promise<Site> {
  if (!isBrowser) throw new Error('Browser environment required');

  if (!usingFirebase || !db) {
    throw new Error('Firebase database is not connected. Please configure setup first.');
  }

  const newSiteData = {
    url: site.url.trim().toLowerCase(),
    siteId: site.siteId.trim(),
    cms: site.cms.trim(),
    template: site.template.trim(),
    createdAt: new Date().toISOString()
  };

  try {
    const docRef = await addDoc(collection(db, 'sites'), newSiteData);
    return {
      id: docRef.id,
      ...newSiteData
    };
  } catch (error) {
    console.error('Firestore failed to add site:', error);
    throw error;
  }
}

export async function updateSite(id: string, updatedFields: Partial<Omit<Site, 'id'>>): Promise<void> {
  if (!isBrowser) throw new Error('Browser environment required');

  if (!usingFirebase || !db) {
    throw new Error('Firebase database is not connected. Please configure setup first.');
  }

  const formattedFields = { ...updatedFields };
  if (formattedFields.url) formattedFields.url = formattedFields.url.trim().toLowerCase();
  if (formattedFields.siteId) formattedFields.siteId = formattedFields.siteId.trim();
  if (formattedFields.cms) formattedFields.cms = formattedFields.cms.trim();
  if (formattedFields.template) formattedFields.template = formattedFields.template.trim();

  try {
    const docRef = doc(db, 'sites', id);
    const { updateDoc: fbUpdateDoc } = await import('firebase/firestore'); // dynamic import safe
    await fbUpdateDoc(docRef, formattedFields);
  } catch (error) {
    console.error('Firestore failed to update site:', error);
    throw error;
  }
}

export async function deleteSite(id: string): Promise<void> {
  if (!isBrowser) throw new Error('Browser environment required');

  if (!usingFirebase || !db) {
    throw new Error('Firebase database is not connected. Please configure setup first.');
  }

  try {
    const docRef = doc(db, 'sites', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Firestore failed to delete site:', error);
    throw error;
  }
}

// Auto-run on import inside browser
if (isBrowser) {
  initializeFirebase();
}
