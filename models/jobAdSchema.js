import mongoose from "mongoose";

const jobAdSchema = mongoose.Schema(
  {
    designation: {
      type: String,
      required: [true, "Please Add Designation"],
    },
    description: {
      type: String,
      required: [true, "Please Add Job Description"],
    },
    companyName: {
      type: String,
      required: [true, "Please Add Company Name"],
    },
    skills: {
      type: String,
      required: [true, "Please Add Skills"],
    },
    experience: {
      type: String,
      // required: [true, 'Please Add Experience'],
    },
    payRangeStart: {
      type: Number,
      required: [false],
    },
    payRangeEnd: {
      type: Number,
      required: [false],
    },
    jobFeseability: {
      type: String,
      default: "Onsite",
    },
    jobType: {
      type: String,
      default: "Full-Time",
    },
    country: {
      type: String,
      default: "Pakistan",
      // required: true,
    },
    city: {
      type: String,
      default: "Islamabad",
      // required: true,
    },
    hashTags: {
      type: Array,
      default: [],
    },
    applyEmail: {
      type: String,
    },
    applyPhone: {
      type: Number,
    },
    emailOTP: [
      {
        Email: String,
        OTP: Number,
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("JobAd", jobAdSchema);
