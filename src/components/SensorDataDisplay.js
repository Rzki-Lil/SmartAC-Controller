import React from "react";
import { motion } from "framer-motion";
import { WiTime8 } from "react-icons/wi";
import format from "date-fns/format";
import fromUnixTime from "date-fns/fromUnixTime";
import isValid from "date-fns/isValid";

const SensorDataDisplay = ({ temperature, humidity, timestamp }) => {
  const getFormattedTime = () => {
    if (!timestamp) return "No data available";

    let normalizedTimestamp = timestamp;

    const currentTime = Math.floor(Date.now() / 1000);
    const timeDiff = Math.abs(currentTime - timestamp);

    if (timeDiff > 25000) {
      normalizedTimestamp = timestamp + 7 * 3600;
    }

    const date = fromUnixTime(
      normalizedTimestamp.toString().length === 10
        ? normalizedTimestamp
        : normalizedTimestamp / 1000
    );

    if (!isValid(date)) return "Invalid timestamp";

    return format(date, "MMM d, yyyy HH:mm:ss 'WIB'");
  };

  const getTempGradient = () => {
    if (!temperature || isNaN(temperature))
      return "from-gray-400/80 via-gray-400/40 to-gray-400/5";

    if (temperature < 18)
      return "from-blue-500/80 via-blue-500/40 to-blue-500/5";
    if (temperature < 25)
      return "from-green-500/80 via-green-500/40 to-green-500/5";
    if (temperature < 28)
      return "from-yellow-500/80 via-yellow-500/40 to-yellow-500/5";
    return "from-red-500/80 via-red-500/40 to-red-500/5";
  };

  const getHumidityGradient = () => {
    if (!humidity || isNaN(humidity))
      return "from-gray-400/80 via-gray-400/40 to-gray-400/5";

    if (humidity < 30)
      return "from-yellow-500/80 via-yellow-500/40 to-yellow-500/5";
    if (humidity < 60) return "from-teal-500/80 via-teal-500/40 to-teal-500/5";
    return "from-blue-500/80 via-blue-500/40 to-blue-500/5";
  };

  const tempGradient = getTempGradient();
  const humidityGradient = getHumidityGradient();

  return (
    <div className="w-full py-3 sm:py-5 md:py-6">
      <div className="flex justify-center mb-2 sm:mb-3 md:mb-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-1 text-[10px] sm:text-xs text-center text-gray-400"
        >
          <WiTime8 className="text-sm sm:text-base" />
          {getFormattedTime()}
        </motion.div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-8 md:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center"
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="text-center"
          >
            <span
              className={`text-5xl sm:text-7xl md:text-8xl lg:text-[11rem] leading-none font-bold bg-gradient-to-b ${tempGradient} bg-clip-text text-transparent`}
            >
              {temperature ? parseFloat(temperature).toFixed(1) : "--"}
            </span>
            <span
              className={`ml-1 text-xl sm:text-3xl md:text-3xl lg:text-5xl font-medium bg-gradient-to-b ${tempGradient} bg-clip-text text-transparent`}
            >
              °C
            </span>

            <div className="mt-1 sm:mt-2 md:mt-3">
              <span className="text-[9px] sm:text-xs md:text-sm font-light tracking-widest text-gray-400 uppercase">
                temperature
              </span>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col items-center"
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="text-center"
          >
            <span
              className={`text-5xl sm:text-7xl md:text-8xl lg:text-[11rem] leading-none font-bold bg-gradient-to-b ${humidityGradient} bg-clip-text text-transparent`}
            >
              {humidity ? parseFloat(humidity).toFixed(1) : "--"}
            </span>
            <span
              className={`ml-1 text-xl sm:text-3xl md:text-3xl lg:text-5xl font-medium bg-gradient-to-b ${humidityGradient} bg-clip-text text-transparent`}
            >
              %
            </span>

            <div className="mt-1 sm:mt-2 md:mt-3">
              <span className="text-[9px] sm:text-xs md:text-sm font-light tracking-widest text-gray-400 uppercase">
                humidity
              </span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default SensorDataDisplay;
