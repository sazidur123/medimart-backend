// models/Payment.js

import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      quantity: Number,
      price: Number,
    },
  ],
  status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  amount: Number,
  paymentIntentId: String,
  date: { type: Date, default: Date.now },
  method: String,
});

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
