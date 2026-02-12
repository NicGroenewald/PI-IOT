/**
 * SIMPLE DASHBOARD - Main App (Performance Optimized)
 * 
 * - Optimistic UI updates
 * - Throttled telemetry
 * - Batched state updates
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { INITIAL_DEVICES, DEVICE_TYPES, ROOMS } from './config.js';
import { connectToMQTT, subscribeToTopics, publishCommand, onMessage, disconnect } from './mqtt-handler.js';
import { getSubscribeTopicsForDevices, applyMqttMessageToDevice, getToggleCommand, getUpdateCommand } from './device-mqtt.js';
import Header from './components/Header.jsx';
import DeviceCard from './components/DeviceCard.jsx';
import DeviceModal from './components/DeviceModal.jsx';

function App() {
  const [devices, setDevices] = useState(INITIAL_DEVICES);
  const [modal_open, setModalOpen] = useState(false);
  const [editing_device_id, setEditingDeviceId] = useState(null);


  const devicesRef = useRef(devices);
  const updateBufferRef = useRef(new Map());
  const rafRef = useRef(null);

  useEffect(() => {
    devicesRef.current = devices;
  }, [devices]);

  useEffect(() => {
    connectToMQTT(
      () => {
        console.log('Connected! Subscribing to topics...');
        const topics = getSubscribeTopicsForDevices(INITIAL_DEVICES);
        subscribeToTopics(topics);
      },
      (error) => console.error('Connection failed:', error)
    );

    onMessage((topic, message) => {
      const currentDevices = devicesRef.current;

      currentDevices.forEach(originalDevice => {
        const baseDevice = updateBufferRef.current.get(originalDevice.id) || originalDevice;

        const updated = applyMqttMessageToDevice(baseDevice, topic, message);
        if (updated !== baseDevice) {
          updateBufferRef.current.set(originalDevice.id, updated);
        }
      });
    });

    return () => disconnect();
  }, []);

  useEffect(() => {
    const loop = () => {
      if (updateBufferRef.current.size > 0) {
        setDevices(prev => {
          const next = [...prev];
          let hasChanges = false;

          updateBufferRef.current.forEach((updatedDevice, id) => {
            const index = next.findIndex(d => d.id === id);
            if (index !== -1) {
              next[index] = updatedDevice;
              hasChanges = true;
            }
          });

          updateBufferRef.current.clear();
          return hasChanges ? next : prev;
        });
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);



  const toggleDevice = useCallback((device_id) => {
    setDevices(prev => prev.map(d => {
      if (d.id === device_id) {
        return { ...d, is_active: !d.is_active };
      }
      return d;
    }));

    const device = devicesRef.current.find(d => d.id === device_id);
    if (device) {
      const command = getToggleCommand(device);
      if (command && command.topic) {
        publishCommand(command.topic, command.payload);
      }
    }
  }, []);

  const updateDevice = useCallback((device_id, updates) => {
    setDevices(prev => prev.map(d =>
      d.id === device_id ? { ...d, ...updates } : d
    ));

    const device = devicesRef.current.find(d => d.id === device_id);
    if (device) {
      Object.keys(updates).forEach(field => {
        const command = getUpdateCommand(device, field, updates[field]);
        if (command && command.topic) {
          console.log(`[Command] ${field}:`, command.payload);
          publishCommand(command.topic, command.payload);
        }
      });
    }
  }, []);


  function renameDevice(device_id, new_name) {
    updateDevice(device_id, { name: new_name });
    setModalOpen(false);
    setEditingDeviceId(null);
  }

  function deleteDevice(device_id) {
    setDevices(prev => prev.filter(d => d.id !== device_id));
  }

  function openRenameModal(device_id) {
    setEditingDeviceId(device_id);
    setModalOpen(true);
  }

  function refreshAll() {
    console.log('Refreshing all devices...');
    publishCommand('pi/refresh', 'all');
  }

  const editing_device = devices.find(d => d.id === editing_device_id);

  return (
    <div className="min-h-screen p-4 md:p-8 pb-40">
      <Header
        devices={devices}
        on_refresh={refreshAll}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 mt-6 md:mt-8">
        {devices.map(device => (
          <DeviceCard
            key={device.id}
            device={device}
            on_toggle={() => toggleDevice(device.id)}
            on_update={(updates) => updateDevice(device.id, updates)}
            on_rename={() => openRenameModal(device.id)}
            on_delete={() => deleteDevice(device.id)}
          />
        ))}
      </div>

      {modal_open && (
        <DeviceModal
          mode="RENAME"
          device={editing_device}
          on_submit={(data) => renameDevice(editing_device_id, data.name)}
          on_close={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
