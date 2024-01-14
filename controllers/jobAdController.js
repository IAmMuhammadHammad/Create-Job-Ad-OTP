import nodemailer from "nodemailer";
import randomatic from "randomatic";
import twilio from "twilio";
import JobAd from "../models/jobAdSchema.js";

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
    console.log(jobAd);

    //here is all emails in array format
    const emails = extractEmails(description);
    // console.log("Emails:", emails);

    //here is all contact numbers in array format
    const contactNumbers = extractPhoneNumbers(description);
    // console.log("Contact Numbers:", contactNumbers);

    for (const email of emails) {
      // const contactNumber = contactNumbers[index];
      const otp = randomatic("0", 6);

      // Update the JobAd document with the new OTP for the email
      try {
        await JobAd.updateOne(
          { _id: jobAd._id },
          {
            $push: {
              emailOTP: {
                Email: email,
                OTP: otp,
              },
            },
          }
        );

        // Send OTP via email
        await sendEmailOTP(email, otp);
        
      } catch (error) {
        console.error("Error in processing OTP for email:", email, error);
        return res.status(500).send({
          status: "Error",
          message: "An error occurred while processing OTPs",
          error: error,
        });
      }
    };

    res.status(200).send({
      status: "Success",
      message: "Job application received, and OTPs sent to your email address",
      data: jobAd,
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

  async function getJobId(email, otp) {
    try {
      const jobAd = await JobAd.findOne({
        "emailOTP.Email": email,
        "emailOTP.OTP": otp,
      });

      if (jobAd) {
        const jobId = jobAd._id.toString(); // Convert ObjectId to string
        return jobId;
      } else {
        return null;
      }
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  }

  try {
    const { email, otp } = req.body;
    const jobId = await getJobId(email, otp);
    if (jobId) {
      // If jobId is found, return it
      res.status(200).send({
        status: "Success",
        message: "OTP verified successfully",
        data: jobId,
      });
    } else {
      // If jobId is not found, return an error
      res.status(400).send({
        status: "Error",
        message: "OTP isn't Correct",
      });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send({
      status: "Error",
      message: "Internal Server Error",
    });
  }
};
