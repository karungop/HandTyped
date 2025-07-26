package keymap

import (
    "fmt"
    "log"
    "strings"
    "time"

    "github.com/go-vgo/robotgo"
)

// KeyMap maps gesture names to robotgo key names
var KeyMap = map[string]string{
    // Arrow keys
    "up":    "up",
    "down":  "down", 
    "left":  "left",
    "right": "right",
    
    // Common keys
    "space": "space",
    "enter": "enter",
    "tab":   "tab",
    "esc":   "escape",
    "backspace": "backspace",
    
    // Number keys
    "0": "0", "1": "1", "2": "2", "3": "3", "4": "4",
    "5": "5", "6": "6", "7": "7", "8": "8", "9": "9",
    
    // Letter keys
    "a": "a", "b": "b", "c": "c", "d": "d", "e": "e",
    "f": "f", "g": "g", "h": "h", "i": "i", "j": "j",
    "k": "k", "l": "l", "m": "m", "n": "n", "o": "o",
    "p": "p", "q": "q", "r": "r", "s": "s", "t": "t",
    "u": "u", "v": "v", "w": "w", "x": "x", "y": "y", "z": "z",
    
    // Function keys
    "f1": "f1", "f2": "f2", "f3": "f3", "f4": "f4",
    "f5": "f5", "f6": "f6", "f7": "f7", "f8": "f8",
    "f9": "f9", "f10": "f10", "f11": "f11", "f12": "f12",
    
    // Modifier keys
    "ctrl": "ctrl", "alt": "alt", "shift": "shift", "cmd": "cmd",
}

// PressKey simulates a keypress for the given key
func PressKey(key string) error {
    // Normalize key name
    key = strings.ToLower(strings.TrimSpace(key))
    
    // Check if key exists in our mapping
    robotgoKey, exists := KeyMap[key]
    if !exists {
        return fmt.Errorf("unknown key: %s", key)
    }
    
    // Add a small delay to prevent rapid-fire keypresses
    time.Sleep(50 * time.Millisecond)
    
    // Simulate the keypress
    robotgo.KeyTap(robotgoKey)
    
    log.Printf("Pressed key: %s (mapped from: %s)", robotgoKey, key)
    return nil
}

// PressKeyCombination simulates a key combination (e.g., ctrl+c)
func PressKeyCombination(keys ...string) error {
    if len(keys) == 0 {
        return fmt.Errorf("no keys provided for combination")
    }
    
    // Normalize all keys
    robotgoKeys := make([]string, len(keys))
    for i, key := range keys {
        key = strings.ToLower(strings.TrimSpace(key))
        robotgoKey, exists := KeyMap[key]
        if !exists {
            return fmt.Errorf("unknown key in combination: %s", key)
        }
        robotgoKeys[i] = robotgoKey
    }
    
    // Add a small delay
    time.Sleep(50 * time.Millisecond)
    
    // Simulate the key combination
    if len(robotgoKeys) == 1 {
        robotgo.KeyTap(robotgoKeys[0])
    } else {
        // Convert string slice to interface{} slice for RobotGo
        args := make([]interface{}, len(robotgoKeys)-1)
        for i, key := range robotgoKeys[1:] {
            args[i] = key
        }
        robotgo.KeyTap(robotgoKeys[0], args...)
    }
    
    log.Printf("Pressed key combination: %v", robotgoKeys)
    return nil
}

// TypeText types the given text
func TypeText(text string) error {
    if text == "" {
        return fmt.Errorf("empty text provided")
    }
    
    // Add a small delay
    time.Sleep(100 * time.Millisecond)
    
    // Type the text
    robotgo.TypeStr(text)
    
    log.Printf("Typed text: %s", text)
    return nil
}

// MoveMouse moves the mouse to the specified coordinates
func MoveMouse(x, y int) error {
    robotgo.MoveMouse(x, y)
    log.Printf("Moved mouse to: (%d, %d)", x, y)
    return nil
}

// ClickMouse performs a mouse click at the current position
func ClickMouse(button string) error {
    switch strings.ToLower(button) {
    case "left":
        robotgo.Click("left")
    case "right":
        robotgo.Click("right")
    case "middle":
        robotgo.Click("center")
    default:
        return fmt.Errorf("unknown mouse button: %s", button)
    }
    
    log.Printf("Clicked mouse button: %s", button)
    return nil
}
