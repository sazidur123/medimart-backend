import dotenv from 'dotenv';
dotenv.config(); // Load env variables first

import express from 'express';
import firebaseAuth from '../middleware/firebaseAuth.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import SellerPayment from '../models/SellerPayment.js';
import AdminPaymentRequest from '../models/AdminPaymentRequest.js';
import Invoice from '../models/Invoice.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const router = express.Router();

// Create Stripe payment intent
router.post('/create-payment-intent', firebaseAuth, async (req, res) => {
  try {
    const { amount } = req.body;
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Error creating payment intent:', error.message);
    res.status(500).json({ error: 'Payment intent creation failed' });
  }
});

// Store payment data after success
router.post('/', firebaseAuth, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.firebaseUid });
    if (!user) {
      return res.status(400).json({ error: 'User not found in database. Please contact support or re-login.' });
    }
    const itemsWithProduct = req.body.items.map(item => ({
      product: item.product,
      quantity: item.quantity,
      price: item.price,
    }));
    // Create payment
    const pay = await Payment.create({ ...req.body, user: user._id, items: itemsWithProduct });
    // Always create SellerPayment and AdminPaymentRequest for each seller
    // Group items by seller
    const sellerMap = {};
    for (const item of itemsWithProduct) {
      const prod = await Product.findById(item.product);
      if (!prod || !prod.seller) continue;
      const sellerId = prod.seller.toString();
      if (!sellerMap[sellerId]) sellerMap[sellerId] = { amount: 0, items: [] };
      sellerMap[sellerId].amount += (item.price * item.quantity);
      sellerMap[sellerId].items.push(item);
    }
    // Create invoice (always set status to 'pending' for seller flow)
    const invoice = await Invoice.create({
      payment: pay._id,
      user: user._id,
      items: itemsWithProduct,
      total: pay.amount,
      status: 'pending',
      invoiceNumber: `INV-${Date.now()}`,
      date: new Date(),
    });
    // For each seller, create SellerPayment and AdminPaymentRequest (always pending)
    for (const sellerId of Object.keys(sellerMap)) {
      const sellerPayment = await SellerPayment.create({
        seller: sellerId,
        invoice: invoice._id,
        amount: sellerMap[sellerId].amount,
        status: 'pending',
      });
      await AdminPaymentRequest.create({
        sellerPayment: sellerPayment._id,
        status: 'pending',
      });
    }
    res.json(pay);
  } catch (error) {
    res.status(500).json({ error: 'Payment storage failed' });
  }
});

// List payments for admin/seller/user
router.get('/', firebaseAuth, async (req, res) => {
  try {
    const user = req.user; // Use user attached by firebaseAuth middleware
    if (!user) {
      return res.status(401).json({ error: 'User not found or unauthorized' });
    }
    let filter = {};
    if (user.role === 'admin') filter = {};
    else if (user.role === 'seller') filter = { 'items.product': { $exists: true, $ne: null } };
    else filter = { user: user._id };

    let payments = await Payment.find(filter)
      .populate({
        path: 'items.product',
        select: 'name seller',
        populate: { path: 'seller', select: '_id email' }
      })
      .populate('user');

    if (user.role === 'seller') {
      // Only include payments where any item.product.seller matches this seller
      payments = payments.filter(payment =>
        payment.items.some(item =>
          item.product && item.product.seller && item.product.seller._id.toString() === user._id.toString()
        )
      );
    }

    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Accept payment (admin)
router.patch('/:id/accept', firebaseAuth, async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { status: 'paid' },
      { new: true }
    );
    res.json(payment);
  } catch (error) {
      // Error accepting payment
    res.status(500).json({ error: 'Payment acceptance failed' });
  }
});

export default router;
