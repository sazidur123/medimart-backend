
import express from 'express';
import SellerPayment from '../models/SellerPayment.js';
import AdminPaymentRequest from '../models/AdminPaymentRequest.js';
import Invoice from '../models/Invoice.js';
import User from '../models/User.js';
import firebaseAuth from '../middleware/firebaseAuth.js';

const router = express.Router();

// DEBUG: List all SellerPayments with seller and invoice info (admin only)
router.get('/debug/all', firebaseAuth, async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const payments = await SellerPayment.find({})
      .populate('seller', 'username email _id')
      .populate({ path: 'invoice', populate: { path: 'user', select: 'username email _id' } });
    res.json(payments.map(p => ({
      _id: p._id,
      seller: p.seller,
      amount: p.amount,
      status: p.status,
      invoice: p.invoice,
      createdAt: p.createdAt,
      paidAt: p.paidAt
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch debug seller payments' });
  }
});

// Get all seller payments (admin) or for a seller
router.get('/', firebaseAuth, async (req, res) => {
  try {
    const user = req.user;
    let filter = {};
    if (user.role === 'seller') filter = { seller: user._id };
    const payments = await SellerPayment.find(filter)
      .populate('seller', 'username email _id')
      .populate({
        path: 'invoice',
        populate: [
          { path: 'user', select: 'username email _id' }
        ]
      });

    // Manually populate product name, price, and seller for each item in invoice.items
    const Product = (await import('../models/Product.js')).default;
    for (const sp of payments) {
      if (sp.invoice && Array.isArray(sp.invoice.items)) {
        for (const item of sp.invoice.items) {
          if (item.product) {
            const prod = await Product.findById(item.product).select('name price seller');
            if (prod) {
              item.product = {
                _id: prod._id,
                name: prod.name,
                price: prod.price,
                seller: prod.seller
              };
            }
          }
        }
      }
    }
    res.json(payments);
  } catch (err) {
    console.error('Error fetching seller payments:', err);
    res.status(500).json({ error: 'Failed to fetch seller payments' });
  }
});

// Admin: Accept seller payment (mark as paid)
router.patch('/:id/accept', firebaseAuth, async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const sellerPayment = await SellerPayment.findByIdAndUpdate(
      req.params.id,
      { status: 'paid', paidAt: new Date() },
      { new: true }
    );
    await AdminPaymentRequest.findOneAndUpdate(
      { sellerPayment: req.params.id },
      { status: 'accepted', acceptedAt: new Date() }
    );
    res.json(sellerPayment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to accept seller payment' });
  }
});

export default router;
