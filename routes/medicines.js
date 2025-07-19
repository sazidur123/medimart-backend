import express from 'express';
import Product from '../models/Product.js';
import firebaseAuth from '../middleware/firebaseAuth.js';
import roleCheck from '../middleware/roles.js';

const router = express.Router();

// List all medicines (products)
// List all medicines (products) with populated category and brand
router.get('/', async (req, res) => {
  try {
    const medicines = await Product.find()
      .populate('category', 'name')
      .lean();
    res.json(medicines);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Add medicine (seller only)
router.post('/', firebaseAuth, roleCheck('seller'), async (req, res) => {
  try {
    const seller = req.localUser;
    if (!seller || !seller._id) {
      return res.status(400).json({ message: 'Seller not found' });
    }
    // Ensure price and discount are numbers
    const price = Number(req.body.price);
    const discount = Number(req.body.discount);
    const med = await Product.create({
      ...req.body,
      price,
      discount,
      seller: seller._id
    });
    if (!med) {
      // Medicine creation returned null or undefined
    }
    res.status(201).json(med);
  } catch (error) {
    // Failed to add medicine
    res.status(500).json({ message: 'Failed to add medicine', error: error.message, stack: error.stack });
  }
});

// List medicines by category (for frontend compatibility)
router.get('/category/:categoryId', async (req, res) => {
  try {
    const medicines = await Product.find({ category: req.params.categoryId });
    res.json(medicines);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Delete medicine (seller only)
router.delete('/:id', firebaseAuth, roleCheck('seller'), async (req, res) => {
  try {
    const seller = req.localUser;
    const med = await Product.findOneAndDelete({ _id: req.params.id, seller: seller._id });
    if (!med) return res.status(404).json({ message: 'Medicine not found or not yours' });
    res.json({ message: 'Medicine deleted', med });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete medicine', error });
  }
});

// Get a single medicine by ID
router.get('/:id', async (req, res) => {
  try {
    const med = await Product.findById(req.params.id);
    if (!med) return res.status(404).json({ message: 'Medicine not found' });
    res.json(med);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch medicine', error });
  }
});

// Update medicine (seller only)
router.put('/:id', firebaseAuth, roleCheck('seller'), async (req, res) => {
  try {
    const seller = req.localUser;
    if (!seller || !seller._id) {
      return res.status(400).json({ message: 'Seller not found' });
    }
    // Only allow update of own medicine
    const med = await Product.findOne({ _id: req.params.id, seller: seller._id });
    if (!med) return res.status(404).json({ message: 'Medicine not found or not yours' });

    // Only update allowed fields
    const allowed = ['name','generic','description','image','category','company','massUnit','price','discount','stock'];
    for (const key of allowed) {
      if (key in req.body) med[key] = req.body[key];
    }
    await med.save();
    res.json(med);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update medicine', error });
  }
});

export default router;

