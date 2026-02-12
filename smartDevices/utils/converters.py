def brightness_percent_to_tuya(percent: int) -> int:
    val = int(percent * 10)
    return max(10, min(1000, val))

def tuya_to_brightness_percent(tuya_val: int) -> int:
    return int(tuya_val / 10)

def clamp_int(value: int, min_val: int, max_val: int) -> int:
    return max(min_val, min(max_val, value))

def watts(raw_power: int) -> float:
    return raw_power / 10.0

def volts(raw_volts: int) -> float:
    return raw_volts / 10.0

def amps(raw_ma: int) -> float:
    return raw_ma / 1000.0
