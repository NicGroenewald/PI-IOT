from utils.hsv import decode_hsv_hex, encode_hsv_hex, hsv_to_rgb_hex
from utils.converters import brightness_percent_to_tuya, tuya_to_brightness_percent


def turn_on(smart_light):
    if smart_light:
        smart_light.set_value('20', True)
        print("Light ON")


def turn_off(smart_light):
    if smart_light:
        smart_light.set_value('20', False)
        print("Light OFF")


def toggle(smart_light, get_status):
    if smart_light:
        status = get_status()
        is_on = status.get("20", False)
        smart_light.set_value('20', not is_on)
        print(f"Light toggled ({'ON' if not is_on else 'OFF'})")


def set_brightness(smart_light, get_status, brightness):
    try:
        percent = max(0, min(100, int(float(brightness))))
        status = get_status()
        mode = status.get('21', 'white')
        
        if mode == 'colour':
            current_color = status.get('24', '000003e803e8')
            h, s, _ = decode_hsv_hex(current_color)
            v = brightness_percent_to_tuya(percent)
            new_hex = encode_hsv_hex(h, s, v)
            
            smart_light.set_multiple_values({'21': 'colour', '24': new_hex})
            print(f"Brightness: {percent}% (colour mode)")
        else:
            tuya_val = brightness_percent_to_tuya(percent)
            smart_light.set_value('22', tuya_val)
            print(f"Brightness: {percent}% (white mode)")
    except Exception as e:
        print(f"Error setting brightness: {e}")


def set_color(smart_light, h, s, v):
    try:
        h = int(float(h)) % 360
        s = max(0, min(1000, int(float(s))))
        v = max(0, min(1000, int(float(v))))
        
        hex_str = encode_hsv_hex(h, s, v)
        smart_light.set_multiple_values({'21': 'colour', '24': hex_str})
        print(f"Color: H={h}, S={s}, V={v}")
    except Exception as e:
        print(f"Error setting color: {e}")


def set_temperature(smart_light, get_status, temp):
    try:
        temp_val = max(0, min(1000, int(float(temp))))
        status = get_status()
        mode = status.get('21', 'white')

        if mode == 'white':
            brightness = status.get('22', 500)
        else:
            current_color = status.get('24', '000003e803e8')
            _, _, brightness = decode_hsv_hex(current_color)

        brightness = max(100, brightness)

        smart_light.set_value('21', 'white')
        smart_light.set_value('23', temp_val)
        smart_light.set_value('22', brightness)
        
        print(f"Temperature: {temp_val} (brightness: {brightness})")
    except Exception as e:
        print(f"Error setting temperature: {e}")