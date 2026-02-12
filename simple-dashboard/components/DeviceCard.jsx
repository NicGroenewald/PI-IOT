/**
 * DEVICE CARD COMPONENT
 * Shows a single device with its controls
 */

import React, { useState, useRef, useEffect } from 'react';
import { Power, Lightbulb, MoreVertical, Trash2, Edit3 } from 'lucide-react';
import { DEVICE_TYPES, LIGHT_COLORS } from '../config.js';

export default function DeviceCard({ device, on_toggle, on_update, on_rename, on_delete }) {
  const [menu_open, setMenuOpen] = useState(false);
  const menu_ref = useRef(null);

  // Local state for smooth UI updates without MQTT spam
  const [localBrightness, setLocalBrightness] = useState(device.brightness ?? 100);
  const [localColor, setLocalColor] = useState(device.color || '#ffffff');
  const [localColorTemp, setLocalColorTemp] = useState(device.color_temp ?? 500);

  // Track if user is actively dragging (prevent telemetry from overwriting)
  const [isDraggingBrightness, setIsDraggingBrightness] = useState(false);
  const [isSelectingColor, setIsSelectingColor] = useState(false);
  const [isDraggingColorTemp, setIsDraggingColorTemp] = useState(false);

  const device_type = DEVICE_TYPES[device.type.toUpperCase()];
  const is_plug = device.type === 'plug';
  const is_light = device.type === 'light';

  // Sync local state with device prop changes (telemetry updates)
  // BUT ONLY when user is NOT actively interacting
  useEffect(() => {
    if (!isDraggingBrightness) {
      setLocalBrightness(device.brightness ?? 100);
    }
  }, [device.brightness, isDraggingBrightness]);

  useEffect(() => {
    if (!isSelectingColor) {
      setLocalColor(device.color || '#ffffff');
    }
  }, [device.color, isSelectingColor]);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menu_ref.current && !menu_ref.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Commit brightness on release
  const commitBrightness = (value) => {
    const brightness = parseInt(value);
    console.log('[DeviceCard] Committing brightness:', brightness);
    on_update({ brightness });
    setIsDraggingBrightness(false);  // Re-enable telemetry sync
  };

  // Commit color on blur
  const commitColor = (value) => {
    console.log('[DeviceCard] Committing color:', value);
    on_update({ color: value });
    setIsSelectingColor(false);  // Re-enable telemetry sync
  };

  // Commit color temperature on release
  const commitColorTemp = (value) => {
    const temp = parseInt(value);
    console.log('[DeviceCard] Committing color temp:', temp);
    on_update({ color_temp: temp });
    setIsDraggingColorTemp(false);  // Re-enable telemetry sync
  };

  return (
    <div className={`relative bg-[#161e2e] border ${device.is_active ? 'border-blue-500/40' : 'border-slate-700/30'} rounded-3xl p-8 transition-all duration-300 shadow-xl`}>

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${device.is_active ? 'bg-green-500 animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.8)]' : 'bg-red-500/40'}`} />
          <h3 className="text-slate-300 font-bold text-xs tracking-widest uppercase">{device.name}</h3>
        </div>

        {/* Menu */}
        <div className="relative" ref={menu_ref}>
          <button
            onClick={() => setMenuOpen(!menu_open)}
            className="p-1 text-slate-600 hover:text-white transition-colors"
          >
            <MoreVertical size={18} />
          </button>

          {menu_open && (
            <div className="absolute right-0 mt-2 w-32 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-20 py-1">
              <button
                onClick={() => { on_rename(); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                <Edit3 size={14} /> RENAME
              </button>
              <button
                onClick={() => { on_delete(); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-950/30"
              >
                <Trash2 size={14} /> DELETE
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Icon */}
      <div className="flex flex-col items-center justify-center mb-10">
        <div className={`transition-all duration-700 ${device.is_active ? 'scale-110' : 'opacity-20 grayscale'}`}>
          {is_plug && (
            <Power
              size={80}
              strokeWidth={1.5}
              className={device.is_active ? 'text-blue-500' : 'text-slate-600'}
              style={{ filter: device.is_active ? 'drop-shadow(0 0 25px rgba(59, 130, 246, 0.6))' : 'none' }}
            />
          )}
          {is_light && (
            <Lightbulb
              size={80}
              strokeWidth={1.5}
              style={{
                color: device.is_active ? (
                  // White mode: show temperature color (warm orange -> neutral white -> cool blue)
                  device.mode === 'white'
                    ? `hsl(${30 - (localColorTemp / 1000) * 60}, ${70 - (localColorTemp / 1000) * 70}%, ${50 + (localColorTemp / 1000) * 30}%)`
                    // Color mode: show RGB color
                    : localColor
                ) : '#475569',
                filter: device.is_active ? `drop-shadow(0 0 ${Math.max(10, localBrightness / 2)}px ${device.mode === 'white'
                  ? `hsl(${30 - (localColorTemp / 1000) * 60}, ${70 - (localColorTemp / 1000) * 70}%, ${50 + (localColorTemp / 1000) * 30}%)`
                  : localColor
                  }88)` : 'none',
                opacity: device.is_active ? Math.max(0.3, localBrightness / 100) : 0.2
              }}
            />
          )}
        </div>
      </div>

      {/* Telemetry (for plugs) */}
      {is_plug && device.telemetry && (
        <div className="mb-8 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 text-xs font-bold tracking-widest">POWER</span>
            <span className="text-white font-bold text-sm">{device.telemetry.watts.toFixed(1)} W</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 text-xs font-bold tracking-widest">VOLTAGE</span>
            <span className="text-white font-bold text-sm">{device.telemetry.volts.toFixed(0)} V</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 text-xs font-bold tracking-widest">CURRENT</span>
            <span className="text-white font-bold text-sm">{device.telemetry.amps.toFixed(2)} A</span>
          </div>
        </div>
      )}

      {/* Light Controls */}
      {is_light && (
        <div className="mb-8 space-y-4">
          {/* Brightness Slider */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-slate-500 text-xs font-bold tracking-widest">BRIGHTNESS</span>
              <span className="text-white text-xs font-bold">{localBrightness}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={localBrightness}
              onMouseDown={() => setIsDraggingBrightness(true)}
              onTouchStart={() => setIsDraggingBrightness(true)}
              onChange={(e) => setLocalBrightness(parseInt(e.target.value))}
              onMouseUp={(e) => commitBrightness(e.target.value)}
              onTouchEnd={(e) => commitBrightness(e.target.value)}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, ${device.mode === 'white'
                    ? `hsl(${30 - (localColorTemp / 1000) * 60}, ${70 - (localColorTemp / 1000) * 70}%, ${50 + (localColorTemp / 1000) * 30}%)`
                    : localColor
                  } 0%, ${device.mode === 'white'
                    ? `hsl(${30 - (localColorTemp / 1000) * 60}, ${70 - (localColorTemp / 1000) * 70}%, ${50 + (localColorTemp / 1000) * 30}%)`
                    : localColor
                  } ${localBrightness}%, #334155 ${localBrightness}%, #334155 100%)`
              }}
            />
          </div>

          {/* WHITE MODE: Color Temperature Slider */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-slate-500 text-xs font-bold tracking-widest">WHITE TEMPERATURE</span>
              <span className="text-white text-xs font-bold">
                {localColorTemp < 333 ? 'Warm' : localColorTemp < 666 ? 'Neutral' : 'Cool'}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1000"
              value={localColorTemp}
              onMouseDown={() => setIsDraggingColorTemp(true)}
              onTouchStart={() => setIsDraggingColorTemp(true)}
              onChange={(e) => setLocalColorTemp(parseInt(e.target.value))}
              onMouseUp={(e) => commitColorTemp(e.target.value)}
              onTouchEnd={(e) => commitColorTemp(e.target.value)}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #ff9329 0%, #fffef0 50%, #a8d8ff 100%)`
              }}
            />
            <div className="text-xs text-slate-600 mt-1">Switches bulb to WHITE mode</div>
          </div>

          {/* COLOUR MODE: RGB Color Picker */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-slate-500 text-xs font-bold tracking-widest">RGB COLOR</span>
              <span className="text-white text-xs font-bold">{localColor.toUpperCase()}</span>
            </div>
            <input
              type="color"
              value={localColor}
              onFocus={() => setIsSelectingColor(true)}
              onChange={(e) => setLocalColor(e.target.value)}
              onBlur={(e) => commitColor(e.target.value)}
              className="w-full h-12 rounded-lg cursor-pointer bg-slate-700 border-none p-1"
            />
            <div className="text-xs text-slate-600 mt-1">Switches bulb to COLOUR mode</div>
          </div>
        </div>
      )}

      {/* Power Button */}
      <button
        onClick={on_toggle}
        className={`w-full py-3 rounded-xl font-bold text-sm tracking-wider transition-all ${device.is_active
          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/50'
          : 'bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 border border-slate-700'
          }`}
      >
        {device.is_active ? 'TURN OFF' : 'TURN ON'}
      </button>
    </div>
  );
}
