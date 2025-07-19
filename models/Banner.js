import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  image: String,
  description: String,
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  slide: { type: Boolean, default: false },
  title: { type: String, required: true },
  status: { type: String, enum: ['pending', 'live'], default: 'pending' },
});

const Banner = mongoose.model('Banner', bannerSchema);

export default Banner;
