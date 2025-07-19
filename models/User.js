import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  firebaseUid: { type: String, required: true, unique: true }, // Firebase UID
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['user', 'seller', 'admin'], default: 'user' },
  photoURL: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  sellerRequested: { type: Boolean, default: false }, // User requested to become seller
}, { timestamps: true });

export default mongoose.model('User', userSchema);
