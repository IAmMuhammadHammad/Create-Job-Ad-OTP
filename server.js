import express from "express";
import authRoutes from "./routes/authRoutes.js";
import connectDB from "./db/connect.js";
import dotenv from "dotenv";
import bodyParser from "body-parser";

const app = express();



// >------------------------
// >> Server Middlewares
// >------------------------

app.use(express.json());
app.use(bodyParser.json());
dotenv.config({ path: "./.env" });





// >------------------------
// >> Authentication Middleware
// >------------------------

app.use("/api/auth", authRoutes);




// >------------------------
// >> Server is Running
// >------------------------

const PORT = process.env.PORT || 3000;
const start = async () => {
  try {
    app.listen(PORT, () => {
      console.log(`Server is running`);
    });
    await connectDB(process.env.MONGO_URI);
  } catch (error) {
    console.log(error);
  }
};
start();
