# bindings_manager.py
import json
import os

BINDINGS_FILE = "bindings.json"

def load_bindings():
    if not os.path.exists(BINDINGS_FILE):
        return {}
    with open(BINDINGS_FILE, "r") as f:
        return json.load(f)

def save_bindings(bindings):
    with open(BINDINGS_FILE, "w") as f:
        json.dump(bindings, f, indent=2)
