import express from "express";
import { createJobAd, verifyOtpLink } from "../controllers/jobAdController.js";

const authRoutes = express.Router();


// >------------------------
// >> Send OTP Link Route
// >------------------------

authRoutes.post('/send-otp', createJobAd);





// >------------------------
// >> Verify OTP Link Route
// >------------------------

authRoutes.post('/verify-otp', verifyOtpLink);






export default authRoutes;