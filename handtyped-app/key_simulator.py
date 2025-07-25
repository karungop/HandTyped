# key_simulator.py
import keyboard

def send_key(key: str):
    try:
        if len(key) == 1:
            keyboard.write(key)
        else:
            keyboard.press_and_release(key.lower())
    except ValueError as e:
        print(f"[ERROR] Key '{key}' not recognized by keyboard library.")
