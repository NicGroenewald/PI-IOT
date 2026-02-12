import json
import time
import sys
import os
import tinytuya
import paho.mqtt.client as mqtt
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from utils.hsv import decode_hsv_hex, encode_hsv_hex, hsv_to_rgb_hex
from utils.converters import brightness_percent_to_tuya, tuya_to_brightness_percent



smart_light = None
device_name = None
light = None
mqtt_client = None

MQTT_BROKER_HOST = "127.0.0.1"
MQTT_BROKER_PORT = 1883
MQTT_KEEPALIVE = 60

def menu():
    print("\n" + device_name + " Management Hub")
    print("-" * 35)
    print("1) Set Mode (white, colour, scene)")
    print("2) Set Brightness (0-100)")
    print("3) Set Temperature (0-100)")
    print("4) Set Colour (hex code)")
    print("5) Read Power state (on/off)")
    print("6) Turn switch On/Off")
    print("7) Read all (and publish)")
    print("8) Live mode (publish every 2s)")
    print("Q) Quit")

def load_device():
    global smart_light, device_name
    with open("devices.json", "r") as f:
        devices = json.load(f)[0]

    smart_light = tinytuya.BulbDevice(devices["id"], devices["ip"], devices["key"])
    smart_light.set_version(float(devices.get("version", 3.4)))
    smart_light.set_socketTimeout(3)
    device_name = devices["name"]

def get_status():
    if not smart_light:
        return {}
    try:
        status_data = smart_light.status()
        return status_data.get("dps", {})
    except Exception as error:
        print(f"Error reading status: {error}")
        return {}


def publish_telemetry():
    if not smart_light:
        return
    
    try:
        dps = get_status()
        if dps:
            state = "ON" if dps.get("20", False) else "OFF"
            mode = dps.get("21", "unknown")
            
            if mode == 'colour':
                raw_color = dps.get("24", "000003e803e8")
                _, _, v = decode_hsv_hex(raw_color)
                brightness = tuya_to_brightness_percent(v)
            else:
                brightness = tuya_to_brightness_percent(dps.get("22", 10))
            
            color_temp = dps.get("23", 0)
            raw_color = dps.get("24", "")
            color_hex = hsv_to_rgb_hex(raw_color)
            
            mqtt_client.publish("pi/light1/state", state)
            mqtt_client.publish("pi/light1/mode", mode)
            mqtt_client.publish("pi/light1/brightness", str(brightness))
            mqtt_client.publish("pi/light1/color_temp", str(color_temp))
            mqtt_client.publish("pi/light1/color", color_hex)
            print(f"Published telemetry: {state} | {mode} | {brightness}%")
        else:
            print("Failed to read device status for telemetry")
    except Exception as e:
        print(f"Error publishing telemetry: {e}")


def on_mqtt_connect(client, userdata, flags, return_code, properties=None):
    if return_code == 0:
        print("Connected to MQTT broker")
        client.subscribe("pi/light1/set")
        client.subscribe("pi/light1/refresh")
    else:
        print(f"MQTT connection failed: {return_code}")


def on_mqtt_disconnect(client, userdata, flags, reason_code, properties=None):
    print(f"Disconnected from MQTT: {reason_code}")


def on_mqtt_message(client, userdata, message):
    global smart_light
    
    try:
        topic = message.topic
        payload = message.payload.decode("utf-8")
        print(f"Received: {topic} → {payload}")
        
        if topic == "pi/light1/set":
            cmd_lower = payload.lower()
            
            if cmd_lower == "on":
                if smart_light:
                    smart_light.set_value('20', True)
                    print("Light ON")
            elif cmd_lower == "off":
                if smart_light:
                    smart_light.set_value('20', False)
                    print("Light OFF")
            elif cmd_lower == "toggle":
                if smart_light:
                    status = get_status()
                    is_on = status.get("20", False)
                    smart_light.set_value('20', not is_on)
                    print(f"Light toggled ({'ON' if not is_on else 'OFF'})")
            elif cmd_lower == "refresh":
                publish_telemetry()
                return
            
            elif ":" in payload:
                parts = payload.split(":", 1)
                cmd = parts[0].lower().strip()
                val = parts[1].strip()
                
                if cmd == "brightness":
                    from utils import lightHelpers
                    lightHelpers.set_brightness(smart_light, get_status, val)
                elif cmd == "color":
                    if "," in val:
                        try:
                            h, s, v = val.split(",")
                            from utils import lightHelpers
                            lightHelpers.set_color(smart_light, h, s, v)
                        except ValueError:
                            print("Invalid color format (use h,s,v)")
                elif cmd == "temperature":
                    from utils import lightHelpers
                    lightHelpers.set_temperature(smart_light, get_status, val)
                else:
                    print(f"Unknown command: {cmd}")

            time.sleep(0.1)
            publish_telemetry()
        
        elif topic == "pi/light1/refresh":
            publish_telemetry()
    
    except Exception as error:
        print(f"Error handling message: {error}")


