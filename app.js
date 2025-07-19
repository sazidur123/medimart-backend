import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import productRoutes from './routes/product.js';
import categoryRoutes from './routes/category.js';
import paymentsRoutes from './routes/payments.js';
import invoiceRoutes from './routes/invoice.js';
import bannerRoutes from './routes/banner.js';
import salesRoutes from './routes/sales.js';
import uploadRoutes from './routes/upload.js';
import adminRoutes from './routes/admin.js';
import adminPaymentRequestsRouter from './routes/adminPaymentRequests.js';
import sellerRoutes from './routes/seller.js';
import sellerPaymentsRoutes from './routes/sellerPayments.js';
import adsRoutes from './routes/ads.js';
import medicinesRoutes from './routes/medicines.js';
import cartRoutes from './routes/cart.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Route registration
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/invoice', invoiceRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/adminPaymentRequests', adminPaymentRequestsRouter);
app.use('/api/seller', sellerRoutes);
app.use('/api/sellerpayments', sellerPaymentsRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/medicines', medicinesRoutes);
app.use('/api/cart', cartRoutes);

// Optional: Basic root endpoint
app.get('/', (req, res) => {
  res.send('API is running');
});

// Global error handler to always return JSON
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log(`✅ Server running on http://localhost:${port}`);
  });
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err.message);
  process.exit(1);  // Exit on DB connection failure
});

const stripeSecret = process.env.STRIPE_SECRET_KEY;
