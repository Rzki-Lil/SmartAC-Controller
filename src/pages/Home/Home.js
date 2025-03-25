import React from "react";

import { FaChevronUp, FaChevronDown } from "react-icons/fa";
import {
  WiDaySunny,
  WiCloud,
  WiStrongWind,
  WiHumidity,
  WiNightAltCloudy,
} from "react-icons/wi";
import { FaFan } from "react-icons/fa";
import { useState, useEffect } from "react";
import { ref, set, onValue } from "firebase/database";
import { db } from "../../firebase/config";
import { debounce } from "lodash";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { FaWhatsapp, FaGithub, FaTiktok } from "react-icons/fa";
import LoginButton from "../../components/LoginButton";
import { auth } from "../../firebase/config";
import SensorDataDisplay from "../../components/SensorDataDisplay";
import NotificationToast from "../../components/NotificationToast";

const TimePickerInput = ({ value, onChange, label, disabled }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempTime, setTempTime] = useState(value);
  const [hours, minutes] = value.split(":").map(Number);

  const openModal = () => {
    if (!disabled) {
      setTempTime(value);
      setIsModalOpen(true);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const saveTime = () => {
    onChange(tempTime);
    closeModal();
  };

  const updateTempTime = (type, newValue) => {
    const [h, m] = tempTime.split(":").map(Number);
    const newHours = type === "hours" ? newValue : h;
    const newMinutes = type === "minutes" ? newValue : m;
    setTempTime(
      `${String(newHours).padStart(2, "0")}:${String(newMinutes).padStart(
        2,
        "0"
      )}`
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-center text-sky-500 sm:text-sm">
        {label}
      </label>
      {/* Tampilan waktu yang bisa diklik */}
      <button
        onClick={openModal}
        className={`
          w-full bg-white text-sky-600 rounded-lg py-3 px-4 text-center
          border border-sky-200 transition-all duration-200 ease-in-out text-lg
          shadow-sm
          ${
            disabled
              ? "opacity-50 cursor-not-allowed"
              : "hover:border-sky-400 hover:bg-sky-50"
          }
        `}
        disabled={disabled}
      >
        <span className="text-2xl font-semibold">{value}</span>
        <div className="mt-1 text-xs text-sky-400">
          {label.includes("Start") ? "Waktu AC menyala" : "Waktu AC mati"}
        </div>
      </button>

      {/* Modal untuk memilih waktu */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 w-[90%] max-w-sm shadow-xl border border-sky-100 animate-fade-in">
            <h3 className="mb-4 text-lg font-semibold text-center text-sky-600">
              {label}
            </h3>

            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* Jam selector */}
              <div className="flex flex-col items-center">
                <span className="mb-2 text-sm text-sky-400">Jam</span>
                <div className="relative flex flex-col items-center">
                  <button
                    onClick={() =>
                      updateTempTime(
                        "hours",
                        (tempTime.split(":")[0] * 1 + 1) % 24
                      )
                    }
                    className="p-2 mb-2 rounded-full bg-sky-50 text-sky-500 hover:bg-sky-100"
                  >
                    <FaChevronUp />
                  </button>

                  <div className="text-3xl font-bold text-sky-600 min-w-[60px] text-center">
                    {tempTime.split(":")[0]}
                  </div>

                  <button
                    onClick={() =>
                      updateTempTime(
                        "hours",
                        (tempTime.split(":")[0] * 1 + 23) % 24
                      )
                    }
                    className="p-2 mt-2 rounded-full bg-sky-50 text-sky-500 hover:bg-sky-100"
                  >
                    <FaChevronDown />
                  </button>
                </div>
              </div>

              {/* Menit selector */}
              <div className="flex flex-col items-center">
                <span className="mb-2 text-sm text-sky-400">Menit</span>
                <div className="relative flex flex-col items-center">
                  <button
                    onClick={() =>
                      updateTempTime(
                        "minutes",
                        (tempTime.split(":")[1] * 1 + 5) % 60
                      )
                    }
                    className="p-2 mb-2 rounded-full bg-sky-50 text-sky-500 hover:bg-sky-100"
                  >
                    <FaChevronUp />
                  </button>

                  <div className="text-3xl font-bold text-sky-600 min-w-[60px] text-center">
                    {tempTime.split(":")[1]}
                  </div>

                  <button
                    onClick={() =>
                      updateTempTime(
                        "minutes",
                        (tempTime.split(":")[1] * 1 + 55) % 60
                      )
                    }
                    className="p-2 mt-2 rounded-full bg-sky-50 text-sky-500 hover:bg-sky-100"
                  >
                    <FaChevronDown />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-4 mt-4">
              <button
                onClick={closeModal}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600"
              >
                Batal
              </button>
              <button
                onClick={saveTime}
                className="flex-1 py-2.5 px-4 bg-sky-500 hover:bg-sky-600 rounded-lg text-white"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function Home() {
  const [temperature, setTemperature] = useState(17);
  const [mode, setMode] = useState("cool");
  const [fanSpeed, setFanSpeed] = useState(1);
  const [isSwingOn, setIsSwingOn] = useState(false);
  const [isPowerOn, setIsPowerOn] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [heroRef, heroInView] = useInView({
    triggerOnce: false,
    threshold: 0.1,
  });
  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("00:00");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [sensorData, setSensorData] = useState({
    temperature: null,
    humidity: null,
    timestamp: null,
  });
  const [smartAC, setSmartAC] = useState(false);
  const [smartACNotification, setSmartACNotification] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);
  // Supaya tidak terlalu sering update ke firebase
  const debouncedUpdate = debounce((newState) => {
    set(ref(db, "ac_control"), {
      temperature,
      mode,
      fanSpeed,
      swing: isSwingOn,
      power: isPowerOn,
      startTime,
      endTime,
      scheduleEnabled,
      smartAC,
      ...newState,
      timestamp: Date.now(),
    }).catch((error) => {
      if (error.code === "PERMISSION_DENIED") {
        setError("Anda tidak memiliki akses untuk mengubah pengaturan AC");
        const acRef = ref(db, "ac_control");
        onValue(acRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            setTemperature(data.temperature);
            setMode(data.mode);
            setFanSpeed(data.fanSpeed);
            setIsSwingOn(data.swing);
            setIsPowerOn(data.power);
            setStartTime(data.startTime || "00:00");
            setEndTime(data.endTime || "00:00");
            setScheduleEnabled(data.scheduleEnabled || false);
            setSmartAC(data.smartAC || false);
          }
        });
      }
      console.error("Error updating AC state:", error);
    });
  }, 250);
  const modes = [
    {
      name: "cool",
      icon: <WiCloud className="text-4xl md:text-5xl lg:text-6xl" />,
    },
    {
      name: "heat",
      icon: <WiDaySunny className="text-4xl md:text-5xl lg:text-6xl" />,
    },
    {
      name: "fan",
      icon: <WiStrongWind className="text-4xl md:text-5xl lg:text-6xl" />,
    },
    {
      name: "dry",
      icon: <WiHumidity className="text-4xl md:text-5xl lg:text-6xl" />,
    },
    {
      name: "auto",
      icon: <WiNightAltCloudy className="text-4xl md:text-5xl lg:text-6xl" />,
    },
  ];

  const updateACState = (newState) => {
    debouncedUpdate({
      temperature,
      mode,
      fanSpeed,
      swing: isSwingOn,
      power: isPowerOn,
      ...newState,
    });
  };

  const handleTemperature = (action) => {
    if (action === "increase" && temperature < 30) {
      setTemperature((prev) => {
        const newTemp = prev + 1;
        updateACState({ temperature: newTemp });
        return newTemp;
      });
    } else if (action === "decrease" && temperature > 16) {
      setTemperature((prev) => {
        const newTemp = prev - 1;
        updateACState({ temperature: newTemp });
        return newTemp;
      });
    }
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    updateACState({ mode: newMode });
  };

  const handleFanSpeed = (speed) => {
    setFanSpeed(speed);
    updateACState({ fanSpeed: speed });
  };

  const handleSwing = () => {
    setIsSwingOn((prev) => {
      const newState = !prev;
      updateACState({ swing: newState });
      return newState;
    });
  };

  useEffect(() => {
    const acRef = ref(db, "ac_control");
    const unsubscribe = onValue(acRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setTemperature(data.temperature);
        setMode(data.mode);
        setFanSpeed(data.fanSpeed);
        setIsSwingOn(data.swing);
        setIsPowerOn(data.power);
        setStartTime(data.startTime || "00:00");
        setEndTime(data.endTime || "00:00");
        setScheduleEnabled(data.scheduleEnabled || false);
        setSmartAC(data.smartAC || false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const sensorRef = ref(db, "sensor_data");
    const unsubscribe = onValue(sensorRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSensorData({
          temperature: data.temperature,
          humidity: data.humidity,
          timestamp: data.timestamp,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const getFanSpinSpeed = (speed) => {
    switch (speed) {
      case 1:
        return "animate-spin-slow";
      case 2:
        return "animate-spin-medium";
      case 3:
        return "animate-spin-fast";
      default:
        return "";
    }
  };

  const handlePower = () => {
    setIsPowerOn((prev) => {
      const newState = !prev;
      debouncedUpdate({
        temperature,
        mode,
        fanSpeed,
        swing: isSwingOn,
        power: newState,
        timestamp: Date.now(),
      });
      return newState;
    });
  };

  const handleScheduleChange = (type, value) => {
    if (type === "start") {
      setStartTime(value);
      updateACState({ startTime: value, scheduleEnabled });
    } else if (type === "end") {
      setEndTime(value);
      updateACState({ endTime: value, scheduleEnabled });
    }
  };

  const isOvernightSchedule = (start, end) => {
    return end < start;
  };
  const formatScheduleTime = (start, end) => {
    if (isOvernightSchedule(start, end)) {
      return `${start} today → ${end} tomorrow`;
    } else {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeStr = `${String(currentHour).padStart(2, "0")}:${String(
        currentMinute
      ).padStart(2, "0")}`;

      const [startHour, startMinute] = start.split(":").map(Number);
      const startTimeInMinutes = startHour * 60 + startMinute;
      const currentTimeInMinutes = currentHour * 60 + currentMinute;

      if (currentTimeInMinutes > startTimeInMinutes) {
        return `${start} today → ${end} tomorrow`;
      }

      return `${start} → ${end} today`;
    }
  };

  const handleScheduleToggle = () => {
    setScheduleEnabled((prev) => {
      const newState = !prev;

      if (newState) {
        setIsPowerOn(false);
        debouncedUpdate({
          scheduleEnabled: newState,
          startTime,
          endTime,
          power: false,
          timestamp: Date.now(),
        });
      } else {
        // Reset waktu ke "00:00" ketika jadwal dimatikan
        setStartTime("00:00");
        setEndTime("00:00");
        updateACState({
          scheduleEnabled: newState,
          startTime: "00:00",
          endTime: "00:00",
        });
      }

      return newState;
    });
  };

  const updateSmartAC = (newState) => {
    debouncedUpdate({
      smartAC: newState,
    });
  };

  const showSmartACNotification = (message) => {
    setSmartACNotification(message);

    setTimeout(() => {
      setSmartACNotification(null);
    }, 3000);
  };

  const handleSmartACToggle = () => {
    const newState = !smartAC;

    if (newState && !isPowerOn) {
      showSmartACNotification("SmartAC can't be enabled when AC power is off");
      return; // Don't proceed with toggle
    }

    setSmartAC(newState);
    updateSmartAC(newState);
  };

  const containerVariants = {
    hidden: {
      opacity: 0,
      y: 50,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut",
        staggerChildren: 0.1,
      },
    },
  };

  const childVariants = {
    hidden: {
      opacity: 0,
      y: 30,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };


  return (
    <div className="relative min-h-screen bg-white font-montserrat">
      {/* Replace both notification components */}
      <NotificationToast
        type="error"
        message={error}
        isVisible={!!error}
        onClose={() => setError(null)}
        autoCloseTime={3000}
      />

      <NotificationToast
        type="info"
        message={smartACNotification}
        isVisible={!!smartACNotification}
        onClose={() => setSmartACNotification(null)}
        autoCloseTime={3000}
      />

      {/* AppBar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="py-4 px-4 md:px-12 lg:px-24 xl:px-32 2xl:px-[100px] flex justify-between items-center bg-white shadow-sm"
      >
        <h1 className="font-semibold text-sky-600 sm:text-1xl md:text-3xl lg:text-4xl">
          My Wireless Remote
        </h1>
        <LoginButton user={user} setUser={setUser} />
      </motion.div>

      {/* Replace Hero Section with SensorDataDisplay */}
      <motion.div
        ref={heroRef}
        initial="hidden"
        animate={heroInView ? "visible" : "hidden"}
        variants={containerVariants}
        className="px-4 md:px-12 lg:px-24 xl:px-32 2xl:px-[200px] py-4 md:py-8"
      >
        <SensorDataDisplay
          temperature={sensorData.temperature}
          humidity={sensorData.humidity}
          timestamp={sensorData.timestamp}
        />
      </motion.div>

      {/* Control Section - Update layout */}
      <div className="container mx-auto px-4 md:px-12 lg:px-24 xl:px-32 2xl:px-[200px] py-4">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{
            once: false,
            amount: 0.2,
            margin: "-100px",
          }}
          variants={containerVariants}
          className="max-w-2xl mx-auto space-y-6"
        >
          {/* Power Control */}
          <motion.div
            variants={childVariants}
            className="bg-white border-2 shadow-sm card border-sky-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-sky-400">Power</p>
                <h3 className="text-base font-bold sm:text-lg lg:text-xl text-sky-600">
                  AC Control
                </h3>
              </div>
              <button
                onClick={handlePower}
                className={`btn-power ${
                  isPowerOn ? "btn-power-on" : "btn-power-off"
                }`}
              >
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </button>
            </div>
          </motion.div>

          {/* Temperature Control */}
          <motion.div
            variants={childVariants}
            className="bg-white border-2 shadow-sm card border-sky-100"
          >
            <div className="flex items-center justify-between">
              <button
                onClick={() => handleTemperature("decrease")}
                className={`temp-button bg-sky-50 text-sky-600 ${
                  temperature <= 16
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-sky-100"
                }`}
                disabled={temperature <= 16}
              >
                <FaChevronDown className="text-xl sm:text-2xl md:text-3xl" />
              </button>

              <div className="flex-1 text-center">
                <span
                  className="text-3xl temperature-text sm:text-4xl md:text-5xl lg:text-6xl"
                  style={{
                    backgroundImage: `linear-gradient(
                      to top,
                      rgb(56, 189, 248) 0%,  // Biru untuk dingin
                      rgb(125, 211, 252) 50%, // Gradasi biru muda
                      rgb(239, 68, 68) 100%   // Merah untuk panas
                    )`,
                    backgroundSize: "100% 200%",
                    backgroundPosition: `0% ${Math.min(
                      100,
                      (temperature - 16) * 7.14
                    )}%`, 
                    "--temp-glow-color":
                      temperature <= 20
                        ? "rgb(56, 189, 248)" 
                        : temperature >= 26
                        ? "rgb(239, 68, 68)" 
                        : "rgb(125, 211, 252)",
                  }}
                >
                  {temperature}°C
                </span>
                <div className="mt-2 text-xs text-sky-400 sm:text-sm">
                  {temperature <= 20
                    ? "Cool"
                    : temperature >= 26
                    ? "Hot"
                    : "Moderate"}
                </div>
              </div>

              <button
                onClick={() => handleTemperature("increase")}
                className={`temp-button bg-sky-50 text-sky-600 ${
                  temperature >= 30
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-sky-100"
                }`}
                disabled={temperature >= 30}
              >
                <FaChevronUp className="text-xl sm:text-2xl md:text-3xl" />
              </button>
            </div>
          </motion.div>

          {/* Mode Control */}
          <motion.div
            variants={childVariants}
            className="bg-white border-2 shadow-sm card border-sky-100"
          >
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-xs sm:text-sm text-sky-400">Mode</span>
              <span className="text-xs capitalize sm:text-sm text-sky-600">
                {mode}
              </span>
            </div>
            <div className="flex flex-col items-center gap-3 md:gap-4">
              <div className="flex justify-center gap-3 md:gap-6 lg:gap-20">
                {modes.slice(0, 3).map((m) => (
                  <button
                    key={m.name}
                    onClick={() => handleModeChange(m.name)}
                    className={`control-button ${
                      mode === m.name
                        ? "bg-sky-100 text-sky-600 border-sky-300"
                        : "bg-white text-gray-500 border-gray-200 hover:bg-sky-50"
                    }`}
                  >
                    {m.icon}
                  </button>
                ))}
              </div>
              <div className="flex justify-center gap-3 md:gap-6 lg:gap-8">
                {modes.slice(3).map((m) => (
                  <button
                    key={m.name}
                    onClick={() => handleModeChange(m.name)}
                    className={`control-button ${
                      mode === m.name
                        ? "bg-sky-100 text-sky-600 border-sky-300"
                        : "bg-white text-gray-500 border-gray-200 hover:bg-sky-50"
                    }`}
                  >
                    {m.icon}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Fan & Swing Controls */}
          <motion.div
            variants={childVariants}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            <motion.div
              variants={childVariants}
              className="bg-white border-2 shadow-sm card border-sky-100"
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-xs sm:text-sm text-sky-400">
                  Fan Speed
                </span>
                <span className="text-xs sm:text-sm text-sky-600">
                  Level {fanSpeed}
                </span>
              </div>
              <div className="flex justify-center gap-4 fan-buttons-container sm:gap-6">
                {[1, 2, 3].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => handleFanSpeed(speed)}
                    className={`control-button ${
                      fanSpeed === speed
                        ? "bg-sky-100 text-sky-600 border-sky-300"
                        : "bg-white text-gray-500 border-gray-200 hover:bg-sky-50"
                    }`}
                  >
                    <FaFan
                      className={`text-base sm:text-lg
                        ${fanSpeed === speed ? getFanSpinSpeed(speed) : ""}`}
                    />
                  </button>
                ))}
              </div>
            </motion.div>

            <motion.div
              variants={childVariants}
              className="bg-white border-2 shadow-sm swing-card border-sky-100"
            >
              <div className="swing-toggle-container">
                <span className="text-xs sm:text-sm text-sky-400">
                  Swing Mode
                </span>
                <button
                  onClick={handleSwing}
                  className={`swing-toggle ${
                    isSwingOn ? "bg-sky-500" : "bg-gray-300"
                  }`}
                >
                  <div
                    className="bg-white swing-toggle-slider"
                    style={{
                      left: isSwingOn ? "calc(100% - 32px)" : "4px",
                    }}
                  />
                </button>
                <span className="mt-1 text-xs sm:text-sm text-sky-600">
                  {isSwingOn ? "ON" : "OFF"}
                </span>
              </div>
            </motion.div>
          </motion.div>

          {/* Schedule Control */}
          <motion.div
            variants={childVariants}
            className="overflow-visible bg-white border-2 shadow-sm card border-sky-100"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs sm:text-sm text-sky-400">Schedule</span>
              <motion.button
                onClick={handleScheduleToggle}
                whileTap={{ scale: 0.95 }}
                className={`swing-toggle ${
                  scheduleEnabled ? "bg-sky-500" : "bg-gray-300"
                }`}
              >
                <motion.div
                  className="bg-white swing-toggle-slider"
                  animate={{
                    left: scheduleEnabled ? "calc(100% - 32px)" : "4px",
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </motion.button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <TimePickerInput
                label="Start Time (WIB)"
                value={startTime}
                onChange={(value) => handleScheduleChange("start", value)}
                disabled={!scheduleEnabled}
              />
              <TimePickerInput
                label="End Time (WIB)"
                value={endTime}
                onChange={(value) => handleScheduleChange("end", value)}
                disabled={!scheduleEnabled}
              />
            </div>

            {scheduleEnabled && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 mt-4 text-sm rounded-lg bg-sky-50"
              >
                <div className="flex items-center gap-2 mb-1">
                  <svg
                    className="w-4 h-4 text-sky-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="font-medium text-sky-700">
                    Schedule Active
                  </span>
                </div>
                <p className="mt-1 text-xs text-sky-600">
                  {formatScheduleTime(startTime, endTime)}
                </p>
                {isOvernightSchedule(startTime, endTime) && (
                  <p className="mt-1 text-xs text-sky-500">
                    <svg
                      className="inline-block w-3 h-3 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Overnight mode: AC will remain on past midnight
                  </p>
                )}
              </motion.div>
            )}
          </motion.div>

          <motion.div
            variants={childVariants}
            className="bg-white border-2 shadow-sm card border-sky-100"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs sm:text-sm text-sky-400">
                  Smart AC
                </span>
                <h3 className="text-base font-semibold sm:text-lg text-sky-600">
                  Auto Temperature Control
                </h3>
              </div>
              <motion.button
                onClick={handleSmartACToggle}
                whileTap={{ scale: 0.95 }}
                className={`swing-toggle ${
                  smartAC ? "bg-sky-500" : "bg-gray-300"
                }`}
              >
                <motion.div
                  className="bg-white swing-toggle-slider"
                  animate={{
                    left: smartAC ? "calc(100% - 32px)" : "4px",
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </motion.button>
            </div>

            <div className="p-3 mt-2 text-sm rounded-lg bg-sky-50 text-sky-700">
              {smartAC ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <WiDaySunny className="text-xl text-sky-500" />
                    <span className="font-medium">SmartAC is Active</span>
                  </div>
                  <p className="text-xs text-sky-600">
                    Based on room temperature and humidity, AC will
                    automatically adjust for optimal comfort and energy
                    efficiency.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <WiNightAltCloudy className="text-xl text-gray-500" />
                    <span className="font-medium">SmartAC is Inactive</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Enable SmartAC to automatically adjust temperature and fan
                    speed based on room conditions.
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Update Footer - hapus fixed positioning */}
      <motion.footer
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false }}
        variants={containerVariants}
        className="py-4 bg-white border-t shadow-sm border-sky-100"
      >
        {/* Social Links */}
        <div className="container px-4 py-3 mx-auto">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row sm:gap-0">
            <div className="text-sm sm:text-base text-sky-600">
              <span>© 2024 MyRemoteAC Project</span>
            </div>

            <div className="flex items-center gap-6">
              <a
                href="https://wa.me/6281382885716"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link text-sky-500 hover:text-sky-700"
              >
                <FaWhatsapp className="text-xl" />
              </a>

              <a
                href="https://tiktok.com/@mutaks"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link text-sky-500 hover:text-sky-700"
              >
                <FaTiktok className="text-xl" />
              </a>

              <a
                href="https://github.com/Rzki-Lil"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link text-sky-500 hover:text-sky-700"
              >
                <FaGithub className="text-xl" />
                <span className="text-sm sm:text-base">Rzki-Lil</span>
              </a>
            </div>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
