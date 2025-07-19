
import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: String,
  generic: String,
  description: String,
  brand: String,
  image: String,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  company: String,
  massUnit: String,
  price: Number,
  discount: { type: Number, default: 0 },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  stock: Number,
  isAdvertised: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Product', productSchema);
