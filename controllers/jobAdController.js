import nodemailer from "nodemailer";
import twilio from "twilio";
import JobAd from "../models/jobAdSchema.js";
import { ObjectId } from "mongodb";

// >------------------------
// >> Create OTP Link logic
// >------------------------

export const createJobAd = async (req, res) => {
  const emailConfig = {
    service: "gmail",
    auth: {
      user: process.env.FOUNDER_EMAIL,
      pass: process.env.FOUNDER_PASSWORD,
    },
  };

  const phoneConfig = {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_ACCOUNT_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_PHONE_NUMBER,
  };

  // Function to send OTP via email
  async function sendEmailOTP(mail, otp) {
    const transporter = nodemailer.createTransport(emailConfig);

    const mailOptions = {
      from: process.env.FOUNDER_EMAIL,
      to: mail,
      subject: "OTP Verification",
      text: `Your OTP is: ${otp}`,
    };

    try {
      await transporter.sendMail(mailOptions);
      return `OTP sent to ${mail} via email`;
    } catch (error) {
      throw `Error sending OTP to ${mail} via email: ${error}`;
    }
  }

  // Function to send OTP via SMS
  async function sendSMSOTP(phoneNumber, otp) {
    const client = new twilio(phoneConfig.accountSid, phoneConfig.authToken);

    try {
      const message = await client.messages.create({
        body: `Your OTP is: ${otp}`,
        from: phoneConfig.fromNumber,
        to: phoneNumber,
      });

      return `OTP sent to ${phoneNumber} via SMS with SID: ${message.sid}`;
    } catch (error) {
      throw `Error sending OTP to ${phoneNumber} via SMS: ${error}`;
    }
  }

  // Function to extract email addresses from text
  function extractEmails(text) {
    const emailRegex = /[a-zA=Z0-9._-]+@[a-zA=Z0-9._-]+\.[a-zA-Z]{2,4}/g;
    return text.match(emailRegex);
  }

  // Function to extract phone numbers from text
  function extractPhoneNumbers(text) {
    const phoneRegex = /(?:\+\d{12}|\b\d{11})\b/g;
    return text.match(phoneRegex);
  }

  try {
    const {
      designation,
      description,
      companyName,
      skills,
      experience,
      payRangeStart,
      payRangeEnd,
      jobFeseability,
      jobType,
      country,
      city,
      hashTags,
      applyEmail,
      applyPhone,
    } = req.body;
    // console.log(req.body, "===>req.body");

    let jobAdDetails = {};
    // console.log(jobAdDetails, "==>>jobAdDetails");
    if (designation && description && skills && companyName) {
      jobAdDetails = {
        designation,
        description,
        companyName,
        skills,
        experience,
        payRangeStart,
        payRangeEnd,
        jobFeseability,
        jobType,
        country,
        city,
        hashTags,
        applyEmail,
        applyPhone,
      };
    } else {
      return res.status(400).send(
        sendError({
          status: false,
          message: "All Fields are required",
        })
      );
    }

    // console.log(jobAdDetails, "==>>> jobAdDetails");

    const jobAd = new JobAd(jobAdDetails);
    await jobAd.save();
    // console.log(jobAd);

    //here is all emails in array format
    const emails = extractEmails(description);
    // console.log("Emails:", emails);

    //here is all contact numbers in array format
    const contactNumbers = extractPhoneNumbers(description);
    // console.log("Contact Numbers:", contactNumbers);

    const otpPromises = emails.map(async (email, index) => {
      const contactNumber = contactNumbers[index];
      
      // Generate OTP Code
      const min = 100000;
      const max = 999999;
      const generateRandomCode =
        Math.floor(Math.random() * (max - min + 1)) + min;

      const otpAddToDb = await JobAd.updateOne(
        { _id: jobAd._id },
        {
          $push: {
            emailOTP: {
              Email: email,
              OTP: generateRandomCode,
              createdAt: new Date(),
            },
          },
        }
      );

      if (!otpAddToDb) {
        return res.status(400).send({
          status: "Failed",
          message: "JobAd not found or OTP not added",
        });
      }

      try {
        // Send OTP via email
        const emailResponse = await sendEmailOTP(email, generateRandomCode);
        console.log(emailResponse);

        // Send OTP via SMS
        // const smsResponse = await sendSMSOTP(contactNumber, generateRandomCode);
        // console.log(smsResponse);
      } catch (error) {
        console.log(error);
      }
    });

    // Wait for all OTPs to be generated and saved
    await Promise.all(otpPromises);

    res.status(200).send({
      status: "Success",
      message: "Job application received, and OTPs sent to your email addresses which you have provided",
    });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).send({
      status: "Error",
      message: "Internal Server Error",
    });
  }
};

// >------------------------
// >> Verify OTP Logic
// >------------------------

export const verifyOtpLink = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).send({
        status: "Failed",
        message: "Email and OTP are required for verification.",
      });
    }

    const jobAd = await JobAd.findOne({
      "emailOTP.Email": email,
      "emailOTP.OTP": otp,
    });
    // console.log(jobAd);

    if (!jobAd) {
      return res.status(401).send({
        status: "Failed",
        message: "Invalid OTP or email address.",
      });
    }

    // console.log("Searching for:", email, otp);
    const matchingOTP = jobAd.emailOTP.find(
      (entry) => entry.Email === email && entry.OTP === Number(otp)
    );
    // console.log("Matching OTP:", matchingOTP);
    // console.log("emailOTP array:", jobAd.emailOTP);

    if (!matchingOTP) {
      return res.status(401).send({
        status: "Failed",
        message: "Invalid OTP or email address.",
      });
    }

    if (matchingOTP.isUsed) {
      return res.status(401).send({
        status: "Failed",
        message: "OTP has already been used.",
      });
    }

    const now = new Date();
    const createdAt = new Date(matchingOTP.createdAt);
    const timeDifference = now - createdAt;

    // Check if OTP has expired (5 minutes)
    if (timeDifference > 5 * 60 * 1000) {
      return res.status(401).send({
        status: "Failed",
        message: "OTP has expired.",
      });
    }

    // Mark the OTP as used
    matchingOTP.isUsed = true;
    await jobAd.save();

    res.status(200).send({
      status: "Success",
      message: "OTP verification successful!",
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send({
      status: "Error",
      message: "Internal Server Error",
    });
  }
};
