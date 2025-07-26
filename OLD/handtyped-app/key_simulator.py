# key_simulator.py
from pynput.keyboard import Controller, Key
import time

keyboard = Controller()

# Mapping for common named keys
SPECIAL_KEYS = {
    'enter': Key.enter,
    'space': Key.space,
    'backspace': Key.backspace,
    'tab': Key.tab,
    'esc': Key.esc,
    'shift': Key.shift,
    'ctrl': Key.ctrl,
    'alt': Key.alt,
    'cmd': Key.cmd,
    'left': Key.left,
    'right': Key.right,
    'up': Key.up,
    'down': Key.down,
}

def send_key(key: str):
    key = key.lower()
    time.sleep(0.05)  # slight delay to avoid spamming

    try:
        if key in SPECIAL_KEYS:
            keyboard.press(SPECIAL_KEYS[key])
            keyboard.release(SPECIAL_KEYS[key])
        elif len(key) == 1:
            keyboard.press(key)
            keyboard.release(key)
        else:
            print(f"[WARN] Unrecognized key: '{key}'")
    except Exception as e:
        print(f"[ERROR] Failed to send key '{key}': {e}")
