import express from 'express';
import firebaseAuth from '../middleware/firebaseAuth.js';
import roleCheck from '../middleware/roles.js';
import Product from '../models/Product.js';

const router = express.Router();

// List all products (with search, pagination, sort, discount filter)
router.get('/', async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sort = 'createdAt',
    order = 'desc',
    name,
    generic,
    company,
    discount,
  } = req.query;

  let filter = {};
  if (name) filter.name = { $regex: name, $options: 'i' };
  if (generic) filter.generic = { $regex: generic, $options: 'i' };
  if (company) filter.company = { $regex: company, $options: 'i' };
  if (discount === 'true') filter.discount = { $gt: 0 };

  const products = await Product.find(filter)
    .sort({ [sort]: order === 'desc' ? -1 : 1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));
  const count = await Product.countDocuments(filter);
  res.json({ products, totalPages: Math.ceil(count / limit) });
});

// Get by category
router.get('/category/:categoryId', async (req, res) => {
  const products = await Product.find({ category: req.params.categoryId });
  res.json(products);
});

// Add product (seller)
router.post('/', firebaseAuth, roleCheck('seller', 'admin'), async (req, res) => {
  const seller = req.localUser;
  const prod = await Product.create({ ...req.body, seller: seller._id });
  res.json(prod);
});

// Update product (seller or admin)
router.patch('/:id', firebaseAuth, roleCheck('seller', 'admin'), async (req, res) => {
  const prod = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(prod);
});
// Get top discounted products
router.get('/discounted', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    // Only products with discount > 0, sorted by discount descending, then createdAt descending
    const products = await Product.find({ discount: { $gt: 0 } })
      .sort({ discount: -1, createdAt: -1 })
      .limit(limit);
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch discounted products', error });
  }
});

export default router;
