import express from 'express';
import AdminPaymentRequest from '../models/AdminPaymentRequest.js';
import SellerPayment from '../models/SellerPayment.js';
import firebaseAuth from '../middleware/firebaseAuth.js';

const router = express.Router();

// Get all admin payment requests (admin only)
router.get('/', firebaseAuth, async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const requests = await AdminPaymentRequest.find().populate({
      path: 'sellerPayment',
      populate: { path: 'seller invoice' }
    });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin payment requests' });
  }
});

export default router;

// Admin: Accept admin payment request (mark as accepted and update seller payment)
router.patch('/:id/accept', firebaseAuth, async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    // Update AdminPaymentRequest
    const adminRequest = await AdminPaymentRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'accepted', acceptedAt: new Date() },
      { new: true }
    );
    if (!adminRequest) return res.status(404).json({ error: 'Request not found' });
    // Update SellerPayment
    await SellerPayment.findByIdAndUpdate(
      adminRequest.sellerPayment,
      { status: 'paid', paidAt: new Date() }
    );
    res.json(adminRequest);
  } catch (err) {
    res.status(500).json({ error: 'Failed to accept admin payment request' });
  }
});
