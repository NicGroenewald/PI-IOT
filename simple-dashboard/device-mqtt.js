/**
 * DEVICE MQTT LOGIC
 * 
 * This file handles logic for device MQTT interactions.
 */

import { resolveDeviceTopics, getSubscribeTopicsForDevice, getPublishTopic } from './config.js';

/**
 * Get all subscribe topics for a list of devices.
 */
export function getSubscribeTopicsForDevices(devices) {
    const topics = new Set();

    if (!devices || !Array.isArray(devices)) return [];

    devices.forEach(device => {
        const list = getSubscribeTopicsForDevice(device);
        if (list && Array.isArray(list)) {
            list.forEach(t => topics.add(t));
        }
    });

    return Array.from(topics);
}

/**
 * Handle incoming MQTT message (update state).
 */
export function applyMqttMessageToDevice(device, topic, message) {
    const t = resolveDeviceTopics(device);
    if (!t) return device;

    let updated_device = { ...device };
    let has_changes = false;

    // -- PLUG LOGIC --
    if (device.type === 'plug') {
        if (topic === t.power) {
            updated_device.telemetry = { ...updated_device.telemetry, watts: parseFloat(message) };
            has_changes = true;
        }
        if (topic === t.voltage) {
            updated_device.telemetry = { ...updated_device.telemetry, volts: parseFloat(message) };
            has_changes = true;
        }
        if (topic === t.current) {
            updated_device.telemetry = { ...updated_device.telemetry, amps: parseFloat(message) };
            has_changes = true;
        }
        if (topic === t.state) {
            updated_device.is_active = message === 'ON';
            has_changes = true;
        }
        if (topic === t.name) {
            updated_device.name = message;
            has_changes = true;
        }
    }

    // -- LIGHT LOGIC --
    if (device.type === 'light') {
        if (topic === t.state) {
            updated_device.is_active = message === 'ON';
            has_changes = true;
        }
        if (topic === t.mode) {
            updated_device.mode = message;
            has_changes = true;
        }
        if (topic === t.brightness) {
            updated_device.brightness = parseInt(message);
            has_changes = true;
        }
        if (topic === t.color) {
            updated_device.color = message;
            has_changes = true;
        }
        if (topic === t.color_temp) {
            updated_device.color_temp = parseInt(message);
            has_changes = true;
        }
        if (topic === t.name) {
            updated_device.name = message;
            has_changes = true;
        }
    }

    return has_changes ? updated_device : device;
}

/**
 * Get toggle command topic/payload.
 */
export function getToggleCommand(device) {
    const topic = getPublishTopic(device, 'toggle');
    const target_state = !device.is_active;
    let payload = '';

    if (device.type === 'plug') payload = target_state ? 'on' : 'off';
    if (device.type === 'light') payload = target_state ? 'ON' : 'OFF';

    if (!topic) return null;
    return { topic, payload };
}

/**
 * Convert HEX color to Tuya HSV format
 * Returns string "h,s,v"
 */
function hexToTuyaHSV(hex) {
    console.log('[MQTT] Converting Hex:', hex);

    // Ensure hex is a string and valid
    if (!hex || typeof hex !== 'string') {
        console.error('[MQTT] Invalid hex input:', hex);
        return "0,0,1000"; // Default to white
    }

    // Remove # if present
    const cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;

    let r = 0, g = 0, b = 0;

    if (cleanHex.length === 3) {
        r = parseInt(cleanHex[0] + cleanHex[0], 16);
        g = parseInt(cleanHex[1] + cleanHex[1], 16);
        b = parseInt(cleanHex[2] + cleanHex[2], 16);
    } else if (cleanHex.length === 6) {
        r = parseInt(cleanHex.substring(0, 2), 16);
        g = parseInt(cleanHex.substring(2, 4), 16);
        b = parseInt(cleanHex.substring(4, 6), 16);
    } else {
        console.error('[MQTT] Invalid hex length:', cleanHex);
        return "0,0,1000";
    }

    r /= 255;
    g /= 255;
    b /= 255;

    let cmin = Math.min(r, g, b),
        cmax = Math.max(r, g, b),
        delta = cmax - cmin,
        h = 0,
        s = 0,
        v = 0;

    if (delta === 0) h = 0;
    else if (cmax === r) h = ((g - b) / delta) % 6;
    else if (cmax === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;

    h = Math.round(h * 60);

    if (h < 0) h += 360;

    v = Math.round(cmax * 1000);
    s = cmax === 0 ? 0 : Math.round((delta / cmax) * 1000);

    const hsv = `${h},${s},${v}`;
    console.log('[MQTT] Converted HSV:', hsv);
    return hsv;
}


/**
 * Get update command topic/payload.
 */
export function getUpdateCommand(device, field, value) {
    let topic = null;
    let payload = null;

    if (field === 'brightness') {
        topic = getPublishTopic(device, 'brightness');
        // Backend expects "brightness:50" if topic is the main set topic
        // Or just "50" if it's a dedicated topic? 
        // Based on light_loop.py logic:
        // if topic == TOPIC_LIGHT_COMMAND: check payload "brightness:xx"

        // Since config.js sets brightness_set = command topic, we use prefix
        payload = `brightness:${value}`;
    }

    if (field === 'color') {
        topic = getPublishTopic(device, 'color');
        // Backend expects "color:h,s,v"
        const hsv = hexToTuyaHSV(value);
        payload = `color:${hsv}`;
    }

    if (field === 'color_temp') {
        topic = getPublishTopic(device, 'color_temp');
        // Backend expects "temperature:X" (0-1000)
        payload = `temperature:${value}`;
    }

    if (!topic) return null;

    return { topic, payload: payload };
}
