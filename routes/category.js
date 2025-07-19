// routes/category.js
import express from 'express';
import firebaseAuth from '../middleware/firebaseAuth.js';
import roleCheck from '../middleware/roles.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';

const router = express.Router();

// Get all categories
router.get('/', async (req, res) => {
  const categories = await Category.find();
  for (let cat of categories) {
    cat.medicineCount = await Product.countDocuments({ category: cat._id });
  }
  res.json(categories);
});

// Create category (admin)
router.post('/', firebaseAuth, roleCheck('admin'), async (req, res) => {
  const { name, image } = req.body;
  const cat = await Category.create({ name, image });
  res.json(cat);
});

// Delete category (admin)
router.delete('/:id', firebaseAuth, roleCheck('admin'), async (req, res) => {
  await Category.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

export default router;
