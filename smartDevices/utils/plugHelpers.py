def watts(raw_power):
    return raw_power / 10.0


def volts(raw_volts):
    return raw_volts / 10.0


def amps(raw_ma):
    return raw_ma / 1000.0


def turn_on(smart_plug):
    if smart_plug:
        smart_plug.set_status(True)
        print("Plug ON")


def turn_off(smart_plug):
    if smart_plug:
        smart_plug.set_status(False)
        print("Plug OFF")


def toggle(smart_plug, get_status):
    if smart_plug:
        status = get_status()
        is_on = status.get("1", False)
        smart_plug.set_status(not is_on)
        print(f"Plug toggled ({'ON' if not is_on else 'OFF'})")
