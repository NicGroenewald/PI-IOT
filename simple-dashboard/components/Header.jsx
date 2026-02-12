/**
 * HEADER COMPONENT
 * Shows title, device count, room filter, and action buttons
 */

import React, { useState, useRef, useEffect } from 'react';
import { Network, Plus, RefreshCw, Filter, ChevronDown } from 'lucide-react';
import { ROOMS } from '../config.js';

export default function Header({ devices, on_refresh }) {
  const [dropdown_open, setDropdownOpen] = useState(false);
  const [is_refreshing, setIsRefreshing] = useState(false);
  const dropdown_ref = useRef(null);

  const active_count = devices.filter(d => d.is_active).length;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdown_ref.current && !dropdown_ref.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleRefresh() {
    setIsRefreshing(true);
    on_refresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  }

  return (
    <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
      {/* Title Section */}
      <div className="w-full lg:w-auto flex justify-between items-center">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">Smart Home</h1>
          <p className="text-slate-400 text-sm">
            {active_count} of {devices.length} devices active
          </p>
        </div>
        {/* Mobile-only Refresh Button could go here, but let's keep it simple */}
      </div>

      {/* Controls */}
      <div className="w-full lg:w-auto flex flex-wrap items-center gap-3">
        {/* Network Status / Node List */}
        <div className="relative" ref={dropdown_ref}>
          <button
            onClick={() => setDropdownOpen(!dropdown_open)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-white rounded-xl border border-slate-700 transition-colors bg-opacity-40 backdrop-blur-sm"
          >
            <Network size={16} className="text-blue-400" />
            <span className="text-sm font-semibold tracking-wide">Network Nodes</span>
            <ChevronDown size={14} className={`transform transition-transform ${dropdown_open ? 'rotate-180' : ''}`} />
          </button>

          {dropdown_open && (
            <div className="absolute right-0 mt-3 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 py-2 max-h-96 overflow-y-auto backdrop-blur-xl bg-opacity-95">
              <div className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Active Nodes</div>
              {devices.map(device => (
                <div key={device.id} className="px-4 py-3 hover:bg-slate-800/50 transition-colors border-b border-slate-800/50 last:border-0 group cursor-default">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ring-2 ring-offset-2 ring-offset-slate-900 ${device.is_active ? 'bg-emerald-500 ring-emerald-500/20' : 'bg-slate-600 ring-slate-600/20'}`} />
                      <div>
                        <div className="text-sm text-slate-200 font-medium group-hover:text-white transition-colors">{device.name}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest">{device.type}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          className="p-2.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-all active:scale-95"
          title="Refresh connection"
        >
          <RefreshCw size={18} className={is_refreshing ? 'animate-spin text-blue-400' : ''} />
        </button>
      </div>
    </header>
  );
}
