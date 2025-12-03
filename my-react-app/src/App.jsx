import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { Scanner } from "@yudiel/react-qr-scanner"; 
import { FaCheckCircle, FaClock, FaCalendarAlt, FaSignInAlt, FaSignOutAlt } from "react-icons/fa";
import { Loader2, XCircle } from "lucide-react";
import "./Appstyle.css"; 

// UPDATED: Reads from .env (VITE_API_URL) with a local fallback
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const API_URL = `${BASE_URL}/attendance`;

const App = () => {
  const [view, setView] = useState("LOADING"); 
  const [deviceId, setDeviceId] = useState(null);
  const [employee, setEmployee] = useState({ id: "", name: "" });
  const [todayLog, setTodayLog] = useState(null);
  const [inputId, setInputId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const processingScan = useRef(false);

  // 🔥 FIXED — Disable auto-login fully
  useEffect(() => {
    const initDevice = async () => {
      try {
        const fpPromise = FingerprintJS.load();
        const fp = await fpPromise;
        const result = await fp.get();

        setDeviceId(result.visitorId);
        setView("LOGIN"); // Always show login page
      } catch (err) {
        setView("LOGIN");
      }
    };
    initDevice();
  }, []);

  // Timer update
  useEffect(() => {
    let interval;
    if (view === "DASHBOARD" && todayLog?.punchIn && !todayLog.punchOut) {
      const start = new Date(todayLog.punchIn).getTime();
      const tick = () => {
        setElapsed(Math.floor((new Date().getTime() - start) / 1000));
      };
      tick();
      interval = setInterval(tick, 1000);
    }
    return () => clearInterval(interval);
  }, [view, todayLog]);

  const getLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }

      const highAccOptions = { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 };
      const lowAccOptions = { enableHighAccuracy: false, timeout: 15000, maximumAge: 30000 };

      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            (err) => {
              let msg = "GPS Error";
              if (err.code === 1) msg = "Permission Denied. Enable GPS.";
              if (window.location.protocol === "http:" && window.location.hostname !== "localhost") {
                msg += " (Mobile requires HTTPS)";
              }
              reject(new Error(msg));
            },
            lowAccOptions
          );
        },
        highAccOptions
      );
    });
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!inputId.trim()) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const { data } = await axios.post(`${API_URL}/verify-employee`, {
        employeeId: inputId,
        deviceId: deviceId,
      });

      setEmployee({ id: inputId, name: data.name });

      if (data.attendanceMarked) {
        setTodayLog(data.todayLog);
        setView("DASHBOARD");
      } else {
        setView("SCANNER");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Connection Error";
      setErrorMsg(msg);
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (detectedCodes) => {
    if (loading || processingScan.current) return;
    if (!detectedCodes || detectedCodes.length === 0) return;

    const rawValue = detectedCodes[0].rawValue;
    if (!rawValue) return;

    processingScan.current = true;
    setLoading(true);

    try {
      const loc = await getLocation();
      const { data } = await axios.post(
        `${API_URL}/punch-in`,
        {
          employeeId: employee.id,
          employeeName: employee.name,
          latitude: loc.lat,
          longitude: loc.lon,
          qrCode: rawValue,
          deviceId: deviceId,
        },
        { timeout: 15000 }
      );

      setTodayLog(data.data);
      alert(`${data.employeeName} ATTENDANCE SUCCESS`);
      setView("DASHBOARD");
    } catch (err) {
      let msg = err.response?.data?.message || err.message || "Scan Failed.";
      alert(msg);
    } finally {
      setLoading(false);
      setTimeout(() => {
        processingScan.current = false;
      }, 2000);
    }
  };

  const formatSeconds = (s) => {
    const h = Math.floor(s / 3600).toString().padStart(2, "0");
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${h}h ${m}m ${sec}s`;
  };

  const formatTimeStr = (dateStr) => {
    if (!dateStr) return "--:--";
    return new Date(dateStr).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (view === "LOADING")
    return (
      <div className="loading-container">
        <Loader2 className="spinner" />
      </div>
    );

  if (view === "LOGIN") {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1 className="login-title">Employee Login</h1>

          <form onSubmit={handleVerify} className="login-form">
            <input
              type="text"
              value={inputId}
              onChange={(e) => setInputId(e.target.value.toUpperCase())}
              placeholder="Employee ID"
              className="login-input"
            />

            {errorMsg && (
              <p className="error-message" style={{ color: "red", fontWeight: "bold" }}>
                {errorMsg}
              </p>
            )}

            <button disabled={loading} className="login-button">
              {loading ? "Checking..." : "Next"}
            </button>
          </form>

          <p className="host-info">Host: {window.location.hostname}</p>
        </div>
      </div>
    );
  }

  if (view === "SCANNER") {
    return (
      <div className="scanner-container">
        <div className="scanner-title">
          <h2>Scan Office QR</h2>
        </div>

        <div className="scanner-wrapper">
          <Scanner
            onScan={handleScan}
            constraints={{ facingMode: "environment" }}
            scanDelay={2000}
            styles={{ container: { height: "100%" } }}
          />
        </div>

        <button onClick={() => setView("LOGIN")} className="cancel-button">
          <XCircle /> Cancel
        </button>

        {loading && (
          <div className="loading-overlay">
            <Loader2 className="spinner" style={{ width: "3rem", height: "3rem", marginBottom: "1rem" }} />
            <p className="loading-text">Marking Attendance...</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <div className="success-icon">
          <FaCheckCircle />
        </div>

        <h2 className="employee-name">{employee.name}</h2>
        <p className="employee-id">{employee.id}</p>

        <div className="success-banner">
          <p className="success-text">{todayLog?.punchOut ? "Day Completed" : "Attendance Active"}</p>

          <div className="date-info">
            <FaCalendarAlt />
            <span>{new Date().toLocaleDateString()}</span>
          </div>
        </div>

        <div
          className="timings-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            marginTop: "20px",
            width: "100%",
          }}
        >
          <div style={{ background: "#f0f9ff", padding: "10px", borderRadius: "10px", textAlign: "center" }}>
            <FaSignInAlt style={{ color: "#0284c7", marginBottom: "5px" }} />
            <p style={{ fontSize: "0.8rem", color: "#64748b" }}>Punch In</p>
            <p style={{ fontWeight: "bold", color: "#0f172a" }}>
              {todayLog ? formatTimeStr(todayLog.punchIn) : "--:--"}
            </p>
          </div>

          <div style={{ background: "#fef2f2", padding: "10px", borderRadius: "10px", textAlign: "center" }}>
            <FaSignOutAlt style={{ color: "#dc2626", marginBottom: "5px" }} />
            <p style={{ fontSize: "0.8rem", color: "#64748b" }}>Punch Out</p>
            <p style={{ fontWeight: "bold", color: "#0f172a" }}>
              {todayLog?.punchOut ? formatTimeStr(todayLog.punchOut) : "--:--"}
            </p>
          </div>
        </div>

        <div style={{ marginTop: "20px" }}>
          <p className="hours-label">
            {todayLog?.punchOut ? "Total Worked Hours" : "Current Worked Hours"}
          </p>

          <div className="timer-container">
            <FaClock className="timer-icon" />
            {todayLog?.punchOut ? todayLog.displayTime : formatSeconds(elapsed)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;