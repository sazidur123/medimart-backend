import express from 'express';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import firebaseAuth from '../middleware/firebaseAuth.js';

const router = express.Router();

// Middleware to restrict shopping to only 'user' role
function restrictToUserRole(req, res, next) {
  if (!req.user || req.user.role !== 'user') {
    return res.status(403).json({ message: 'Only regular users can shop.' });
  }
  next();
}

// Get cart for current user
router.get('/', firebaseAuth, restrictToUserRole, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    res.json(cart || { items: [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// Save/update cart for current user
router.post('/', firebaseAuth, restrictToUserRole, async (req, res) => {
  try {
    const { items } = req.body;
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items });
    } else {
      cart.items = items;
      cart.updatedAt = Date.now();
    }
    await cart.save();
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save cart' });
  }
});

// Clear cart for current user
router.delete('/', firebaseAuth, restrictToUserRole, async (req, res) => {
  try {
    await Cart.findOneAndDelete({ user: req.user._id });
    res.json({ message: 'Cart cleared' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

export default router;
