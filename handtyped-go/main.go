package main

import (
    "fmt"
    "log"
    "github.com/karungopal/handtyped-go/config"
    "github.com/karungopal/handtyped-go/gesture"
    "github.com/karungopal/handtyped-go/keymap"
)

func main() {
    // Load configuration
    cfg, err := config.LoadConfig("config.yaml")
    if err != nil {
        log.Fatalf("Failed to load config: %v", err)
    }

    // Start gesture recognizer
    gestureChan := make(chan string)
    go gesture.StartRecognition(gestureChan)

    // Handle recognized gestures
    for gesture := range gestureChan {
        key, exists := cfg.GestureBindings[gesture]
        if exists {
            fmt.Printf("Gesture: %s → Pressing key: %s\n", gesture, key)
            keymap.PressKey(key)
        } else {
            fmt.Printf("Gesture: %s not mapped\n", gesture)
        }
    }
}
