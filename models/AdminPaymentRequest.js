
import mongoose from 'mongoose';

const adminPaymentRequestSchema = new mongoose.Schema({
  sellerPayment: { type: mongoose.Schema.Types.ObjectId, ref: 'SellerPayment', required: true },
  status: { type: String, enum: ['pending', 'accepted'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  acceptedAt: { type: Date },
});

export default mongoose.model('AdminPaymentRequest', adminPaymentRequestSchema);
