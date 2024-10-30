import React from 'react';
import acImage from '../../assets/ac1.png';  
import espImage from '../../assets/esp1.png';
import { FaChevronUp, FaChevronDown } from 'react-icons/fa'; 
import { WiDaySunny, WiCloud, WiStrongWind, WiHumidity, WiNightAltCloudy } from 'react-icons/wi';
import { FaFan } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { ref, set, onValue } from 'firebase/database';
import { db } from '../../firebase/config';  
import { debounce } from 'lodash';  
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { FaWhatsapp, FaGithub, FaTiktok } from 'react-icons/fa';
import LoginButton from '../../components/LoginButton';
import { auth } from '../../firebase/config';

// Fix untuk icon marker
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

export default function Home() {
  const [temperature, setTemperature] = useState(17);
  const [mode, setMode] = useState('cool');
  const [fanSpeed, setFanSpeed] = useState(1);
  const [isSwingOn, setIsSwingOn] = useState(false);
  const [homeLocation] = useState([-6.525450, 106.810636]); 
  const [userLocation, setUserLocation] = useState(null); 
  const [otherUsers] = useState([ 
    //SOON
  ]);
  const [isRadiusActive, setIsRadiusActive] = useState(false);
  const [isPowerOn, setIsPowerOn] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  const modes = [
    { name: 'cool', icon: <WiCloud className="text-4xl" /> },
    { name: 'heat', icon: <WiDaySunny className="text-4xl" /> },
    { name: 'fan', icon: <WiStrongWind className="text-4xl" /> },
    { name: 'dry', icon: <WiHumidity className="text-4xl" /> },
    { name: 'auto', icon: <WiNightAltCloudy className="text-4xl" /> }
  ];

  // Supaya tidak terlalu sering update ke firebase
  const debouncedUpdate = debounce((newState) => {
    set(ref(db, 'ac_control'), {
      ...newState,
      timestamp: Date.now()
    }).catch((error) => {
      if (error.code === 'PERMISSION_DENIED') {
        setError('Anda tidak memiliki akses untuk mengubah pengaturan AC');
        // Reset state ke nilai sebelumnya dari database
        const acRef = ref(db, 'ac_control');
        onValue(acRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            setTemperature(data.temperature);
            setMode(data.mode);
            setFanSpeed(data.fanSpeed);
            setIsSwingOn(data.swing);
            setIsPowerOn(data.power);
          }
        });
      }
      console.error('Error updating AC state:', error);
    });
  }, 300); 

  const updateACState = (newState) => {
    debouncedUpdate({
      temperature,
      mode,
      fanSpeed,
      swing: isSwingOn,
      power: isPowerOn,
      ...newState  
    });
  };

  const handleTemperature = (action) => {
    if (action === 'increase' && temperature < 30) {
      setTemperature(prev => {
        const newTemp = prev + 1;
        updateACState({ temperature: newTemp });
        return newTemp;
      });
    } else if (action === 'decrease' && temperature > 16) {
      setTemperature(prev => {
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
    setIsSwingOn(prev => {
      const newState = !prev;
      updateACState({ swing: newState });
      return newState;
    });
  };


  useEffect(() => {
    const acRef = ref(db, 'ac_control');
    onValue(acRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setTemperature(data.temperature);
        setMode(data.mode);
        setFanSpeed(data.fanSpeed);
        setIsSwingOn(data.swing);
        setIsPowerOn(data.power);
      }
    });
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  const radiusSize = 5000; //km

  const circleOptions = {
    color: 'teal',
    fillColor: '#30D5C8',
    fillOpacity: 0.2,
  };

  const homeIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });

  const userIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });

  const otherUserIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });

  const getFanSpinSpeed = (speed) => {
    switch(speed) {
      case 1: return 'animate-spin-slow'; // 3s
      case 2: return 'animate-spin-medium'; // 1.5s
      case 3: return 'animate-spin-fast'; // 0.5s
      default: return '';
    }
  };

 
  const handlePower = () => {
    setIsPowerOn(prev => {
      const newState = !prev;
      updateACState({ power: newState });
      return newState;
    });
  };


  const [controlRef, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });


  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.2
      }
    }
  };

  const heroVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };

  const imageVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.8,
        delay: 0.3,
        ease: "easeOut"
      }
    }
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
          className="w-5 h-5 flex-shrink-0" 
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
          className="text-white hover:text-gray-200 p-1 flex-shrink-0"
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
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-white font-montserrat relative">
      {/* Add Error Notification */}
      <ErrorNotification />

      {/* AppBar */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="shadow-lg py-4 px-4 md:px-12 lg:px-24 xl:px-32 2xl:px-[100px] flex justify-between items-center"
      >
        <h1 className="text-xl 2xl:text-4xl font-semibold text-gray-800">
          My Wireless Remote
        </h1>
        <LoginButton user={user} setUser={setUser} />
      </motion.div>

      {/* Hero Section */}
      <div className="px-4 md:px-12 lg:px-24 xl:px-32 2xl:px-[200px] py-4 md:py-12">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 lg:gap-1">
          {/* Left Content */}
          <motion.div 
            variants={heroVariants}
            initial="hidden"
            animate="visible"
            className="lg:w-1/2 text-center lg:text-left"
          >
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[50px] font-bold mb-4 leading-[30px] sm:leading-[35px] md:leading-[40px] lg:leading-[70px]">
              Turn Your <motion.span 
                initial={{ color: "#000" }}
                animate={{ color: "#EF4444" }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="text-red-500"
              >Old Ass</motion.span> AC
              <br className="hidden lg:block" />
              <span className="lg:hidden"> </span>
              Into a Smart AC - Control Anytime, Anywhere with
              <motion.span 
                initial={{ color: "#000" }}
                animate={{ color: "#14B8A6" }}
                transition={{ duration: 0.5, delay: 1.2 }}
                className="text-teal-500"
              > ESP8266!</motion.span>
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
      </div>

      {/* Divider */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1.5 }}
        className="px-4 md:px-12 lg:px-24 xl:px-32 2xl:px-[200px]"
      >
        <div className="h-0.5 bg-gradient-to-r from-transparent via-black to-transparent"></div>
      </motion.div>

      {/* Control Section */}
      <div className="container mx-auto px-4 md:px-12 lg:px-24 xl:px-32 2xl:px-[200px] py-0 sm:py-12 md:py-16 lg:py-20">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
          {/* Left Control Panel */}
          <motion.div 
            ref={controlRef}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            variants={containerVariants}
            className="w-full lg:w-1/3 space-y-3 sm:space-y-4 mt-4 sm:mt-0"
          >
            {/* Power Control */}
            <motion.div variants={containerVariants} className="card-control">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs sm:text-sm">Power</p>
                  <h3 className="text-base sm:text-lg lg:text-xl font-bold">AC Control</h3>
                </div>
                <button 
                  onClick={handlePower}
                  className={`btn-power ${isPowerOn ? 'btn-power-on' : 'btn-power-off'}`}
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

            <div className={`controls-container ${!isPowerOn && 'controls-disabled'}`}>
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-1 gap-2 sm:gap-3 md:gap-4">
                {/* Temperature Control */}
                <motion.div variants={containerVariants} className="card-temperature col-span-2 sm:col-span-2 md:col-span-1">
                  <div className="text-center">
                    <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">{temperature}°C</span>
                  </div>
                  <div className="flex justify-around mt-2 sm:mt-3">
                    <button 
                      onClick={() => handleTemperature('increase')}
                      className="temp-button"
                      disabled={temperature >= 30}
                    >
                      <FaChevronUp className="text-lg sm:text-xl md:text-2xl" />
                    </button>
                    <button 
                      onClick={() => handleTemperature('decrease')}
                      className="temp-button"
                      disabled={temperature <= 16}
                    >
                      <FaChevronDown className="text-lg sm:text-xl md:text-2xl" />
                    </button>
                  </div>
                </motion.div>

                {/* Mode Control */}
                <motion.div variants={containerVariants} className="card-mode">
                  <div className="flex justify-between items-center mb-2 sm:mb-3">
                    <span className="text-xs sm:text-sm">Mode</span>
                    <span className="text-xs sm:text-sm capitalize">{mode}</span>
                  </div>
                  <div className="flex flex-col items-center gap-3 md:gap-4">
                    <div className="flex justify-center gap-3 md:gap-6 lg:gap-20">
                      {modes.slice(0, 3).map((m) => (
                        <button
                          key={m.name}
                          onClick={() => handleModeChange(m.name)}
                          className={`control-button rounded-full p-2 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center transition-all duration-300
                            ${mode === m.name ? 'bg-white text-black' : 'hover:bg-gray-800'}`}
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
                          className={`control-button rounded-full p-2 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center transition-all duration-300
                            ${mode === m.name ? 'bg-white text-black' : 'hover:bg-gray-800'}`}
                        >
                          {m.icon}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* Fan Control */}
                <motion.div variants={containerVariants} className="card-mode">
                  <div className="flex justify-between items-center mb-2 sm:mb-3">
                    <span className="text-xs sm:text-sm">Fan Speed</span>
                    <span className="text-xs sm:text-sm">Level {fanSpeed}</span>
                  </div>
                  <div className="fan-buttons-container flex justify-center gap-4 sm:gap-6">
                    {[1, 2, 3].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => handleFanSpeed(speed)}
                        className={`control-button rounded-full p-2 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center transition-all duration-300
                          ${fanSpeed === speed ? 'bg-white text-black' : 'hover:bg-gray-800'}`}
                      >
                        <FaFan 
                          className={`text-base sm:text-lg
                            ${fanSpeed === speed ? getFanSpinSpeed(speed) : ''}`} 
                        />
                      </button>
                    ))}
                  </div>
                </motion.div>

                {/* Swing Control */}
                <motion.div variants={containerVariants} className="card-mode col-span-2 md:col-span-1">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs sm:text-sm">Swing</p>
                      <h3 className="text-sm sm:text-base lg:text-lg font-bold">Mode</h3>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-xs sm:text-sm">{isSwingOn ? 'ON' : 'OFF'}</span>
                      <button 
                        onClick={handleSwing}
                        className={`w-12 sm:w-16 h-6 sm:h-8 rounded-full relative transition-all ease-in-out duration-500
                          ${isSwingOn ? 'bg-teal-500' : 'bg-gray-600'}`}
                      >
                        <div className={`absolute w-5 sm:w-6 h-5 sm:h-6 bg-white rounded-full shadow-md top-0.5 sm:top-1 transition-all ease-in-out duration-500 
                          ${isSwingOn ? 'right-0.5 sm:right-1' : 'left-0.5 sm:left-1'}`} 
                        />
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Right Map Section */}
          <motion.div 
            className="w-full lg:w-2/3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <div className="card">
              <h2 className="text-sm sm:text-base lg:text-xl font-bold mb-2 sm:mb-3">YOUR HOME LOCATION</h2>
              <div className="rounded-lg overflow-hidden h-[200px] sm:h-[250px] md:h-[300px] lg:h-[400px]">
                <MapContainer 
                  center={homeLocation} 
                  zoom={13} 
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  {/* Marker untuk lokasi rumah */}
                  <Marker position={homeLocation} icon={homeIcon}>
                    <Popup>
                      Your Home Location
                    </Popup>
                  </Marker>

                  {/* Marker untuk lokasi user saat ini */}
                  {userLocation && (
                    <Marker position={userLocation} icon={userIcon}>
                      <Popup>
                        Your Current Location
                      </Popup>
                    </Marker>
                  )}

                  {/* Marker untuk user lain */}
                  {otherUsers.map(user => (
                    <Marker 
                      key={user.id}
                      position={user.location}
                      icon={otherUserIcon}
                    >
                      <Popup>
                        {user.name}
                      </Popup>
                    </Marker>
                  ))}

                  {/* Circle untuk radius */}
                  {isRadiusActive && (
                    <Circle
                      center={homeLocation}
                      radius={radiusSize}
                      pathOptions={circleOptions}
                    />
                  )}
                </MapContainer>
              </div>
              <div className="mt-2 sm:mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                <p className="text-xs sm:text-sm">Activate the AC when you enter the radius of your home location on the map.</p>
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-xs sm:text-sm">{isRadiusActive ? 'ON' : 'OFF'}</span>
                  <button 
                    onClick={() => setIsRadiusActive(!isRadiusActive)}
                    className={`w-12 sm:w-16 h-6 sm:h-8 rounded-full relative transition-all ease-in-out duration-500
                      ${isRadiusActive ? 'bg-teal-500' : 'bg-gray-600'}`}
                  >
                    <div className={`absolute w-5 sm:w-6 h-5 sm:h-6 bg-white rounded-full shadow-md top-0.5 sm:top-1 transition-all ease-in-out duration-500 
                      ${isRadiusActive ? 'right-0.5 sm:right-1' : 'left-0.5 sm:left-1'}`} 
                    />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Tambahkan bottom bar sebelum closing div terakhir */}
      <div className="bg-black text-white py-4 px-4 md:px-12 lg:px-24 xl:px-32 2xl:px-[100px] mt-8">
        <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
          {/* Copyright dan Project Name */}
          <div className="text-sm sm:text-base">
            <span>© 2024 MyRemoteAC Project</span>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-4 sm:gap-6">
            <a 
              href="https://wa.me/6281382885716" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-teal-500 transition-colors duration-300"
            >
              <FaWhatsapp className="text-lg sm:text-xl" />
            
            </a>

            <a 
              href="https://tiktok.com/@mutaks" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-teal-500 transition-colors duration-300"
            >
              <FaTiktok className="text-lg sm:text-xl" />
            </a>

            <a 
              href="https://github.com/Rzki-Lil" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-teal-500 transition-colors duration-300"
            >
              <FaGithub className="text-lg sm:text-xl" />
              <span className="text-sm sm:text-base">Rzki-Lil</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 