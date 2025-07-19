
import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  invoiceNumber: String,
  date: { type: Date, default: Date.now },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: Array,
  total: Number,
  status: String,
});

export default mongoose.model('Invoice', invoiceSchema);
