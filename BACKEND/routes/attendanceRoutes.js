import express from 'express';
import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';

const router = express.Router();
const OFFICE_QR_CODE = "9515174064";

const getToday = () => new Date().toISOString().split("T")[0];

/* ===================================================
   1. CHECK DEVICE — Auto login using ONLY deviceId
=================================================== */
router.post("/check-device", async (req, res) => {
  try {
    const { deviceId } = req.body;
    const today = getToday();

    const record = await Attendance.findOne({
      "attendance": {
        $elemMatch: { date: today, deviceId: deviceId }
      }
    });

    if (record) {
      const todayLog = record.attendance.find(a => a.date === today);
      return res.json({
        status: "ALREADY_MARKED",
        employeeId: record.employeeId,
        employeeName: record.employeeName,
        todayLog: todayLog
      });
    }

    return res.json({ status: "NEW_DEVICE" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===================================================
   2. VERIFY EMPLOYEE — PREVENT deviceId reuse
=================================================== */
router.post("/verify-employee", async (req, res) => {
  try {
    const { employeeId, deviceId } = req.body;
    const today = getToday();

    // Check if same device used by another employee today
    const deviceCheck = await Attendance.findOne({
      "attendance": {
        $elemMatch: {
          date: today,
          deviceId: deviceId
        }
      }
    });

    if (deviceCheck && deviceCheck.employeeId !== employeeId) {
      return res.status(403).json({
        message: "⛔ This device has already marked attendance today."
      });
    }

    const validEmployee = await Employee.findOne({ employeeId });
    if (!validEmployee)
      return res.status(404).json({ message: "Invalid employee number" });

    // Check if employee already marked attendance
    const attendanceRecord = await Attendance.findOne({ employeeId });
    const todayLog =
      attendanceRecord?.attendance.find(a => a.date === today) || null;

    return res.json({
      success: true,
      name: validEmployee.name,
      attendanceMarked: !!todayLog,
      todayLog: todayLog
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ===================================================
   3. PUNCH-IN — Only block reused deviceId
=================================================== */
router.post("/punch-in", async (req, res) => {
  try {
    const { employeeId, employeeName, latitude, longitude, qrCode, deviceId } =
      req.body;

    if (qrCode !== OFFICE_QR_CODE)
      return res.status(400).json({ message: "Invalid QR Code." });
    if (!latitude || !longitude)
      return res.status(400).json({ message: "GPS Required." });
    if (!deviceId)
      return res.status(400).json({ message: "Device ID Missing." });

    const today = getToday();
    const now = new Date();

    let attendance = await Attendance.findOne({ employeeId });
    if (!attendance) {
      attendance = new Attendance({
        employeeId,
        employeeName,
        attendance: []
      });
    }

    // CHECK: Employee already marked today?
    const todayRecord = attendance.attendance.find(a => a.date === today);

    if (todayRecord) {
      return res.json({
        success: true,
        message: "Already Marked",
        data: todayRecord,
        employeeName: attendance.employeeName
      });
    }

    // CHECK: Device used by another employee today?
    const deviceUsed = await Attendance.findOne({
      "attendance": {
        $elemMatch: {
          date: today,
          deviceId: deviceId
        }
      }
    });

    if (deviceUsed && deviceUsed.employeeId !== employeeId) {
      return res
        .status(403)
        .json({ message: "⛔ Device already used by another employee today." });
    }

    // ADD NEW ATTENDANCE RECORD
    const newEntry = {
      date: today,
      deviceId: deviceId,
      punchIn: now,
      punchInLocation: {
        latitude,
        longitude,
        timestamp: now
      },
      status: "WORKING",
      displayTime: "0h 0m 0s"
    };

    attendance.attendance.push(newEntry);
    await attendance.save();

    return res.json({
      success: true,
      message: "Success",
      data: newEntry,
      employeeName: employeeName
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
