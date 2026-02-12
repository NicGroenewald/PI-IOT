import json
import time
import sys
import os
import tinytuya
import paho.mqtt.client as mqtt
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from utils.plugHelpers import watts, volts, amps



smart_plug = None
device_name = None
mqtt_client = None

MQTT_BROKER_HOST = "127.0.0.1"
MQTT_BROKER_PORT = 1883
MQTT_KEEPALIVE = 60

def menu():
    print("\n" + device_name + " Management Hub")
    print("-" * 35)
    print("1) Read Power (watts)")
    print("2) Read Voltage (volts)")
    print("3) Read Current (amps)")
    print("4) Read Power state (on/off)")
    print("5) Turn switch On/Off")
    print("6) Read all (and publish)")
    print("7) Live mode (publish every 2s)")
    print("Q) Quit")

def load_device():
    global smart_plug, device_name
    with open("devices.json", "r") as f:
        devices = json.load(f)[1]

    smart_plug = tinytuya.OutletDevice(devices["id"], devices["ip"], devices["key"])
    smart_plug.set_version(float(devices.get("version", 3.4)))
    smart_plug.set_socketTimeout(3)
    device_name = devices["name"]

def get_status():
    if not smart_plug:
        return {}
    try:
        status_data = smart_plug.status()
        return status_data.get("dps", {})
    except Exception as error:
        print(f"Error reading status: {error}")
        return {}


def publish_telemetry():
    if not smart_plug:
        return
    
    try:
        dps = get_status()
        if dps:
            state = "ON" if dps.get("1", False) else "OFF"
            power = watts(dps.get("19", 0))
            voltage = volts(dps.get("20", 0))
            current = amps(dps.get("18", 0))
            
            mqtt_client.publish("pi/plug1/name", device_name)
            mqtt_client.publish("pi/plug1/state", state)
            mqtt_client.publish("pi/plug1/power", f"{power:.2f}")
            mqtt_client.publish("pi/plug1/voltage", f"{voltage:.1f}")
            mqtt_client.publish("pi/plug1/current", f"{current:.3f}")
            
            print(f"Published telemetry: {state} | {power:.2f}W | {voltage:.1f}V | {current:.3f}A")
        else:
            print("Failed to read device status for telemetry")
    except Exception as e:
        print(f"Error publishing telemetry: {e}")


def on_mqtt_connect(client, userdata, flags, return_code, properties=None):
    if return_code == 0:
        print("Connected to MQTT broker")
        client.subscribe("pi/plug1/set")
        client.subscribe("pi/plug1/refresh")
    else:
        print(f"MQTT connection failed: {return_code}")


def on_mqtt_disconnect(client, userdata, flags, reason_code, properties=None):
    print(f"Disconnected from MQTT: {reason_code}")


def on_mqtt_message(client, userdata, message):
    global smart_plug
    
    try:
        topic = message.topic
        payload = message.payload.decode("utf-8")
        print(f"Received: {topic} → {payload}")
        
        if topic == "pi/plug1/set":
            cmd_lower = payload.lower()
            
            # Simple commands
            if cmd_lower == "on":
                if smart_plug:
                    smart_plug.set_status(True)
                    print("Plug ON")
            elif cmd_lower == "off":
                if smart_plug:
                    smart_plug.set_status(False)
                    print("Plug OFF")
            elif cmd_lower == "toggle":
                if smart_plug:
                    status = get_status()
                    is_on = status.get("1", False)
                    smart_plug.set_status(not is_on)
                    print(f"Plug toggled ({'ON' if not is_on else 'OFF'})")
            elif cmd_lower == "refresh":
                publish_telemetry()
                return  # Don't publish again
            else:
                print(f"Unknown command: {payload}")
            
            # Update telemetry after command
            time.sleep(0.5)
            publish_telemetry()
        
        elif topic == "pi/plug1/refresh":
            publish_telemetry()
    
    except Exception as error:
        print(f"Error handling message: {error}")


