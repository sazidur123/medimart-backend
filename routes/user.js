
import express from 'express';
import mongoose from 'mongoose';
import firebaseAuth from '../middleware/firebaseAuth.js';
import roleCheck from '../middleware/roles.js';
import User from '../models/User.js';
import Payment from '../models/Payment.js';

const router = express.Router();

// Get all users (admin only)
router.get('/', firebaseAuth, roleCheck('admin'), async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    // Error fetching users
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Update user role (admin only)
router.patch('/:id/role', firebaseAuth, roleCheck('admin'), async (req, res) => {
  const allowedRoles = ['admin', 'seller', 'user'];
  const { role } = req.body;

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ message: 'Invalid role specified' });
  }

  try {
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    // Error updating role
    res.status(500).json({ message: 'Failed to update role' });
  }
});

// Create user (after signup, open route)
router.post('/', async (req, res) => {
  try {
    const { firebaseUid, username, email, role = 'user', photoURL } = req.body;

    // Check if user already exists by firebaseUid or email
    let existingUser = await User.findOne({
      $or: [{ firebaseUid }, { email }],
    });

    if (existingUser) {
      // If role is different, update it
      let updated = false;
      if (role && existingUser.role !== role) {
        existingUser.role = role;
        updated = true;
      }
      // Optionally update username/photoURL if provided and different
      if (username && existingUser.username !== username) {
        existingUser.username = username;
        updated = true;
      }
      if (photoURL && existingUser.photoURL !== photoURL) {
        existingUser.photoURL = photoURL;
        updated = true;
      }
      if (updated) await existingUser.save();
      return res.status(409).json({ message: 'User already exists', user: existingUser });
    }

    const newUser = new User({
      firebaseUid,
      username,
      email,
      role,
      photoURL,
    });

    await newUser.save();

    res.status(201).json({ message: 'User created successfully', user: newUser });
  } catch (error) {
    // Error creating user
    res.status(500).json({ message: 'Failed to create user' });
  }
});

// Get user by Firebase UID, do NOT auto-create if not found
router.get('/firebase/:uid', async (req, res) => {
  try {
    let user = await User.findOne({ firebaseUid: req.params.uid });
    if (!user) {
      return res.status(404).json({ message: 'User not found for this Firebase UID' });
    }
    res.json(user);
  } catch (error) {
    // Error fetching user by Firebase UID
    res.status(500).json({ message: "Server error" });
  }
});

// Get user by MongoDB _id (prefixed route)
router.get('/id/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    // Error fetching user by ID
    res.status(500).json({ message: "Server error" });
  }
});

// Get payments of a user (authenticated, user can view own or admin can view any)
router.get('/payments/:userId', firebaseAuth, async (req, res) => {
  const { userId } = req.params;

  if (!req.user || !req.user.role || !req.user._id) {
    return res.status(401).json({ message: 'Unauthorized: User info missing or incomplete' });
  }

  if (req.user.role !== 'admin' && req.user._id.toString() !== userId) {
    return res.status(403).json({ message: 'Forbidden: Access denied' });
  }

  try {
    const payments = await Payment.find({ user: userId });
    res.json(payments);
  } catch (error) {
    // Error fetching payments
    res.status(500).json({ message: 'Failed to fetch payments' });
  }
});

// User requests to become a seller
router.post('/request-seller', firebaseAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'seller') {
      return res.status(400).json({ message: 'You are already a seller.' });
    }
    if (user.sellerRequested) {
      return res.status(400).json({ message: 'You have already requested to become a seller.' });
    }
    user.sellerRequested = true;
    await user.save();
    res.json({ message: 'Seller request submitted successfully.' });
  } catch (error) {
    // Error in seller request
    res.status(500).json({ message: 'Failed to submit seller request.' });
  }
});

// Get all payments for a seller (authenticated seller only)
router.get('/seller-payments/:sellerId', firebaseAuth, async (req, res) => {
  const { sellerId } = req.params;
  // Only allow the seller themselves or admin
  if (req.user.role !== 'admin' && req.user._id.toString() !== sellerId) {
    return res.status(403).json({ message: 'Forbidden: Access denied' });
  }
  try {
    // Find all payments where any item.product.seller == sellerId
    const payments = await Payment.find({
      'items.product': { $exists: true }
    })
      .populate({
        path: 'items.product',
        populate: { path: 'seller', select: 'email' }
      })
      .populate('user');
    // Only include items for this seller
    const filtered = payments
      .map((p) => ({
        ...p.toObject(),
        items: p.items.filter((item) =>
          item.product && item.product.seller && item.product.seller._id.toString() === sellerId
        ),
      }))
      .filter((p) => p.items.length > 0);
    res.json(filtered);
  } catch (error) {
    // Error fetching seller payments
    res.status(500).json({ message: 'Failed to fetch seller payments' });
  }
});

// PATCH /api/users/:id - Update user profile (self or admin)
router.patch('/:id', firebaseAuth, async (req, res) => {
  const { id } = req.params;
  const { username, photoURL } = req.body;

  // Only allow user to update their own profile, or admin
  if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
    return res.status(403).json({ message: 'Forbidden: You can only update your own profile.' });
  }

  try {
    // Do not allow email or role to be changed here
    const update = {};
    if (username !== undefined) update.username = username;
    if (photoURL !== undefined) update.photoURL = photoURL;
    const user = await User.findByIdAndUpdate(id, update, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    // Error updating user profile
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// Admin: get all seller requests
router.get('/seller-requests', firebaseAuth, roleCheck('admin'), async (req, res) => {
  try {
    const requests = await User.find({ sellerRequested: true, role: 'user' });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch seller requests' });
  }
});

// Admin: approve seller request
router.patch('/:id/approve-seller', firebaseAuth, roleCheck('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.role = 'seller';
    user.sellerRequested = false;
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Failed to approve seller request' });
  }
});

// Admin: reject seller request
router.patch('/:id/reject-seller', firebaseAuth, roleCheck('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.sellerRequested = false;
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Failed to reject seller request' });
  }
});


// Public: Get real customer and seller counts
router.get('/counts', async (req, res) => {
  try {
    const customersCount = await User.countDocuments({ role: 'user' });
    const sellersCount = await User.countDocuments({ role: 'seller' });
    res.json({ customers: customersCount, sellers: sellersCount });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch counts', error });
  }
});

// ✅ Generic GET user by Firebase UID or MongoDB _id (must be after all other specific routes)
router.get('/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;

    // Try find by firebaseUid first
    let user = await User.findOne({ firebaseUid: identifier });

    // If not found, check if valid ObjectId and try by _id
    if (!user && mongoose.Types.ObjectId.isValid(identifier)) {
      user = await User.findById(identifier);
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found by Firebase UID or MongoDB _id' });
    }

    res.json(user);
  } catch (error) {
    // Error fetching user
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
