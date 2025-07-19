import express from 'express';
import Product from '../models/Product.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import firebaseAuth from '../middleware/firebaseAuth.js';
import roleCheck from '../middleware/roles.js';
import SellerPayment from '../models/SellerPayment.js';

const router = express.Router();

// Seller stats route (example: total products and payments for this seller)
router.get('/stats', firebaseAuth, roleCheck('seller'), async (req, res) => {
  try {
    const sellerId = req.user._id;
    // Get all payments that include this seller's products
    const payments = await Payment.find({ 'items.product': { $exists: true, $ne: null } })
      .populate({
        path: 'items.product',
        select: 'seller price',
      });

    // Total sales: all items sold by this seller (regardless of payment status)
    let totalSales = 0;
    payments.forEach(payment => {
      payment.items.forEach(item => {
        if (item.product && item.product.seller && item.product.seller.equals(sellerId)) {
          const itemTotal = (item.price || 0) * (item.quantity || 1);
          totalSales += itemTotal;
        }
      });
    });

    // Paid and pending: use SellerPayment model if available, else fallback to Payment status
    let paid = 0;
    let pending = 0;
    const sellerPayments = await SellerPayment.find({ seller: sellerId });
    if (sellerPayments.length > 0) {
      sellerPayments.forEach(sp => {
        if (sp.status === 'paid') paid += sp.amount || 0;
        else pending += sp.amount || 0;
      });
    } else {
      // fallback: use Payment status
      payments.forEach(payment => {
        payment.items.forEach(item => {
          if (item.product && item.product.seller && item.product.seller.equals(sellerId)) {
            const itemTotal = (item.price || 0) * (item.quantity || 1);
            if (payment.status === 'paid') paid += itemTotal;
            else pending += itemTotal;
          }
        });
      });
    }

    res.json({ totalSales, paid, pending });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get all payments for seller (seller or admin only)
router.get('/payments', firebaseAuth, roleCheck('seller'), async (req, res) => {
  try {
    const sellerId = req.user._id;
    // Find all payments where any item.product is a product sold by this seller
    const payments = await Payment.find({
      'items.product': { $exists: true, $ne: null }
    })
      .populate({
        path: 'items.product',
        select: 'name seller',
        populate: { path: 'seller', select: 'email' }
      })
      .populate('user');

    // Filter payments to only those with at least one item for this seller
    const sellerPayments = payments.filter(payment =>
      payment.items.some(item => item.product && item.product.seller && item.product.seller.equals(sellerId))
    );

    res.json(sellerPayments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Add the /sync route here:
router.post('/sync', firebaseAuth, roleCheck('seller', 'admin'), async (req, res) => {
  try {
    // SYNC req.body
    const { firebaseUid, username, email, photoURL } = req.body;
    if (!firebaseUid) {
      return res.status(400).json({ message: 'firebaseUid is required' });
    }
    let user = await User.findOne({ firebaseUid });
    if (user) {
      user.username = username;
      user.email = email;
      user.photoURL = photoURL;
      await user.save();
      return res.json({ message: 'Seller updated', user });
    } else {
      user = new User({ firebaseUid, username, email, photoURL, role: 'seller' });
      await user.save();
      return res.status(201).json({ message: 'Seller created', user });
    }
  } catch (error) {
    // Error syncing seller
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
