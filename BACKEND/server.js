import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import attendanceRoutes from "./routes/attendanceRoutes.js";

// Load .env variables
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Connect DB from .env
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("DB Error:", err));

// Routes
app.use("/api/attendance", attendanceRoutes);

// Server
app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
