import express from 'express';
import Banner from '../models/Banner.js';
import firebaseAuth from '../middleware/firebaseAuth.js';
import roleCheck from '../middleware/roles.js';

const router = express.Router();

// Get all ads (banners)
router.get('/', async (req, res) => {
  try {
    const ads = await Banner.find();
    res.json(ads);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Create a new ad (admin only)
router.post('/', firebaseAuth, roleCheck('admin'), async (req, res) => {
  try {
    const newAd = new Banner(req.body);
    await newAd.save();
    res.status(201).json(newAd);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;
