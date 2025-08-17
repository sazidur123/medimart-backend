// routes/invoice.js
import express from 'express';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import firebaseAuth from '../middleware/firebaseAuth.js';
import mongoose from 'mongoose';

const router = express.Router();

// Fetch all invoices for a user
router.get('/', firebaseAuth, async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ message: "userId is required" });

  try {
    // If userId is an ObjectId string, convert it
    const userObjectId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;
    const invoices = await Invoice.find({ user: userObjectId }).sort({ date: -1 });
    res.json({ invoices });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch invoices" });
  }
});

// Fetch invoice by payment ID
router.get('/:paymentId', firebaseAuth, async (req, res) => {
  // Try by payment field first
  let inv = await Invoice.findOne({ payment: req.params.paymentId }).populate('user');
  if (!inv) {
    // If not found, try by invoice _id
    inv = await Invoice.findById(req.params.paymentId).populate('user');
  }
  if (!inv) return res.status(404).json({ message: "Invoice not found" });
  res.json(inv);
});

// Generate invoice after payment (call after stripe webhook or payment success)
router.post('/', firebaseAuth, async (req, res) => {
  const { paymentId } = req.body;
  const payment = await Payment.findById(paymentId).populate('user');
  if (!payment) return res.status(404).json({ message: "Payment not found" });
  
  const inv = await Invoice.create({
    payment: paymentId,
    user: payment.user,
    items: payment.items,
    total: payment.amount,
    status: payment.status,
    invoiceNumber: `INV-${Date.now()}`,
    date: new Date(),
  });
  res.json(inv);
});

export default router;

