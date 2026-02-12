/**
 * MQTT HANDLER
 * 
 * Simple wrapper around MQTT.js to make it easy to use.
 * Hides all the complexity - you just call simple functions!
 */

import mqtt from 'mqtt';
import { MQTT_CONFIG } from './config.js';

let client = null;
let messageCallback = null;

/**
 * Connect to the MQTT broker
 * @param {function} onConnect - Called when connected successfully
 * @param {function} onError - Called when there's an error
 */
export function connectToMQTT(onConnect, onError) {
  console.log('[MQTT] Connecting to broker:', MQTT_CONFIG.broker_url);

  if (client) {
    if (client.connected) {
      console.log('[MQTT] Already connected.');
      if (onConnect) onConnect();
      return client;
    }
    client.end();
  }

  client = mqtt.connect(MQTT_CONFIG.broker_url);

  client.on('connect', () => {
    console.log('[MQTT] Connected successfully!');
    if (onConnect) onConnect();
  });

  client.on('error', (error) => {
    console.error('[MQTT] Error:', error);
    if (onError) onError(error);
  });

  client.on('message', (topic, payload) => {
    const message = payload.toString();
    console.log('[MQTT] Received:', topic, '=', message);

    if (messageCallback) {
      messageCallback(topic, message);
    }
  });

  return client;
}

/**
 * Subscribe to multiple topics at once
 * @param {array} topics - Array of topic strings
 */
export function subscribeToTopics(topics) {
  if (!client || !client.connected) {
    console.error('[MQTT] Not connected! Call connectToMQTT first.');
    return;
  }

  if (!topics || topics.length === 0) return;

  console.log('[MQTT] Subscribing to topics:', topics);
  client.subscribe(topics, (err) => {
    if (err) console.error('[MQTT] Subscribe error:', err);
  });
}

/**
 * Publish a command to a device
 * @param {string} topic - The topic to publish to
 * @param {string} message - The message to send
 */
export function publishCommand(topic, message) {
  if (!client || !client.connected) {
    console.error('[MQTT] Not connected! Call connectToMQTT first.');
    return;
  }

  console.log('[MQTT] Publishing:', topic, '=', message);
  client.publish(topic, message);
}

/**
 * Set the callback for when messages are received
 * @param {function} callback - Function that takes (topic, message)
 */
export function onMessage(callback) {
  messageCallback = callback;
}

/**
 * Disconnect from the MQTT broker
 */
export function disconnect() {
  if (client) {
    console.log('[MQTT] Disconnecting...');
    client.end();
    client = null;
  }
}
