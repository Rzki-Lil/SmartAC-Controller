import React from "react";
import acImage from "../../assets/ac1.png";
import espImage from "../../assets/esp1.png";
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

const TimePickerInput = ({ value, onChange, label, disabled }) => {
  const [hours, minutes] = value.split(":").map(Number);

  const hoursOptions = Array.from({ length: 24 }, (_, i) => ({
    value: i,
    display: String(i).padStart(2, "0"),
  }));

  const minutesOptions = Array.from({ length: 60 }, (_, i) => {
    const mins = i * 1;
    return {
      value: mins,
      display: String(mins).padStart(2, "0"),
    };
  });

  const handleTimeChange = (type, newValue) => {
    const newHours = type === "hours" ? newValue : hours;
    const newMinutes = type === "minutes" ? newValue : minutes;
    const formattedTime = `${String(newHours).padStart(2, "0")}:${String(
      newMinutes
    ).padStart(2, "0")}`;
    onChange(formattedTime);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-center text-gray-500 sm:text-sm">
        {label}
      </label>

      <div className="flex items-center justify-center gap-2">
        {/* Hours selector */}
        <div className="relative w-1/2">
          <select
            value={hours}
            onChange={(e) =>
              handleTimeChange("hours", parseInt(e.target.value))
            }
            disabled={disabled}
            className={`
              w-full bg-gray-800 text-white rounded-lg py-3 pl-4 pr-10 text-center
              appearance-none focus:ring-2 focus:ring-teal-500 outline-none
              transition-all duration-200 ease-in-out text-lg
              ${
                disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-700"
              }
            `}
          >
            {hoursOptions.map((option) => (
              <option key={`hour-${option.value}`} value={option.value}>
                {option.display}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <span className="text-sm text-gray-400">h</span>
          </div>
        </div>

        {/* Minutes selector */}
        <div className="relative w-1/2">
          <select
            value={minutes}
            onChange={(e) =>
              handleTimeChange("minutes", parseInt(e.target.value))
            }
            disabled={disabled}
            className={`
              w-full bg-gray-800 text-white rounded-lg py-3 pl-4 pr-10 text-center
              appearance-none focus:ring-2 focus:ring-teal-500 outline-none
              transition-all duration-200 ease-in-out text-lg
              ${
                disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-700"
              }
            `}
          >
            {minutesOptions.map((option) => (
              <option key={`min-${option.value}`} value={option.value}>
                {option.display}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <span className="text-sm text-gray-400">m</span>
          </div>
        </div>
      </div>

      {/* Simple explanation for better UX */}
      <p className="mt-1 text-xs text-center text-gray-500">
        {label.includes("Start")
          ? "When AC will turn on"
          : "When AC will turn off"}
      </p>
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
      // Allow any end time now, even if it's earlier than start time
      setEndTime(value);
      updateACState({ endTime: value, scheduleEnabled });
    }
  };

  // Helper function to check if this is an overnight schedule
  const isOvernightSchedule = (start, end) => {
    // If end time is less than start time, it's an overnight schedule
    return end < start;
  };

  // Helper function to create a user-friendly time range display
  const formatScheduleTime = (start, end) => {
    if (isOvernightSchedule(start, end)) {
      return `${start} (today) to ${end} (tomorrow)`;
    } else {
      return `${start} to ${end} (same day)`;
    }
  };

  const handleScheduleToggle = () => {
    setScheduleEnabled((prev) => {
      const newState = !prev;

      // If enabling schedule, turn power off
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
        updateACState({
          scheduleEnabled: newState,
          startTime,
          endTime,
        });
      }

      return newState;
    });
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

  const heroVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut",
      },
    },
  };

  const imageVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.8,
        delay: 0.3,
        ease: "easeOut",
      },
    },
  };

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [error]);

  const ErrorNotification = () => {
    if (!error) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed top-4 left-0 right-0 mx-auto z-[9999]
                   w-fit bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg
                   flex items-center gap-3 min-w-[300px] max-w-[90%]"
      >
        <svg
          className="flex-shrink-0 w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <span className="flex-1 text-sm font-medium">{error}</span>
        <button
          onClick={() => setError(null)}
          className="flex-shrink-0 p-1 text-white hover:text-gray-200"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </motion.div>
    );
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-cyan-50 to-white font-montserrat">
      {/* Add Error Notification */}
      <ErrorNotification />

      {/* AppBar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="shadow-lg py-4 px-4 md:px-12 lg:px-24 xl:px-32 2xl:px-[100px] flex justify-between items-center"
      >
        <h1 className="font-semibold text-gray-800 sm:text-1xl md:text-3xl lg:text-4xl">
          My Wireless Remote
        </h1>
        <LoginButton user={user} setUser={setUser} />
      </motion.div>

      {/* Hero Section */}
      <motion.div
        ref={heroRef}
        initial="hidden"
        animate={heroInView ? "visible" : "hidden"}
        variants={containerVariants}
        className="px-4 md:px-12 lg:px-24 xl:px-32 2xl:px-[200px] py-4 md:py-8"
      >
        <div className="flex flex-col items-center justify-between gap-4 lg:flex-row lg:gap-1">
          {/* Left Content */}
          <motion.div
            variants={heroVariants}
            initial="hidden"
            animate="visible"
            className="text-center lg:w-1/2 lg:text-left"
          >
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[50px] font-bold mb-4 leading-[30px] sm:leading-[35px] md:leading-[40px] lg:leading-[70px]">
              Turn Your{" "}
              <motion.span
                initial={{ color: "#000" }}
                animate={{ color: "#EF4444" }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="text-red-500"
              >
                Old
              </motion.span>{" "}
              AC
              <br className="hidden lg:block" />
              <span className="lg:hidden"> </span>
              Into a Smart AC - Control Anytime, Anywhere with
              <motion.span
                initial={{ color: "#000" }}
                animate={{ color: "#14B8A6" }}
                transition={{ duration: 0.5, delay: 1.2 }}
                className="text-teal-500"
              >
                {" "}
                ESP8266!
              </motion.span>
            </h1>
          </motion.div>

          {/* Right Content */}
          <motion.div
            variants={imageVariants}
            initial="hidden"
            animate="visible"
            className="lg:w-1/2 flex justify-center lg:mt-20 px-4 sm:px-8 md:px-0 relative h-[300px] sm:h-[350px] lg:h-[400px]"
          >
            {/* Gambar AC */}
            <motion.div className="relative z-10">
              <img
                src={acImage}
                alt="Smart AC"
                className="rounded-2xl shadow-lg w-[250px] sm:w-[300px] lg:w-[380px]"
              />
            </motion.div>

            {/* Gambar ESP - posisi overlap dengan AC */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="absolute top-[35%] -right-4 sm:-right-8 lg:-right-0 z-20"
            >
              <img
                src={espImage}
                alt="ESP8266 Module"
                className="rounded-xl shadow-lg w-[250px] sm:w-[300px] lg:w-[380px]"
              />
            </motion.div>
          </motion.div>
        </div>
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
          <motion.div variants={childVariants} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm">Power</p>
                <h3 className="text-base font-bold sm:text-lg lg:text-xl">
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
          <motion.div variants={childVariants} className="card">
            <div className="flex items-center justify-between">
              <button
                onClick={() => handleTemperature("decrease")}
                className={`temp-button ${
                  temperature <= 16
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-gray-800"
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
                      rgb(59, 130, 246) ${Math.max(
                        0,
                        100 - (temperature - 16) * 7.14
                      )}%, 
                      rgb(139, 92, 246) ${Math.max(
                        0,
                        150 - (temperature - 16) * 7.14
                      )}%,
                      rgb(239, 68, 68) 100%
                    )`,
                    "--temp-glow-color":
                      temperature <= 20
                        ? "rgb(59, 130, 246)"
                        : temperature >= 26
                        ? "rgb(239, 68, 68)"
                        : "rgb(139, 92, 246)",
                  }}
                >
                  {temperature}°C
                </span>
                <div className="mt-2 text-xs text-gray-400 sm:text-sm">
                  {temperature <= 20
                    ? "Cool"
                    : temperature >= 26
                    ? "Hot"
                    : "Moderate"}
                </div>
              </div>

              <button
                onClick={() => handleTemperature("increase")}
                className={`temp-button ${
                  temperature >= 30
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-gray-800"
                }`}
                disabled={temperature >= 30}
              >
                <FaChevronUp className="text-xl sm:text-2xl md:text-3xl" />
              </button>
            </div>
          </motion.div>

          {/* Mode Control */}
          <motion.div variants={childVariants} className="card">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-xs sm:text-sm">Mode</span>
              <span className="text-xs capitalize sm:text-sm">{mode}</span>
            </div>
            <div className="flex flex-col items-center gap-3 md:gap-4">
              <div className="flex justify-center gap-3 md:gap-6 lg:gap-20">
                {modes.slice(0, 3).map((m) => (
                  <button
                    key={m.name}
                    onClick={() => handleModeChange(m.name)}
                    className={`control-button ${
                      mode === m.name ? "active" : ""
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
                      mode === m.name ? "active" : ""
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
            <motion.div variants={childVariants} className="card">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-xs sm:text-sm">Fan Speed</span>
                <span className="text-xs sm:text-sm">Level {fanSpeed}</span>
              </div>
              <div className="flex justify-center gap-4 fan-buttons-container sm:gap-6">
                {[1, 2, 3].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => handleFanSpeed(speed)}
                    className={`control-button ${
                      fanSpeed === speed ? "active" : ""
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

            <motion.div variants={childVariants} className="swing-card">
              <div className="swing-toggle-container">
                <span className="text-xs sm:text-sm">Swing Mode</span>
                <button
                  onClick={handleSwing}
                  className={`swing-toggle ${
                    isSwingOn ? "bg-teal-500" : "bg-gray-600"
                  }`}
                >
                  <div
                    className="swing-toggle-slider"
                    style={{
                      left: isSwingOn ? "calc(100% - 32px)" : "4px",
                    }}
                  />
                </button>
                <span className="mt-1 text-xs sm:text-sm">
                  {isSwingOn ? "ON" : "OFF"}
                </span>
              </div>
            </motion.div>
          </motion.div>

          {/* Schedule Control */}
          <motion.div
            variants={childVariants}
            className="overflow-visible card"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs sm:text-sm">Schedule</span>
              <motion.button
                onClick={handleScheduleToggle}
                whileTap={{ scale: 0.95 }}
                className={`swing-toggle ${
                  scheduleEnabled ? "bg-teal-500" : "bg-gray-600"
                }`}
              >
                <motion.div
                  className="swing-toggle-slider"
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
                className="mt-4 text-center"
              >
                <p className="text-xs text-amber-400">Schedule is active</p>
                <p className="mt-1 text-xs text-white">
                  {formatScheduleTime(startTime, endTime)}
                </p>
                {isOvernightSchedule(startTime, endTime) && (
                  <p className="mt-1 text-xs text-gray-400">
                    (Overnight mode: AC will remain on past midnight)
                  </p>
                )}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* Update Footer - hapus fixed positioning */}
      <motion.footer
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false }}
        variants={containerVariants}
        className="footer-fixed"
      >
        {/* Social Links */}
        <div className="container px-4 py-3 mx-auto">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row sm:gap-0">
            <div className="text-sm sm:text-base">
              <span>© 2024 MyRemoteAC Project</span>
            </div>

            <div className="flex items-center gap-6">
              <a
                href="https://wa.me/6281382885716"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
              >
                <FaWhatsapp className="text-xl" />
              </a>

              <a
                href="https://tiktok.com/@mutaks"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
              >
                <FaTiktok className="text-xl" />
              </a>

              <a
                href="https://github.com/Rzki-Lil"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
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
