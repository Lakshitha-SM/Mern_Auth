import express from 'express';
import {
    isAuthenticated,
  login,
  logout,
  register,
  resetPassword,
  sendResetOtp,
  sendVerifyOtp,
  verifyEmail
} from '../controllers/authController.js';
import userAuth from '../middleware/userAuth.js';

const authRouter = express.Router();

// Auth routes
authRouter.post('/register', register); // Register a new user
authRouter.post('/login', login);       // Login user
authRouter.post('/logout', logout);     // Logout user

// OTP Verification Routes (require authentication)
authRouter.post('/send-verify-otp', userAuth, sendVerifyOtp);
authRouter.post('/verify-account', userAuth, verifyEmail);
authRouter.get('/is-auth', userAuth,isAuthenticated);
authRouter.post('/send-reset-otp', sendResetOtp);
authRouter.post('/reset-password',resetPassword);
export default authRouter;


