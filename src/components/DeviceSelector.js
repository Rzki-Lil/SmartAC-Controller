import React, { useState, useEffect } from "react";
import { ref, get, set, onValue, remove } from "firebase/database";
import { db } from "../firebase/config";

export default function DeviceSelector({
  onDeviceSelect,
  selectedDevice,
  user,
  onDevicesChange,
}) {
  const [devices, setDevices] = useState([]);
  const [deviceDetails, setDeviceDetails] = useState({});
  const [newDeviceId, setNewDeviceId] = useState("");
  const [error, setError] = useState("");
  const [editingDeviceId, setEditingDeviceId] = useState(null);
  const [editedName, setEditedName] = useState("");

  // Load user devices from user_devices node
  useEffect(() => {
    if (user && user.uid) {
      const userDevicesRef = ref(db, `user_devices/${user.uid}`);

      const unsubscribe = onValue(userDevicesRef, (snapshot) => {
        if (snapshot.exists()) {
          const userDevicesData = snapshot.val();
          const userDeviceIds = Object.keys(userDevicesData);

          // Store detailed information about each device
          const details = {};
          userDeviceIds.forEach((id) => {
            details[id] = {
              displayName: userDevicesData[id].displayName || id,
              added_at: userDevicesData[id].added_at,
            };
          });

          setDevices(userDeviceIds);
          setDeviceDetails(details);

          // If there's no selected device and we have devices, select the first one
          if (!selectedDevice && userDeviceIds.length > 0) {
            onDeviceSelect(userDeviceIds[0]);
          }
          if (onDevicesChange) onDevicesChange(userDeviceIds);
        } else {
          setDevices([]);
          setDeviceDetails({});
          if (onDevicesChange) onDevicesChange([]);
        }
      });

      return () => unsubscribe();
    } else {
      setDevices([]);
      setDeviceDetails({});
      if (onDevicesChange) onDevicesChange([]);
    }
  }, [user, onDevicesChange, selectedDevice, onDeviceSelect]);

  const handleAddDevice = async (e) => {
    e.preventDefault();

    if (!newDeviceId.trim()) {
      setError("Please enter a device ID");
      return;
    }

    if (!user?.uid) {
      setError("You must be logged in to add a device");
      return;
    }

    try {
      // Check if device exists in the database
      const deviceRef = ref(db, `devices/${newDeviceId}`);
      const deviceSnapshot = await get(deviceRef);

      if (!deviceSnapshot.exists()) {
        setError(`Device "${newDeviceId}" not found in the database`);
        return;
      }

      // Check if this device is already in the user's list
      const userDeviceRef = ref(db, `user_devices/${user.uid}/${newDeviceId}`);
      const userDeviceSnapshot = await get(userDeviceRef);

      if (userDeviceSnapshot.exists()) {
        setError(`Device "${newDeviceId}" is already connected`);
        return;
      }

      // Add the device to user's device list with initial data
      await set(userDeviceRef, {
        added_at: new Date().toISOString(),
        device_id: newDeviceId,
        displayName: newDeviceId, // Initialize display name with device ID
      });

      setNewDeviceId("");
      setError("");

      // Auto-select the newly added device
      onDeviceSelect(newDeviceId);
    } catch (error) {
      console.error("Error adding device:", error);

      // More specific error message
      if (error.code === "PERMISSION_DENIED") {
        setError(
          "Permission denied. Please check if you're logged in and have the right access."
        );
      } else {
        setError(`Error adding device: ${error.message || "Unknown error"}`);
      }
    }
  };

  const removeDevice = async (deviceId) => {
    if (!user) return;

    try {
      // Remove device from user's device list
      const userDeviceRef = ref(db, `user_devices/${user.uid}/${deviceId}`);
      await remove(userDeviceRef);

      // If the removed device was selected, clear selection
      if (selectedDevice === deviceId) {
        onDeviceSelect(null);
      }
    } catch (error) {
      console.error("Error removing device:", error);
      setError(`Error removing device: ${error.message || "Unknown error"}`);
    }
  };

  const startEditing = (deviceId) => {
    const currentName = deviceDetails[deviceId]?.displayName || deviceId;
    setEditingDeviceId(deviceId);
    setEditedName(currentName);
  };

  const saveDeviceName = async () => {
    if (!editingDeviceId || !user) return;

    try {
      // Update display name in user_devices
      const userDeviceRef = ref(
        db,
        `user_devices/${user.uid}/${editingDeviceId}`
      );
      const snapshot = await get(userDeviceRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        await set(userDeviceRef, {
          ...data,
          displayName: editedName.trim() || editingDeviceId,
        });
      }

      // Reset editing state
      setEditingDeviceId(null);
      setEditedName("");
    } catch (error) {
      console.error("Error saving device name:", error);
      setError(`Error saving device name: ${error.message || "Unknown error"}`);
    }
  };

  const cancelEditing = () => {
    setEditingDeviceId(null);
    setEditedName("");
  };

  return (
    <div>
      {/* Heading section */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-xs sm:text-sm text-sky-400">My Devices</span>
          <h3 className="text-base font-semibold sm:text-lg text-sky-600">
            Select AC Controller
          </h3>
        </div>
      </div>

      {/* Device List */}
      <div className="mb-4 space-y-2">
        {devices.length === 0 ? (
          <div className="p-4 text-sm text-center rounded-lg bg-sky-50 text-sky-600">
            No devices connected. Add a device below.
          </div>
        ) : (
          devices.map((deviceId) => (
            <div
              key={deviceId}
              className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-200
                ${
                  selectedDevice === deviceId
                    ? "bg-sky-100 border-sky-300"
                    : "bg-white border-sky-200 hover:border-sky-300 hover:bg-sky-50"
                }`}
            >
              {editingDeviceId === deviceId ? (
                // Edit mode
                <div className="flex flex-col flex-1 gap-2">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="w-full p-2 border rounded text-sky-700 border-sky-300 focus:ring-1 focus:ring-sky-400"
                    placeholder="Enter device name"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={saveDeviceName}
                      className="px-3 py-1 text-xs text-white rounded bg-sky-500 hover:bg-sky-600"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="px-3 py-1 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="mt-1 text-xs text-gray-400">
                    Device ID: {deviceId}
                  </div>
                </div>
              ) : (
                // Display mode
                <>
                  <button
                    onClick={() => onDeviceSelect(deviceId)}
                    className="flex-1 text-left"
                  >
                    <span className="text-sm font-medium text-sky-700">
                      {deviceDetails[deviceId]?.displayName || deviceId}
                    </span>
                    {deviceDetails[deviceId]?.displayName !== deviceId && (
                      <div className="mt-1 text-xs text-gray-400">
                        ID: {deviceId}
                      </div>
                    )}
                  </button>
                  <div className="flex items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(deviceId);
                      }}
                      className="p-2 ml-2 text-gray-400 rounded-full hover:bg-sky-50 hover:text-sky-500"
                      title="Rename device"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeDevice(deviceId);
                      }}
                      className="p-2 ml-2 text-gray-400 rounded-full hover:bg-red-50 hover:text-red-500"
                      title="Remove device"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-5 h-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add New Device Form */}
      <form onSubmit={handleAddDevice} className="space-y-3">
        <div>
          <input
            type="text"
            value={newDeviceId}
            onChange={(e) => setNewDeviceId(e.target.value)}
            placeholder="Enter device ID"
            className="w-full p-3 border-2 rounded-lg text-sky-700 placeholder-sky-300 border-sky-200 focus:border-sky-300 focus:ring-1 focus:ring-sky-300"
          />
          {error && (
            <p className="mt-1 text-xs text-red-500">
              <svg
                className="inline w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {error}
            </p>
          )}
        </div>
        <button
          type="submit"
          className="w-full p-3 text-white transition-colors rounded-lg bg-sky-500 hover:bg-sky-600"
        >
          Connect New Device
        </button>
      </form>
    </div>
  );
}
