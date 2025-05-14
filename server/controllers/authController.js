import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import userModel from '../models/userModel.js';
import transporter from '../config/nodemailer.js';
import { request } from 'express';
import { EMAIL_VERIFY_TEMPLATE ,PASSWORD_RESET_TEMPLATE } from '../config/emailTemplates.js';

// Register user
export const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  try {
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new userModel({ name, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Send welcome email
    const mailOption = {
      from: process.env.SENDER_EMAIL,
      to: email,
      subject: "Welcome to AuthentiScan",
      text: `Welcome to AuthentiScan. Your account has been created with email: ${email}.`,
    };
    await transporter.sendMail(mailOption);

    return res.status(201).json({ success: true, message: "User registered successfully" });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Login user
export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required" });
  }

  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "Invalid email" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid password" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ success: true, message: "Logged in successfully" });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Logout user
export const logout = async (req, res) => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    });
    return res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

//send verify otp

export const sendVerifyOtp = async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await userModel.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
  
      if (user.isAccountVerified) {
        return res.json({ success: false, message: "Account already verified" });
      }
  
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      user.verifyOtp = otp;
      user.verifyOtpExpireAt = Date.now() + 24 * 60 * 60 * 1000;
      await user.save();
  
      const mailOption = {
        from: process.env.SENDER_EMAIL,
        to: user.email,
        subject: "Account Verification OTP",
        //text: `Your verification OTP is ${otp}. It is valid for 24 hours.`,
        html: EMAIL_VERIFY_TEMPLATE.replace("{{otp}}",otp).replace("{{email}}",user.email)      };
      await transporter.sendMail(mailOption);
  
      return res.json({ success: true, message: "OTP sent to your email" });
  
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  //verify email


  export const verifyEmail = async (req, res) => {
    try {
      const { otp } = req.body;
  
      if (!otp) {
        return res.status(400).json({ success: false, message: "Missing OTP" });
      }
  
      const userId = req.user.id;
      const user = await userModel.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
  
      if (user.isAccountVerified) {
        return res.json({ success: false, message: "Account already verified" });
      }
  
      if (user.verifyOtp !== otp || user.verifyOtp === '') {
        return res.json({ success: false, message: "Invalid OTP" });
      }
  
      if (Date.now() > user.verifyOtpExpireAt) {
        return res.json({ success: false, message: "OTP expired" });
      }
  
      user.isAccountVerified = true;
      user.verifyOtp = '';
      user.verifyOtpExpireAt = 0;
      await user.save();
  
      return res.json({ success: true, message: "Email verified successfully" });
  
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };

//check if user is authenticated
  export  const isAuthenticated=async(req,res)=>{
    try{
        return res.json({success:true});

    }catch(error){
        res.json({success:false,message:error.message});

    }
  }


  export const sendResetOtp = async (req, res) => {
    const { email } = req.body;
  
    if (!email) {
      return res.json({ success: false, message: "Email is required" });
    }
  
    try {
      const user = await userModel.findOne({ email });
  
      if (!user) {
        return res.json({ success: false, message: "User with this email does not exist" });
      }
  
      // Generate OTP
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      user.resetOtp = otp;
      user.resetOtpExpireAt = Date.now() + 60 * 60 * 1000; // valid for 1 hour
      await user.save();
  
      const mailOption = {
        from: process.env.SENDER_EMAIL,
        to: user.email,
        subject: "Password Reset OTP",
        //text: `Your password reset OTP is ${otp}. It is valid for 1 hour.`,
        html: PASSWORD_RESET_TEMPLATE.replace("{{otp}}",otp).replace("{{email}}",user.email)
      };
  
      await transporter.sendMail(mailOption);
  
      return res.json({ success: true, message: "Password reset OTP sent to your email" });
  
    } catch (error) {
      return res.json({ success: false, message: error.message });
    }
  };


  // Reset User Password
export const resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;
  
    if (!email || !otp || !newPassword) {
      return res.json({ success: false, message: "Email, OTP, and new password are required" });
    }
  
    try {
      const user = await userModel.findOne({ email });
  
      if (!user) {
        return res.json({ success: false, message: "User with this email does not exist" });
      }
  
      if (user.resetOtp !== otp || user.resetOtp === '') {
        return res.json({ success: false, message: "Invalid OTP" });
      }
  
      if (Date.now() > user.resetOtpExpireAt) {
        return res.json({ success: false, message: "OTP has expired" });
      }
  
      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
  
      user.password = hashedPassword;
      user.resetOtp = '';
      user.resetOtpExpireAt = 0;
      await user.save();
  
      return res.json({ success: true, message: "Password reset successfully" });
  
    } catch (error) {
      return res.json({ success: false, message: error.message });
    }
  };
  
  