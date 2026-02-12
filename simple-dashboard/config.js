/**
 * SIMPLE DASHBOARD CONFIGURATION
 * 
 * Defines MQTT settings, device types, and the list of devices.
 * 
 * HOW TO ADD A NEW DEVICE:
 * 1. Add an entry to the INITIAL_DEVICES array.
 * 2. Define its specific MQTT topics in the 'mqtt.topics' object.
 */

// =============================================================================
// MQTT BROKER SETTINGS
// =============================================================================

export const MQTT_CONFIG = {
  broker_url: 'ws://localhost:9001',
  reconnect_delay: 3000
};


// =============================================================================
// DEFAULT TOPIC PATTERNS (Fallback)
// =============================================================================

export const TOPIC_PATTERNS = {
  plug: {
    command: 'pi/plug/set',
    power: 'pi/plug/power',
    voltage: 'pi/plug/voltage',
    current: 'pi/plug/current',
    state: 'pi/plug/state',
    name: 'pi/plug/name'
  },
  light: {
    command: 'pi/light/set',
    state: 'pi/light/state',
    brightness: 'pi/light/brightness',
    brightness_set: 'pi/light/brightness/set',
    color: 'pi/light/color',
    color_set: 'pi/light/color/set',
    name: 'pi/light/name'
  }
};


// =============================================================================
// DEVICE TYPE DEFINITIONS
// =============================================================================

export const DEVICE_TYPES = {
  PLUG: {
    id: 'plug',
    name: 'Smart Plug',
    icon: 'Power',
    color: '#3b82f6',
    has_telemetry: true,
    has_color: false,
    has_brightness: false,
    telemetry_default: { watts: 0, volts: 0, amps: 0 }
  },
  LIGHT: {
    id: 'light',
    name: 'Smart Light',
    icon: 'Lightbulb',
    color: '#f59e0b',
    has_telemetry: false,
    has_color: true,
    has_brightness: true,
    default_color: '#ffffff',
    default_brightness: 100
  }
};


// =============================================================================
// LIGHT COLOR PRESETS
// =============================================================================

export const LIGHT_COLORS = [
  { name: 'Crimson Red', value: '#ef4444' },
  { name: 'Electric Blue', value: '#3b82f6' },
  { name: 'Warm Amber', value: '#f59e0b' },
  { name: 'Forest Green', value: '#10b981' },
  { name: 'Cyber Purple', value: '#a855f7' },
  { name: 'Pure White', value: '#ffffff' }
];


// =============================================================================
// INITIAL DEVICES
// =============================================================================

export const INITIAL_DEVICES = [
  {
    id: 'plug1',
    name: "plug",
    room: 'Living Room',
    type: 'plug',
    is_active: false,
    telemetry: { watts: 0, volts: 0, amps: 0 },

    // Explicit MQTT Topics
    mqtt: {
      topics: {
        command: 'pi/plug1/set',
        power: 'pi/plug1/power',
        voltage: 'pi/plug1/voltage',
        current: 'pi/plug1/current',
        state: 'pi/plug1/state',
        name: 'pi/plug1/name'
      }
    }
  },
  {
    id: 'light1',
    name: "Living Room Light",
    room: 'Living Room',
    type: 'light',
    is_active: false,
    brightness: 100,
    mode: 'white',
    color_temp: 500,

    // Explicit MQTT Topics
    mqtt: {
      topics: {
        command: 'pi/light1/set',
        state: 'pi/light1/state',
        mode: 'pi/light1/mode',
        brightness: 'pi/light1/brightness',
        brightness_set: 'pi/light1/set',
        color: 'pi/light1/color',
        color_set: 'pi/light1/set',
        color_temp: 'pi/light1/color_temp',
        color_temp_set: 'pi/light1/set',
        name: 'pi/light1/name'
      }
    }
  }
];


// =============================================================================
// ROOM LIST
// =============================================================================

export const ROOMS = ['All Rooms', 'Living Room', 'Bedroom'];


// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function resolveDeviceTopics(device) {
  // 1. Prefer explicit topics
  if (device.mqtt && device.mqtt.topics) {
    return device.mqtt.topics;
  }

  // 2. Fallback to default patterns
  const type = device.type || 'plug';
  return TOPIC_PATTERNS[type] || TOPIC_PATTERNS.plug;
}

export function getSubscribeTopicsForDevice(device) {
  const topics = resolveDeviceTopics(device);
  const list = [];

  if (!topics) return [];

  Object.keys(topics).forEach(key => {
    // Skip command (publish only) keys
    if (key !== 'command' && !key.endsWith('_set')) {
      list.push(topics[key]);
    }
  });

  return list;
}

export function getPublishTopic(device, action = 'toggle') {
  const topics = resolveDeviceTopics(device);
  if (!topics) return null;

  if (action === 'toggle') return topics.command;
  if (action === 'name') return topics.name;
  if (action === 'brightness') return topics.brightness_set;
  if (action === 'color') return topics.color_set;
  if (action === 'color_temp') return topics.color_temp_set;

  return null;
}

export function getDeviceType(type_id) {
  return DEVICE_TYPES[type_id.toUpperCase()] || DEVICE_TYPES.PLUG;
}
