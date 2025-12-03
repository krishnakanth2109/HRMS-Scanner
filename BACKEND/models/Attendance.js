import mongoose from "mongoose";

// --- 1. Sub-Schemas (From Original File) ---

const LocationSchema = new mongoose.Schema({
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  address: { type: String, default: null },
  timestamp: { type: Date, default: null }
}, { _id: false });

const IdleActivitySchema = new mongoose.Schema({
  idleStart: { type: Date, required: true },
  idleEnd: { type: Date, default: null }, // Null means currently idle
}, { _id: false });

// --- 2. Daily Schema (Merged Original + New Features) ---

const DailySchema = new mongoose.Schema({
  date: { type: String, required: true },

  // 🚀 NEW FIELDS (For Device Fingerprinting Project)
  deviceId: { type: String, default: null }, // Stores the Fingerprint Hash
  ipAddress: { type: String, default: null }, // Stores Network IP

  // ⏰ TIME LOGS
  punchIn: { type: Date, default: null },
  punchOut: { type: Date, default: null },

  // 📍 LOCATION
  punchInLocation: { type: LocationSchema, default: null },
  punchOutLocation: { type: LocationSchema, default: null },

  // 📊 CALCULATIONS (From Original File)
  workedHours: { type: Number, default: 0 },
  workedMinutes: { type: Number, default: 0 },
  workedSeconds: { type: Number, default: 0 },
  displayTime: { type: String, default: "0h 0m 0s" },

  // 🏷 STATUS ENUMS
  status: {
    type: String,
    enum: ["NOT_STARTED", "WORKING", "COMPLETED", "ABSENT"],
    default: "NOT_STARTED",
  },

  loginStatus: {
    type: String,
    enum: ["ON_TIME", "LATE", "NOT_APPLICABLE"],
    default: "NOT_APPLICABLE",
  },

  workedStatus: {
    type: String,
    enum: ["FULL_DAY", "HALF_DAY", "QUARTER_DAY", "ABSENT", "NOT_APPLICABLE"],
    default: "NOT_APPLICABLE",
  },

  attendanceCategory: {
    type: String,
    enum: ["FULL_DAY", "HALF_DAY", "ABSENT", "NOT_APPLICABLE"],
    default: "NOT_APPLICABLE"
  },

  // 💤 IDLE TRACKING (From Original File)
  idleActivity: {
    type: [IdleActivitySchema],
    default: []
  }
});

// --- 3. Main Schema ---

const AttendanceSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true },
  employeeName: { type: String, required: true },
  attendance: [DailySchema],
});

export default mongoose.model("Attendance", AttendanceSchema);