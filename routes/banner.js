// routes/banner.js
import express from 'express';
import Banner from '../models/Banner.js';
import Product from '../models/Product.js';
import firebaseAuth from '../middleware/firebaseAuth.js';
import roleCheck from '../middleware/roles.js';
import User from '../models/User.js';

const router = express.Router();

// List banners, filter by seller if provided
router.get('/', async (req, res) => {
  try {
    const { seller } = req.query;
    let filter = { status: 'live' };
    if (seller) filter.seller = seller;
    // Only show banners with status 'live'
    const banners = await Banner.find(filter).populate('product seller');
    res.json(banners);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch banners.' });
  }
});

// Seller or Admin: add banner request
router.post('/', firebaseAuth, roleCheck('seller', 'admin'), async (req, res) => {
  try {
    const { title, image, description, seller } = req.body;
    if (!title || !image || !description) {
      return res.status(400).json({ message: 'Title, image, and description are required.' });
    }
    // If admin, auto-approve; if seller, mark as pending
    let slide = false;
    let status = 'pending';
    if (req.user.role === 'admin') {
      slide = true;
      status = 'live';
    }
    const banner = await Banner.create({ title, image, description, seller, slide, status });
    res.json(banner);
  } catch (err) {
    // Error creating banner
    res.status(500).json({ message: 'Failed to create banner.' });
  }
});

// Admin: toggle slide
router.patch('/:id/toggle', firebaseAuth, roleCheck('admin'), async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ message: 'Banner not found' });
    banner.slide = !banner.slide;
    banner.status = banner.slide ? 'live' : 'pending';
    await banner.save();
    res.json(banner);
  } catch (err) {
    res.status(500).json({ message: 'Failed to toggle banner.' });
  }
});

// Admin: get all banners (pending + live)
router.get('/all', firebaseAuth, roleCheck('admin'), async (req, res) => {
  try {
    const { seller } = req.query;
    let filter = {};
    if (seller) filter.seller = seller;
    // Return all banners for admin
    const banners = await Banner.find(filter).populate('product seller');
    res.json(banners);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch all banners.' });
  }
});

// Admin: edit a banner (only if added by admin)
router.put('/:id', firebaseAuth, roleCheck('admin'), async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ message: 'Banner not found' });
    // Only allow edit if the banner's seller is the current admin
    if (!banner.seller || banner.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only edit banners you created.' });
    }
    const { title, image, description } = req.body;
    if (title) banner.title = title;
    if (image) banner.image = image;
    if (description) banner.description = description;
    await banner.save();
    res.json(banner);
  } catch (err) {
    res.status(500).json({ message: 'Failed to edit banner.' });
  }
});

// Seller: edit their own ad request (only if pending)
router.put('/:id', firebaseAuth, roleCheck('seller', 'admin'), async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ message: 'Banner not found' });
    // Only allow edit if the banner's seller is the current user and status is pending
    if (req.user.role !== 'admin' && (!banner.seller || banner.seller.toString() !== req.user._id.toString() || banner.status !== 'pending')) {
      return res.status(403).json({ message: 'You can only edit your own pending ad requests.' });
    }
    const { title, image, description } = req.body;
    if (title) banner.title = title;
    if (image) banner.image = image;
    if (description) banner.description = description;
    await banner.save();
    res.json(banner);
  } catch (err) {
    res.status(500).json({ message: 'Failed to edit ad request.' });
  }
});

// Seller: delete their own ad request (only if pending)
router.delete('/:id', firebaseAuth, roleCheck('seller', 'admin'), async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ message: 'Banner not found' });
    // Only allow delete if the banner's seller is the current user and status is pending
    if (req.user.role !== 'admin' && (!banner.seller || banner.seller.toString() !== req.user._id.toString() || banner.status !== 'pending')) {
      return res.status(403).json({ message: 'You can only delete your own pending ad requests.' });
    }
    await banner.deleteOne();
    res.json({ message: 'Ad request deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete ad request.' });
  }
});

export default router;
