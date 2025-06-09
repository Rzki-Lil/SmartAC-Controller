import React, { useCallback } from "react";

import { FaChevronUp, FaChevronDown } from "react-icons/fa";
import {
  WiDaySunny,
  WiCloud,
  WiStrongWind,
  WiHumidity,
  WiNightAltCloudy,
} from "react-icons/wi";
import { FaFan } from "react-icons/fa";
import { useState, useEffect, useRef } from "react";
import { ref, set, onValue, get } from "firebase/database";
import { db } from "../../firebase/config";
import { debounce } from "lodash";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { FaWhatsapp, FaGithub, FaTiktok } from "react-icons/fa";
import LoginButton from "../../components/LoginButton";
import { auth } from "../../firebase/config";
import SensorDataDisplay from "../../components/SensorDataDisplay";
import NotificationToast from "../../components/NotificationToast";
import DeviceSelector from "../../components/DeviceSelector";
import greeImage from "../../assets/images/brand/gree.png";
import daikinImage from "../../assets/images/brand/daikin.png";
import samsungImage from "../../assets/images/brand/samsung.webp";
import fujitsuImage from "../../assets/images/brand/fujitsu.png";
import hitachiImage from "../../assets/images/brand/hitachi.png";
import panasonicImage from "../../assets/images/brand/panasonic.png";

const acBrands = [
  {
    id: "gree",
    name: "Gree",
    image: greeImage,
  },
  {
    id: "daikin",
    name: "Daikin",
    image: daikinImage,
  },
  {
    id: "samsung",
    name: "Samsung",
    image: samsungImage,
  },
  {
    id: "fujitsu",
    name: "Fujitsu",
    image: fujitsuImage,
  },
  {
    id: "hitachi",
    name: "Hitachi",
    image: hitachiImage,
  },
  {
    id: "panasonic",
    name: "Panasonic",
    image: panasonicImage,
  },
];

