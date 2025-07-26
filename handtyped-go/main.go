package main

import (
    "context"
    "flag"
    "fmt"
    "log"
    "os"
    "os/signal"
    "path/filepath"
    "strings"
    "syscall"
    "time"

    "github.com/karungopal/handtyped-go/config"
    "github.com/karungopal/handtyped-go/gesture"
    "github.com/karungopal/handtyped-go/keymap"
)

var (
    configPath = flag.String("config", "config.yaml", "Path to configuration file")
    background = flag.Bool("background", false, "Run in background mode (no preview window)")
    verbose    = flag.Bool("verbose", false, "Enable verbose logging")
    help       = flag.Bool("help", false, "Show help message")
)

func main() {
    flag.Parse()

    if *help {
        showHelp()
        return
    }

    // Set up logging
    if *verbose {
        log.SetFlags(log.LstdFlags | log.Lshortfile)
    } else {
        log.SetFlags(log.LstdFlags)
    }

    log.Println("HandTyped - Gesture-to-Key Mapping Application")
    log.Printf("Configuration file: %s", *configPath)
    log.Printf("Background mode: %v", *background)

    // Load configuration
    cfg, err := loadConfiguration(*configPath)
    if err != nil {
        log.Fatalf("Failed to load configuration: %v", err)
    }

    log.Printf("Loaded %d gesture bindings", len(cfg.GestureBindings))
    for gesture, key := range cfg.GestureBindings {
        log.Printf("  %s → %s", gesture, key)
    }

    // Set up graceful shutdown
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    // Handle interrupt signals
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

    // Start gesture recognition
    gestureChan := make(chan string, 10)
    go func() {
        defer close(gestureChan)
        if *background {
            gesture.StartRecognitionBackground(gestureChan)
        } else {
            gesture.StartRecognition(gestureChan)
        }
    }()

    // Handle recognized gestures
    go handleGestures(ctx, cfg, gestureChan)

    // Wait for shutdown signal
    select {
    case sig := <-sigChan:
        log.Printf("Received signal %v, shutting down...", sig)
        cancel()
    case <-ctx.Done():
        log.Println("Shutting down...")
    }

    // Give some time for cleanup
    time.Sleep(500 * time.Millisecond)
    log.Println("HandTyped stopped")
}

func loadConfiguration(configPath string) (*config.Config, error) {
    // Check if file exists
    if _, err := os.Stat(configPath); os.IsNotExist(err) {
        return nil, fmt.Errorf("configuration file not found: %s", configPath)
    }

    // Determine file type and load accordingly
    ext := strings.ToLower(filepath.Ext(configPath))
    switch ext {
    case ".yaml", ".yml":
        return config.LoadYAMLConfig(configPath)
    case ".json":
        return config.LoadJSONConfig(configPath)
    default:
        // Try YAML first, then JSON
        if cfg, err := config.LoadYAMLConfig(configPath); err == nil {
            return cfg, nil
        }
        if cfg, err := config.LoadJSONConfig(configPath); err == nil {
            return cfg, nil
        }
        return nil, fmt.Errorf("unsupported configuration file format: %s", ext)
    }
}

func handleGestures(ctx context.Context, cfg *config.Config, gestureChan <-chan string) {
    for {
        select {
        case gesture := <-gestureChan:
            if gesture == "" {
                continue
            }

            key, exists := cfg.GestureBindings[gesture]
            if !exists {
                log.Printf("Gesture '%s' not mapped to any key", gesture)
                continue
            }

            log.Printf("Gesture detected: %s → Pressing key: %s", gesture, key)
            
            if err := keymap.PressKey(key); err != nil {
                log.Printf("Error pressing key '%s': %v", key, err)
            }

        case <-ctx.Done():
            log.Println("Gesture handler shutting down...")
            return
        }
    }
}

func showHelp() {
    fmt.Println(`HandTyped - Desktop Application for Gesture-to-Key Mapping

Usage: handtyped-go [options]

Options:
  -config string
        Path to configuration file (default "config.yaml")
  -background
        Run in background mode (no preview window)
  -verbose
        Enable verbose logging
  -help
        Show this help message

Configuration:
  The application supports both YAML and JSON configuration files.
  Example config.yaml:
    gesture_bindings:
      open_palm: "space"
      closed_fist: "enter"
      one_finger: "1"
      two_fingers: "2"
      three_fingers: "3"

Gesture Types:
  - open_palm: Open hand with all fingers extended
  - closed_fist: Closed fist
  - one_finger: One finger raised
  - two_fingers: Two fingers raised
  - three_fingers: Three fingers raised
  - peace_sign: V sign (peace sign)
  - thumbs_up: Thumbs up gesture
  - thumbs_down: Thumbs down gesture
  - ok_sign: OK sign (thumb and index finger forming circle)

Supported Keys:
  - Arrow keys: up, down, left, right
  - Common keys: space, enter, tab, esc, backspace
  - Numbers: 0-9
  - Letters: a-z
  - Function keys: f1-f12
  - Modifiers: ctrl, alt, shift, cmd

Examples:
  handtyped-go                    # Run with default config
  handtyped-go -config myconfig.json  # Use JSON config
  handtyped-go -background        # Run in background mode
  handtyped-go -verbose           # Enable verbose logging
`)
}
