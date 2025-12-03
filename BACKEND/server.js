import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import attendanceRoutes from "./routes/attendanceRoutes.js";

const app = express();
app.use(express.json());
app.use(cors());

// Connect DB
mongoose.connect("mongodb+srv://ajayarahinfotech_db_user:Cms%40123@cms.lbqsmyv.mongodb.net/hrms?retryWrites=true&w=majority")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error(err));

app.use("/api/attendance", attendanceRoutes);

app.listen(5000, () => console.log("Server running on port 5000"));