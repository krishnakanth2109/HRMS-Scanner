import React, { useState, useEffect } from "react";
import { getAttendance, punchIn, punchOut } from "./api";

const AttendancePanel = ({ employeeId, employeeName, onLogout }) => {
  const [todayLog, setTodayLog] = useState(null);
  const [status, setStatus] = useState("IDLE"); // IDLE, FETCHING_LOC, PUNCHING
  const [workedTime, setWorkedTime] = useState("0h 0m 0s");
  const [errorMsg, setErrorMsg] = useState("");

  const todayDate = new Date().toISOString().split("T")[0];

  // Fetch Data
  const loadData = async () => {
    try {
      const logs = await getAttendance(employeeId);
      const todayEntry = logs.find((l) => l.date === todayDate);
      setTodayLog(todayEntry || null);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [employeeId]);

  // Timer Effect
  useEffect(() => {
    let interval;
    if (todayLog?.punchIn && !todayLog.punchOut) {
      interval = setInterval(() => {
        const now = new Date();
        const start = new Date(todayLog.punchIn);
        const diffMs = now - start;
        const totalSeconds = Math.floor(diffMs / 1000);
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        setWorkedTime(`${h}h ${m}m ${s}s`);
      }, 1000);
    } else if (todayLog?.displayTime) {
      setWorkedTime(todayLog.displayTime);
    }
    return () => clearInterval(interval);
  }, [todayLog]);

  // Get Location Helper
  const getLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true }
      );
    });
  };

  const handlePunch = async (type) => {
    setStatus("FETCHING_LOC");
    setErrorMsg("");

    try {
      const loc = await getLocation();
      setStatus("PUNCHING");

      const payload = {
        employeeId,
        employeeName, // Only needed for first punch-in to create record
        latitude: loc.lat,
        longitude: loc.lng,
      };

      if (type === "IN") {
        await punchIn(payload);
      } else {
        await punchOut(payload);
      }

      await loadData(); // Refresh data
      setStatus("IDLE");
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Punch failed. Check location permissions.");
      setStatus("IDLE");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white rounded-xl shadow-lg overflow-hidden p-6 border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h2 className="text-xl font-bold text-gray-800">Hi, {employeeName}</h2>
            <p className="text-sm text-gray-500">ID: {employeeId}</p>
        </div>
        <button onClick={onLogout} className="text-sm text-red-500 underline">Change User</button>
      </div>

      <div className="bg-blue-50 rounded-lg p-4 mb-6 text-center">
        <p className="text-gray-600 uppercase text-xs font-bold tracking-wider mb-1">Today's Status</p>
        <div className="text-3xl font-mono font-bold text-blue-600">{workedTime}</div>
        <div className="mt-2">
            {todayLog?.punchIn ? (
                todayLog.punchOut ? (
                    <span className="text-red-600 font-bold">Check Out Completed</span>
                ) : (
                    <span className="text-green-600 font-bold animate-pulse">● Working Now</span>
                )
            ) : (
                <span className="text-gray-400">Not Started</span>
            )}
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">
          ⚠️ {errorMsg}
        </div>
      )}

      <div className="flex gap-4">
        {!todayLog?.punchIn ? (
          <button
            onClick={() => handlePunch("IN")}
            disabled={status !== "IDLE"}
            className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-bold transition disabled:opacity-50"
          >
            {status !== "IDLE" ? "Processing..." : "PUNCH IN"}
          </button>
        ) : !todayLog?.punchOut ? (
          <button
            onClick={() => handlePunch("OUT")}
            disabled={status !== "IDLE"}
            className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-bold transition disabled:opacity-50"
          >
            {status !== "IDLE" ? "Processing..." : "PUNCH OUT"}
          </button>
        ) : (
            <div className="w-full bg-gray-100 text-gray-500 py-3 rounded-lg font-bold text-center">
                Attendance Completed
            </div>
        )}
      </div>
      
      {todayLog?.punchInLocation && (
        <div className="mt-4 text-xs text-gray-400 text-center">
            Lat: {todayLog.punchInLocation.latitude.toFixed(4)}, 
            Lng: {todayLog.punchInLocation.longitude.toFixed(4)}
        </div>
      )}
    </div>
  );
};

export default AttendancePanel;