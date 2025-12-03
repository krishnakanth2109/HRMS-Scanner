import mongoose from "mongoose";

const EmployeeSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  // Add other fields if necessary (shift details etc from your existing Shift model)
});

export default mongoose.model("Employee", EmployeeSchema);