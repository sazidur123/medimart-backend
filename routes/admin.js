
import express from 'express';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import Banner from '../models/Banner.js';
import SellerPayment from '../models/SellerPayment.js';
import firebaseAuth from '../middleware/firebaseAuth.js';
import roleCheck from '../middleware/roles.js';

const router = express.Router();

router.get('/stats', firebaseAuth, roleCheck('admin'), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPayments = await Payment.countDocuments();
    const totalBanners = await Banner.countDocuments();



    // Calculate totalSales (only paid), paid (only paid)
    const payments = await Payment.find({ 'items.product': { $exists: true, $ne: null } });
    let paid = 0;
    let totalSales = 0;
    payments.forEach(payment => {
      payment.items.forEach(item => {
        const itemTotal = (item.price || 0) * (item.quantity || 1);
        if (payment.status === 'paid') {
          paid += itemTotal;
          totalSales += itemTotal;
        }
      });
    });

    // Calculate pending from SellerPayment model
    const sellerPendingPayments = await SellerPayment.find({ status: 'pending' });
    let pending = 0;
    sellerPendingPayments.forEach(sp => {
      pending += sp.amount || 0;
    });

    res.json({
      totalUsers,
      totalPayments,
      totalBanners,
      totalSales,
      paid,
      pending,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;
