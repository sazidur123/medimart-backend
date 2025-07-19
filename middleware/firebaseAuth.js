import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import User from '../models/User.js';

const serviceAccount = JSON.parse(
  fs.readFileSync(path.resolve('./serviceAccountKey.json'), 'utf-8')
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

async function firebaseAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // [firebaseAuth] No token provided
      return res.status(401).json({ message: 'No token provided' });
    }

    const idToken = authHeader.split(' ')[1];
    if (!idToken || idToken.split('.').length !== 3) {
      // [firebaseAuth] Malformed or missing ID token
      return res.status(401).json({ message: 'Malformed or missing ID token' });
    }
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    // [firebaseAuth] Decoded token

    // Fetch user from MongoDB by firebaseUid
    const user = await User.findOne({ firebaseUid: decodedToken.uid });
    // [firebaseAuth] MongoDB user
    if (!user) {
      req.user = null; // Explicitly set to null for clarity
      return res.status(401).json({ message: 'User not found in database' });
    }

    // Attach full user object (with role, _id, etc) to req.user
    req.user = user;

    next();
  } catch (error) {
    // [firebaseAuth] Error
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export default firebaseAuth;
