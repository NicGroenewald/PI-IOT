import colorsys
from typing import Tuple

def decode_hsv_hex(hex_str: str) -> Tuple[int, int, int]:
    if not hex_str or len(hex_str) != 12:
        return (0, 1000, 1000)
    try:
        h = int(hex_str[0:4], 16)
        s = int(hex_str[4:8], 16)
        v = int(hex_str[8:12], 16)
        return (h, s, v)
    except ValueError:
        return (0, 1000, 1000)

def encode_hsv_hex(h: int, s: int, v: int) -> str:
    h = int(h) % 360
    s = max(0, min(1000, int(s)))
    v = max(0, min(1000, int(v)))
    return f"{h:04x}{s:04x}{v:04x}"

def hsv_to_rgb_hex(hex_str: str) -> str:
    try:
        if not hex_str or len(hex_str) != 12:
            return "#ffffff"
        h, s, v = decode_hsv_hex(hex_str)
        r, g, b = colorsys.hsv_to_rgb(h/360.0, s/1000.0, v/1000.0)
        return f"#{int(r*255):02x}{int(g*255):02x}{int(b*255):02x}"
    except Exception:
        return "#ffffff"
