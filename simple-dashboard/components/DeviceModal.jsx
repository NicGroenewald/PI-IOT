/**
 * DEVICE MODAL COMPONENT
 * Used for adding new devices or renaming existing ones
 */

import React, { useState } from 'react';
import { X, Power, Lightbulb } from 'lucide-react';
import { DEVICE_TYPES } from '../config.js';

export default function DeviceModal({ mode, device, on_submit, on_close }) {
  const is_add_mode = mode === 'ADD';
  
  const [device_name, setDeviceName] = useState(device?.name || '');
  const [device_type, setDeviceType] = useState(device?.type || 'plug');

  function handleSubmit(e) {
    e.preventDefault();
    if (!device_name.trim()) return;
    
    on_submit({
      name: device_name.trim(),
      type: device_type
    });
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            {is_add_mode ? 'Add New Device' : 'Rename Device'}
          </h2>
          <button onClick={on_close} className="text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Device Type Selection (only in ADD mode) */}
          {is_add_mode && (
            <div className="mb-6">
              <label className="block text-slate-400 text-sm font-bold mb-3">DEVICE TYPE</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setDeviceType('plug')}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    device_type === 'plug'
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
                  }`}
                >
                  <Power size={32} className={device_type === 'plug' ? 'text-blue-500' : 'text-slate-500'} />
                  <div className="mt-2 text-sm font-bold text-white">Smart Plug</div>
                </button>

                <button
                  type="button"
                  onClick={() => setDeviceType('light')}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    device_type === 'light'
                      ? 'border-amber-500 bg-amber-500/20'
                      : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
                  }`}
                >
                  <Lightbulb size={32} className={device_type === 'light' ? 'text-amber-500' : 'text-slate-500'} />
                  <div className="mt-2 text-sm font-bold text-white">Smart Light</div>
                </button>
              </div>
            </div>
          )}

          {/* Device Name Input */}
          <div className="mb-6">
            <label className="block text-slate-400 text-sm font-bold mb-2">DEVICE NAME</label>
            <input
              type="text"
              value={device_name}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="Enter device name..."
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={on_close}
              className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors"
            >
              {is_add_mode ? 'Add Device' : 'Rename'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
