import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));

const app = initializeApp({
  credential: {
    getAccessToken: async () => ({
      access_token: 'fake',
      expires_in: 3600,
    }),
  },
  projectId: "universal-gearbox-45xj8"
});

// actually, since I don't have service account, I can't easily query firestore directly from a script without the key.
