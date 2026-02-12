import tinytuya
import json
import os
import time
import colorsys

# =============================================================================
# Helper Functions
# =============================================================================

def hex_to_hsv(hex_color):
    """
    Expects hex input "HHHHSSSSVVVV" (Tuya)
    Returns: (h_int, s_float, v_float)
    """
    if not hex_color or len(hex_color) != 12:
        return (0, 0, 0.0)
    
    h = int(hex_color[0:4], 16)
    s = int(hex_color[4:8], 16) / 1000.0
    v = int(hex_color[8:12], 16) / 1000.0
    return (h, s, v)

def tuya_color_to_hex(dps_value):
    """
    Converts Tuya DPS 24 hex string (HHHHSSSSVVVV) to HTML Hex Color (#RRGGBB).
    """
    try:
        h, s, v = hex_to_hsv(dps_value)
        r, g, b = colorsys.hsv_to_rgb(h/360.0, s, v)
        return f"#{int(r*255):02x}{int(g*255):02x}{int(b*255):02x}"
    except Exception as e:
        print(f"Error converting color: {e}")
        return "#ffffff"

# =============================================================================
# MAIN DIAGNOSTIC SCRIPT
# =============================================================================

def main():
    try:
        script_directory = os.path.dirname(os.path.abspath(__file__))
        devices_file = os.path.join(script_directory, "devices.json")

        with open(devices_file, "r", encoding="utf-8") as file:
            devices = json.load(file)
            light_info = devices[0]

        print(f"Connecting to light: {light_info.get('name', 'Unknown')}")
        print(f"ID: {light_info['id']}")
        print(f"IP: {light_info['ip']}")

        smart_light = tinytuya.BulbDevice(
            light_info["id"],
            light_info["ip"],
            light_info["key"]
        )
        smart_light.set_version(float(light_info.get("version", 3.4)))
        smart_light.set_socketPersistent(False)
        smart_light.set_socketTimeout(5)

        print("\n--- STATUS CHECK ---")
        status = smart_light.status()
        print(f"Initial Status: {status}")
        dps = status.get('dps', {})
        print(f"Switch State (DPS 20): {dps.get('20')}")
        print(f"Mode (DPS 21): {dps.get('21')}")
        print(f"Brightness (DPS 22): {dps.get('22')}")
        print(f"Color Temp (DPS 23): {dps.get('23')}")
        print(f"Color Data (DPS 24): {dps.get('24')}")
        
        print("\n--- TEST: Toggle OFF ---")
        print("Turning OFF...")
        smart_light.set_value('20', False)
        time.sleep(2)
        status = smart_light.status()
        print(f"New Status (Expect OFF): {status.get('dps', {}).get('20')}")

        print("\n--- TEST: Toggle ON ---")
        print("Turning ON...")
        smart_light.set_value('20', True)
        time.sleep(2)
        status = smart_light.status()
        print(f"New Status (Expect ON): {status.get('dps', {}).get('20')}")

        print("\n--- TEST: Brightness ---")
        print("Setting Brightness to 50% (DPS 22 -> 500)")
        smart_light.set_value('22', 500)
        time.sleep(2)
        status = smart_light.status()
        print(f"New Brightness (Expect 500): {status.get('dps', {}).get('22')}")

        print("\n--- TEST: Color (Red) ---")
        # Tuya usually: hue (0-360), sat (0-1000), val (0-1000)
        # Red: H=0, S=1000, V=1000 -> 0000 03e8 03e8
        hex_red = "000003e803e8"
        print(f"Setting Color to RED (Hex: {hex_red})")
        
        payload = smart_light.generate_payload(tinytuya.CONTROL, {'21': 'colour', '24': hex_red})
        smart_light.send(payload)
        
        time.sleep(2)
        status = smart_light.status()
        print(f"New Mode (Expect colour): {status.get('dps', {}).get('21')}")
        print(f"New Color (Expect {hex_red}): {status.get('dps', {}).get('24')}")

        print("\n--- TEST: Color (Blue) ---")
        # Blue: H=240, S=1000, V=1000 -> 00f0 03e8 03e8
        hex_blue = "00f003e803e8"
        print(f"Setting Color to BLUE (Hex: {hex_blue})")
        
        payload = smart_light.generate_payload(tinytuya.CONTROL, {'21': 'colour', '24': hex_blue})
        smart_light.send(payload)
        
        time.sleep(2)
        status = smart_light.status()
        print(f"New Color (Expect {hex_blue}): {status.get('dps', {}).get('24')}")

        print("\n--- DIAGNOSTIC COMPLETE ---")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
