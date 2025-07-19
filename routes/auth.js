import express from 'express';
import User from '../models/User.js';
import firebaseAuth from '../middleware/firebaseAuth.js';

const router = express.Router();

// Sync Firebase user with DB (create or update)
router.post('/sync', firebaseAuth, async (req, res) => {
  // Defensive: allow firebaseUid from body or from token
  const firebaseUid = req.body.firebaseUid || (req.user && req.user.uid);
  const { name, email, photoURL } = req.body;

  if (!firebaseUid) {
    return res.status(400).json({ message: 'firebaseUid is required.' });
  }

  let user = await User.findOne({ firebaseUid });
  if (!user) {
    user = await User.create({
      firebaseUid,
      username: name,
      email,
      photoURL,
      role: 'user',
    });
  } else {
    user.username = name;
    user.email = email;
    user.photoURL = photoURL;
    await user.save();
  }

  // Return user data; no backend JWT needed
  res.json(user);
});

// You can add other protected routes similarly, using firebaseAuth middleware

export default router;
