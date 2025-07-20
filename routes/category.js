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


// Update category (admin)
router.put('/:id', firebaseAuth, roleCheck('admin'), async (req, res) => {
  const { name, image } = req.body;
  const updated = await Category.findByIdAndUpdate(
    req.params.id,
    { name, image },
    { new: true, runValidators: true }
  );
  if (!updated) return res.status(404).json({ message: 'Category not found' });
  res.json(updated);
});

// Delete category (admin)
router.delete('/:id', firebaseAuth, roleCheck('admin'), async (req, res) => {
  await Category.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

export default router;
