import React from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * 
 * @param {Object} props
 * @param {string} props.type
 * @param {string} props.message 
 * @param {function} props.onClose 
 * @param {boolean} props.isVisible
 * @param {number} props.autoCloseTime 
 */
const NotificationToast = ({
  type = "info",
  message,
  onClose,
  isVisible,
  autoCloseTime = 3000,
}) => {

  const getTypeStyles = () => {
    switch (type) {
      case "error":
        return "bg-red-500";
      case "success":
        return "bg-green-500";
      case "warning":
        return "bg-orange-500";
      case "info":
      default:
        return "bg-sky-500";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "error":
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        );
      case "success":
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        );
      case "warning":
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        );
      case "info":
      default:
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        );
    }
  };

  React.useEffect(() => {
    if (isVisible && autoCloseTime > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseTime);

      return () => clearTimeout(timer);
    }
  }, [isVisible, autoCloseTime, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.3 }}
          className={`fixed top-4 left-0 right-0 mx-auto z-[9999]
                     w-fit ${getTypeStyles()} text-white px-6 py-3 rounded-lg shadow-lg
                     flex items-center gap-3 min-w-[300px] max-w-[90%]`}
        >
          <svg
            className="flex-shrink-0 w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {getIcon()}
          </svg>
          <span className="flex-1 text-sm font-medium">{message}</span>
          <button
            onClick={onClose}
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
      )}
    </AnimatePresence>
  );
};

export default NotificationToast;