def logic():
    # 20: on/off
    # 21: mode (white, colour, scene)
    # 22: brightness
    # 23: temperature
    # 24: colour
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
            case 1:  # Set Mode
                mode_choice = int(input("Enter mode [(1) White / (2) Colour / (3) Scene]: "))
                if mode_choice == 1:
                    smart_light.set_value("21", "white")
                    print("Mode set to: White")
                elif mode_choice == 2:
                    smart_light.set_value("21", "colour")
                    print("Mode set to: Colour")
                elif mode_choice == 3:
                    smart_light.set_value("21", "scene")
                    print("Mode set to: Scene")
                else:
                    print("Invalid mode choice")
                input("Press Enter to continue...")
            
            case 2:  # Set Brightness
                brightness = int(input("Enter brightness (0-100): "))
                dps = get_status()
                percent = max(0, min(100, int(float(brightness))))
                mode = dps.get("21", "white")
                
                if mode == "colour":
                    current_color = dps.get("24", "000003e803e8")
                    h, s, v = decode_hsv_hex(current_color)
                    v = brightness_percent_to_tuya(percent)
                    new_hex = encode_hsv_hex(h, s, v)
                    smart_light.set_multiple_values({'21': 'colour', '24': new_hex})
                    print(f"Brightness: {percent}% (colour mode)")
                else:
                    tuya_val = brightness_percent_to_tuya(percent)
                    smart_light.set_value('22', tuya_val)
                    print(f"Brightness: {percent}% (white mode)")
                input("Press Enter to continue...")

            case 3:  # Set Temperature
                temp = int(input("Enter temperature (0-1000): "))
                temp_val = max(0, min(1000, int(float(temp))))
                dps = get_status()
                mode = dps.get('21', 'white')
                if mode == 'white':
                    brightness = dps.get('22', 500)
                else:
                    current_color = dps.get('24', '000003e803e8')
                    _, _, brightness = decode_hsv_hex(current_color)
                
                brightness = max(100, brightness)
                
                smart_light.set_value('21', 'white')
                smart_light.set_value('23', temp_val)
                smart_light.set_value('22', brightness)
                print(f"Temperature: {temp_val} (brightness: {brightness})")
                input("Press Enter to continue...")
            
            case 4:  # Set Colour
                print("Enter HSV values:")
                h = int(input("  Hue (0-360): "))
                s = int(input("  Saturation (0-1000): "))
                v = int(input("  Value/Brightness (0-1000): "))
                
                h = int(float(h)) % 360
                s = max(0, min(1000, int(float(s))))
                v = max(0, min(1000, int(float(v))))
                
                hex_str = encode_hsv_hex(h, s, v)
                smart_light.set_multiple_values({'21': 'colour', '24': hex_str})
                print(f"Color set: H={h}, S={s}, V={v}")
                input("Press Enter to continue...")
            
            case 5:  # Read Power state
                dps = get_status()
                state = "ON" if dps.get("20", False) else "OFF"
                print(f"Power state: {state}")
                input("Press Enter to continue...")
            
            case 6:  # Turn switch On/Off
                toggle_choice = input("Enter [(1) ON / (2) OFF / (3) TOGGLE]: ").strip()
                if toggle_choice == "1":
                    smart_light.set_value('20', True)
                    print("Light turned ON")
                elif toggle_choice == "2":
                    smart_light.set_value('20', False)
                    print("Light turned OFF")
                elif toggle_choice == "3":
                    dps = get_status()
                    is_on = dps.get("20", False)
                    smart_light.set_value('20', not is_on)
                    print(f"Light toggled ({'ON' if not is_on else 'OFF'})")
                else:
                    print("Invalid choice")
                input("Press Enter to continue...")
            
            case 7:  # Read all and publish
                dps = get_status()
                if dps:
                    state = "ON" if dps.get("20", False) else "OFF"
                    mode = dps.get("21", "unknown")

                    if mode == 'colour':
                        raw_color = dps.get("24", "000003e803e8")
                        _, _, v = decode_hsv_hex(raw_color)
                        brightness = tuya_to_brightness_percent(v)
                    else:
                        brightness = tuya_to_brightness_percent(dps.get("22", 10))
                    
                    color_temp = dps.get("23", 0)
                    raw_color = dps.get("24", "")
                    color_hex = hsv_to_rgb_hex(raw_color)
                    
                    print(f"\n{device_name} Status:")
                    print(f"  State: {state}")
                    print(f"  Mode: {mode}")
                    print(f"  Brightness: {brightness}%")
                    print(f"  Color Temp: {color_temp}")
                    print(f"  Color (RGB): {color_hex}")
                    print(f"  Raw DPS: {dps}")
                    
                    mqtt_client.publish("pi/light1/state", state)
                    mqtt_client.publish("pi/light1/mode", mode)
                    mqtt_client.publish("pi/light1/brightness", str(brightness))
                    mqtt_client.publish("pi/light1/color_temp", str(color_temp))
                    mqtt_client.publish("pi/light1/color", color_hex)
                    print("\nPublished to MQTT")
                else:
                    print("Failed to read device status")
                input("Press Enter to continue...")
            
            case 8:  # Live mode
                print("Live mode - publishing every 2 seconds (Press Ctrl+C to stop)")
                try:
                    while True:
                        dps = get_status()
                        if dps:
                            state = "ON" if dps.get("20", False) else "OFF"
                            mode = dps.get("21", "unknown")
                            
                            if mode == 'colour':
                                raw_color = dps.get("24", "000003e803e8")
                                _, _, v = decode_hsv_hex(raw_color)
                                brightness = tuya_to_brightness_percent(v)
                            else:
                                brightness = tuya_to_brightness_percent(dps.get("22", 10))
                            
                            color_temp = dps.get("23", 0)
                            raw_color = dps.get("24", "")
                            color_hex = hsv_to_rgb_hex(raw_color)
                            
                            mqtt_client.publish("pi/light1/state", state)
                            mqtt_client.publish("pi/light1/mode", mode)
                            mqtt_client.publish("pi/light1/brightness", str(brightness))
                            mqtt_client.publish("pi/light1/color_temp", str(color_temp))
                            mqtt_client.publish("pi/light1/color", color_hex)
                            print(f"{device_name} | {mode} | {brightness}% | Temp:{color_temp} | {color_hex} | {state}")
                        
                        time.sleep(2)
                except KeyboardInterrupt:
                    print("\nLive mode stopped")
                    input("Press Enter to continue...")
            
            case _:
                print("Invalid choice. Please select 1-8 or Q to quit.")
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



