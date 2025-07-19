import express from 'express';
import Payment from '../models/Payment.js';
import firebaseAuth from '../middleware/firebaseAuth.js';
import roleCheck from '../middleware/roles.js';

const router = express.Router();

// Sales report (admin only)
router.get('/sales', firebaseAuth, roleCheck('admin'), async (req, res) => {
  const { from, to } = req.query;
  let filter = {};
  if (from && to) {
    filter.date = { $gte: new Date(from), $lte: new Date(to) };
  }
  const payments = await Payment.find(filter)
    .populate('user')
    .populate({
      path: 'items.product',
      populate: { path: 'seller', select: 'email username' }
    });
  res.json(payments);
});

export default router;