def logic():
    while True:
        menu()
        user_input = input(">>> ").strip()

        if user_input.lower() == "q":
            break

        if not user_input.isdigit():
            print("Please enter a number (or Q to quit).")
            continue

        choice = int(user_input)

        match choice:
            case 1:  # Read Power
                dps = get_status()
                p = watts(dps.get("19", 0))
                mqtt_client.publish("pi/plug1/power", f"{p:.2f}")
                print(f"Power: {p:.2f}W")
                input("Press Enter to continue...")

            case 2:  # Read Voltage
                dps = get_status()
                v = volts(dps.get("20", 0))
                mqtt_client.publish("pi/plug1/voltage", f"{v:.1f}")
                print(f"Voltage: {v:.1f}V")
                input("Press Enter to continue...")

            case 3:  # Read Current
                dps = get_status()
                a = amps(dps.get("18", 0))
                mqtt_client.publish("pi/plug1/current", f"{a:.3f}")
                print(f"Current: {a:.3f}A")
                input("Press Enter to continue...")

            case 4:  # Read Power state
                dps = get_status()
                state = "ON" if dps.get("1", False) else "OFF"
                mqtt_client.publish("pi/plug1/state", state)
                print(f"Power state: {state}")
                input("Press Enter to continue...")

            case 5:  # Turn switch On/Off
                toggle_choice = input("Enter [(1) ON / (2) OFF / (3) TOGGLE]: ").strip()
                if toggle_choice == "1":
                    smart_plug.set_status(True)
                    print("Plug turned ON")
                elif toggle_choice == "2":
                    smart_plug.set_status(False)
                    print("Plug turned OFF")
                elif toggle_choice == "3":
                    dps = get_status()
                    is_on = dps.get("1", False)
                    smart_plug.set_status(not is_on)
                    print(f"Plug toggled ({'ON' if not is_on else 'OFF'})")
                else:
                    print("Invalid choice")
                input("Press Enter to continue...")

            case 6:  # Read all and publish
                dps = get_status()
                if dps:
                    state = "ON" if dps.get("1", False) else "OFF"
                    power = watts(dps.get("19", 0))
                    voltage = volts(dps.get("20", 0))
                    current = amps(dps.get("18", 0))
                    
                    print(f"\n{device_name} Status:")
                    print(f"  State: {state}")
                    print(f"  Power: {power:.2f}W")
                    print(f"  Voltage: {voltage:.1f}V")
                    print(f"  Current: {current:.3f}A")
                    print(f"  Raw DPS: {dps}")
                    
                    mqtt_client.publish("pi/plug1/name", device_name)
                    mqtt_client.publish("pi/plug1/state", state)
                    mqtt_client.publish("pi/plug1/power", f"{power:.2f}")
                    mqtt_client.publish("pi/plug1/voltage", f"{voltage:.1f}")
                    mqtt_client.publish("pi/plug1/current", f"{current:.3f}")
                    print("\nPublished to MQTT")
                else:
                    print("Failed to read device status")
                input("Press Enter to continue...")

            case 7:  # Live mode
                print("Live mode - publishing every 2 seconds (Press Ctrl+C to stop)")
                try:
                    while True:
                        dps = get_status()
                        if dps:
                            state = "ON" if dps.get("1", False) else "OFF"
                            power = watts(dps.get("19", 0))
                            voltage = volts(dps.get("20", 0))
                            current = amps(dps.get("18", 0))
                            
                            mqtt_client.publish("pi/plug1/state", state)
                            mqtt_client.publish("pi/plug1/power", f"{power:.2f}")
                            mqtt_client.publish("pi/plug1/voltage", f"{voltage:.1f}")
                            mqtt_client.publish("pi/plug1/current", f"{current:.3f}")
                            print(f"{device_name} | {power:.2f}W | {voltage:.1f}V | {current:.3f}A | {state}")
                        
                        time.sleep(2)
                except KeyboardInterrupt:
                    print("\nLive mode stopped")
                    input("Press Enter to continue...")

            case _:
                print("Invalid choice. Please select 1-7 or Q to quit.")
                input("Press Enter to continue...")

def main():
    global mqtt_client

    load_device()

    mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    mqtt_client.on_connect = on_mqtt_connect
    mqtt_client.on_disconnect = on_mqtt_disconnect
    mqtt_client.on_message = on_mqtt_message

    print(f"Connecting to MQTT at {MQTT_BROKER_HOST}:{MQTT_BROKER_PORT}")
    mqtt_client.connect(MQTT_BROKER_HOST, MQTT_BROKER_PORT, MQTT_KEEPALIVE)
    mqtt_client.loop_start()
    logic()


if __name__ == "__main__":
    main()
