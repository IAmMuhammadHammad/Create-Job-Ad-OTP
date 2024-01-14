import mongoose from "mongoose";

const connectDB = async (uri) => {
    try {
    const connectDataBase = await mongoose.connect(uri);
    console.log(`Connected with DB`);
    return connectDataBase;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

export default connectDB;