const TimePickerInput = ({ value, onChange, label, disabled }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempTime, setTempTime] = useState(value);

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
  const [selectedBrand, setSelectedBrand] = useState("gree");
  const scrollContainerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [userDevices, setUserDevices] = useState([]);

  const resetAllStates = useCallback(() => {
    setTemperature(17);
    setMode("cool");
    setFanSpeed(1);
    setIsSwingOn(false);
    setIsPowerOn(false);
    setStartTime("00:00");
    setEndTime("00:00");
    setScheduleEnabled(false);
    setSelectedBrand("gree");
    setSensorData({
      temperature: null,
      humidity: null,
      timestamp: null,
    });
  }, []);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const distance = (x - startX) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeft - distance;
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      if (!user) {
        resetAllStates();
      }
    });
    return () => unsubscribe();
  }, [resetAllStates]);

  useEffect(() => {
    if (!user) {
      setSelectedDevice(null);
      setUserDevices([]);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSelectedDevice(null);
      setUserDevices([]);
      return;
    }

    // Only auto-select if no device is selected and devices are available
    if (userDevices.length > 0 && !selectedDevice) {
      const firstDevice = userDevices[0];
      if (firstDevice !== selectedDevice) {
        setSelectedDevice(firstDevice);
      }
    } else if (userDevices.length === 0 && selectedDevice) {
      setSelectedDevice(null);
      resetAllStates();
    } else if (selectedDevice && !userDevices.includes(selectedDevice)) {
      // Current device no longer exists, select first available
      if (userDevices.length > 0) {
        setSelectedDevice(userDevices[0]);
      } else {
        setSelectedDevice(null);
        resetAllStates();
      }
    }
  }, [user, userDevices.length, selectedDevice, resetAllStates]); // Use userDevices.length instead of userDevices

  useEffect(() => {
    if (!selectedDevice) return;

    const acRef = ref(db, `devices/${selectedDevice}/ac_control`);
    const unsubscribe = onValue(
      acRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setTemperature(data.temperature || 17);
          setMode(data.mode || "cool");
          setFanSpeed(data.fanSpeed || 1);
          setIsSwingOn(data.swing || false);
          setIsPowerOn(data.power || false);
          setStartTime(data.startTime || "00:00");
          setEndTime(data.endTime || "00:00");
          setScheduleEnabled(data.scheduleEnabled || false);
          setSelectedBrand(data.selectedBrand || "gree");
        }
      },
      {
        onlyOnce: false, 
      }
    );

    return () => unsubscribe();
  }, [selectedDevice]);

  const debouncedUpdateCallback = useCallback(
    debounce((newState) => {
      if (!selectedDevice || !user) {
        setError("Please select a device first");
        return;
      }

      const updateState = async () => {
        try {
          const userDeviceRef = ref(db, `user_devices/${user.uid}/${selectedDevice}`);
          const deviceSnapshot = await get(userDeviceRef);
          
          if (!deviceSnapshot.exists()) {
            throw new Error("You don't have access to this device");
          }

          const deviceRef = ref(db, `devices/${selectedDevice}/ac_control`);
          const currentSnapshot = await get(deviceRef);
          const currentData = currentSnapshot.exists() ? currentSnapshot.val() : {};
          
          const updatedState = {
            ...currentData,
            temperature: currentData.temperature || 17,
            mode: currentData.mode || "cool",
            fanSpeed: currentData.fanSpeed || 1,
            swing: currentData.swing || false,
            power: currentData.power || false,
            startTime: currentData.startTime || "00:00",
            endTime: currentData.endTime || "00:00",
            scheduleEnabled: currentData.scheduleEnabled || false,
            selectedBrand: currentData.selectedBrand || "gree",
            ...newState,
            timestamp: Date.now(),
            last_user: user.uid,
          };

          await set(deviceRef, updatedState);
          console.log("AC state updated successfully:", updatedState);
        } catch (error) {
          console.error("Error updating AC state:", error);
          setError(error.message || "Failed to update AC state");
        }
      };

      updateState();
    }, 300),
    [selectedDevice, user] // Keep these dependencies
  );

  // Handle cleanup of debounced function
  useEffect(() => {
    return () => {
      if (debouncedUpdateCallback.cancel) {
        debouncedUpdateCallback.cancel();
      }
    };
  }, [debouncedUpdateCallback]);

  const updateACState = useCallback((newState) => {
    debouncedUpdateCallback(newState);
  }, [debouncedUpdateCallback]);

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

  const handleTemperature = (action) => {
    if (!selectedDevice) {
      setError("Please select a device first");
      return;
    }

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
    if (!selectedDevice) {
      setError("Please select a device first");
      return;
    }

    setMode(newMode);
    updateACState({ mode: newMode });
  };

  const handleFanSpeed = (speed) => {
    if (!selectedDevice) {
      setError("Please select a device first");
      return;
    }

    setFanSpeed(speed);
    updateACState({ fanSpeed: speed });
  };

  const handleSwing = () => {
    if (!selectedDevice) {
      setError("Please select a device first");
      return;
    }

    setIsSwingOn((prev) => {
      const newState = !prev;
      updateACState({ swing: newState });
      return newState;
    });
  };

  useEffect(() => {
    if (!selectedDevice) return;

    const acRef = ref(db, `devices/${selectedDevice}/ac_control`);
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
        setSelectedBrand(data.selectedBrand || "gree");
      }
    });

    return () => unsubscribe();
  }, [selectedDevice]);

  useEffect(() => {
    if (!selectedDevice) return;

    const sensorRef = ref(db, `devices/${selectedDevice}/sensor_data`);
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
  }, [selectedDevice]);

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
    if (!selectedDevice) {
      setError("Please select a device first");
      return;
    }

    const newState = !isPowerOn;
    setIsPowerOn(newState);
    updateACState({ power: newState });
  };

  const handleScheduleChange = (type, value) => {
    if (!selectedDevice) {
      setError("Please select a device first");
      return;
    }

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
    if (!selectedDevice) {
      setError("Please select a device first");
      return;
    }

    setScheduleEnabled((prev) => {
      const newState = !prev;

      if (newState) {
        setIsPowerOn(false);
        debouncedUpdateCallback({
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

  const handleBrandChange = (brandId) => {
    if (!selectedDevice) {
      setError("Please select a device first");
      return;
    }

    setSelectedBrand(brandId);
    updateACState({ selectedBrand: brandId });
  };

  const handleDeviceSelect = useCallback(
    (deviceId) => {
      console.log("Device selected:", deviceId);

      // Prevent unnecessary updates
      if (deviceId === selectedDevice) return;

      setSelectedDevice(deviceId);

      if (!deviceId) {
        resetAllStates();
        return;
      }

      // Fetch device data immediately after selection
      const deviceRef = ref(db, `devices/${deviceId}/ac_control`);
      get(deviceRef)
        .then((snapshot) => {
          const data = snapshot.val();
          if (data) {
            setTemperature(data.temperature || 17);
            setMode(data.mode || "cool");
            setFanSpeed(data.fanSpeed || 1);
            setIsSwingOn(data.swing || false);
            setIsPowerOn(data.power || false);
            setStartTime(data.startTime || "00:00");
            setEndTime(data.endTime || "00:00");
            setScheduleEnabled(data.scheduleEnabled || false);
            setSelectedBrand(data.selectedBrand || "gree");
          } else {
            const defaultSettings = {
              temperature: 17,
              mode: "cool",
              fanSpeed: 1,
              swing: false,
              power: false,
              startTime: "00:00",
              endTime: "00:00",
              scheduleEnabled: false,
              selectedBrand: "gree",
              timestamp: Date.now(),
            };

            set(deviceRef, defaultSettings);
          }
        })
        .catch((error) => {
          console.error("Error fetching device data:", error);
          setError("Failed to load device data. Please try again.");
        });

      const sensorRef = ref(db, `devices/${deviceId}/sensor_data`);
      get(sensorRef)
        .then((snapshot) => {
          const data = snapshot.val();
          if (data) {
            setSensorData({
              temperature: data.temperature,
              humidity: data.humidity,
              timestamp: data.timestamp,
            });
          }
        })
        .catch((error) => {
          console.error("Error fetching sensor data:", error);
        });
    },
    [selectedDevice, resetAllStates] 
  );

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
    <div className="relative min-h-screen overflow-hidden font-montserrat">
      {/* Simple gradient background */}
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50">
        <div className="absolute inset-0 bg-white/30 backdrop-blur-[1px]" />
      </div>

      {/* Main content */}
      <div className="relative z-10">
        <NotificationToast
          type="error"
          message={error}
          isVisible={!!error}
          onClose={() => setError(null)}
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

          {!selectedDevice && user && (
            <div className="p-4 mt-4 text-center border rounded-lg bg-sky-50 border-sky-200">
              <h3 className="text-lg font-medium text-sky-700">
                Please select a device to continue
              </h3>
              <p className="text-sm text-gray-600">
                Use the device selector below
              </p>
            </div>
          )}
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
            {/* Device Selector */}
            <motion.div
              variants={childVariants}
              className="bg-white border-2 shadow-sm card border-sky-100"
            >
              {user ? (
                <DeviceSelector
                  user={user}
                  selectedDevice={selectedDevice}
                  onDeviceSelect={handleDeviceSelect}
                  onDevicesChange={setUserDevices}
                />
              ) : (
                <div className="p-4 text-center">
                  <p className="text-sm text-sky-600">
                    Please sign in to manage your devices
                  </p>
                </div>
              )}
            </motion.div>

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
                  } ${!selectedDevice ? "opacity-50 cursor-not-allowed" : ""}`}
                  disabled={!selectedDevice}
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

            {/* AC Brand Selection */}
            <motion.div
              variants={childVariants}
              className="bg-white border-2 shadow-sm card border-sky-100"
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-xs sm:text-sm text-sky-400">
                  AC Brand
                </span>
                <span className="text-xs capitalize sm:text-sm text-sky-600">
                  {acBrands.find((brand) => brand.id === selectedBrand)?.name}
                </span>
              </div>
              <div className="relative">
                <div
                  ref={scrollContainerRef}
                  onMouseDown={handleMouseDown}
                  onMouseUp={handleMouseUp}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseUp}
                  className="flex overflow-x-scroll hide-scrollbar cursor-grab active:cursor-grabbing"
                  style={{
                    msOverflowStyle: "none",
                    scrollbarWidth: "none",
                    WebkitOverflowScrolling: "touch",
                    userSelect: "none",
                  }}
                >
                  <div className="flex gap-4 p-4 w-max">
                    {acBrands.map((brand) => (
                      <button
                        key={brand.id}
                        onClick={() =>
                          !isDragging && handleBrandChange(brand.id)
                        }
                        className={`flex-none w-[150px] 
                          flex flex-col items-center justify-center p-4 rounded-lg border-2
                          ${
                            selectedBrand === brand.id
                              ? "bg-sky-100 border-sky-300"
                              : "bg-sky-50 border-sky-200 hover:bg-sky-100 hover:border-sky-300"
                          }`}
                      >
                        <img
                          src={brand.image}
                          alt={brand.name}
                          className="object-contain w-16 h-16 select-none"
                          draggable="false"
                        />
                        <span className="mt-2 text-sm font-medium select-none text-sky-600">
                          {brand.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                {acBrands.length > 3 && (
                  <>
                    <div className="absolute top-0 bottom-0 left-0 z-10 w-8 pointer-events-none bg-gradient-to-r from-white to-transparent" />
                    <div className="absolute top-0 bottom-0 right-0 z-10 w-8 pointer-events-none bg-gradient-to-l from-white to-transparent" />
                  </>
                )}
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
                        to bottom,
                        rgb(220, 38, 38) 0%,   /* Red for hottest */
                        rgb(253, 186, 116) 30%, /* Orange for warm */
                        rgb(56, 189, 248) 70%, /* Sky blue for cool */
                        rgb(3, 105, 161) 100%  /* Deep blue for coldest */
                      )`,
                      backgroundSize: "100% 200%",
                      backgroundPosition: `0% ${
                        temperature <= 16
                          ? "100%" /* Coldest - deep blue */
                          : temperature >= 30
                          ? "0%" /* Hottest - bright red */
                          : `${
                              100 - ((temperature - 16) / (30 - 16)) * 100
                            }%` /* Gradual transition */
                      }`,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
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
                <span className="text-xs sm:text-sm text-sky-400">
                  Schedule
                </span>
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
    </div>
  );
}
