package config

import (
    "encoding/json"
    "fmt"
    "os"
    "strings"

    "gopkg.in/yaml.v3"
)

// Config represents the application configuration
type Config struct {
    GestureBindings map[string]string `yaml:"gesture_bindings" json:"gesture_bindings"`
    Camera          CameraConfig      `yaml:"camera" json:"camera"`
    Detection       DetectionConfig   `yaml:"detection" json:"detection"`
}

// CameraConfig contains camera-related settings
type CameraConfig struct {
    DeviceID int `yaml:"device_id" json:"device_id"`
    Width    int `yaml:"width" json:"width"`
    Height   int `yaml:"height" json:"height"`
    FPS      int `yaml:"fps" json:"fps"`
}

// DetectionConfig contains gesture detection settings
type DetectionConfig struct {
    MinHandArea    int     `yaml:"min_hand_area" json:"min_hand_area"`
    MaxHandArea    int     `yaml:"max_hand_area" json:"max_hand_area"`
    CooldownMs     int     `yaml:"cooldown_ms" json:"cooldown_ms"`
    Confidence     float64 `yaml:"confidence" json:"confidence"`
    SkinColorLower []int   `yaml:"skin_color_lower" json:"skin_color_lower"`
    SkinColorUpper []int   `yaml:"skin_color_upper" json:"skin_color_upper"`
}

// DefaultConfig returns a default configuration
func DefaultConfig() *Config {
    return &Config{
        GestureBindings: map[string]string{
            "open_palm":     "space",
            "closed_fist":   "enter",
            "one_finger":    "1",
            "two_fingers":   "2",
            "three_fingers": "3",
        },
        Camera: CameraConfig{
            DeviceID: 0,
            Width:    640,
            Height:   480,
            FPS:      30,
        },
        Detection: DetectionConfig{
            MinHandArea:    5000,
            MaxHandArea:    50000,
            CooldownMs:     500,
            Confidence:     0.7,
            SkinColorLower: []int{0, 20, 70},
            SkinColorUpper: []int{20, 255, 255},
        },
    }
}

// LoadYAMLConfig loads configuration from a YAML file
func LoadYAMLConfig(path string) (*Config, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("failed to read config file: %w", err)
    }

    var cfg Config
    if err := yaml.Unmarshal(data, &cfg); err != nil {
        return nil, fmt.Errorf("failed to parse YAML config: %w", err)
    }

    return validateAndMergeDefaults(&cfg)
}

// LoadJSONConfig loads configuration from a JSON file
func LoadJSONConfig(path string) (*Config, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("failed to read config file: %w", err)
    }

    var cfg Config
    if err := json.Unmarshal(data, &cfg); err != nil {
        return nil, fmt.Errorf("failed to parse JSON config: %w", err)
    }

    return validateAndMergeDefaults(&cfg)
}

// LoadConfig is a legacy function that tries to load either YAML or JSON
func LoadConfig(path string) (*Config, error) {
    if strings.HasSuffix(strings.ToLower(path), ".json") {
        return LoadJSONConfig(path)
    }
    return LoadYAMLConfig(path)
}

// SaveYAMLConfig saves configuration to a YAML file
func SaveYAMLConfig(cfg *Config, path string) error {
    data, err := yaml.Marshal(cfg)
    if err != nil {
        return fmt.Errorf("failed to marshal config to YAML: %w", err)
    }

    if err := os.WriteFile(path, data, 0644); err != nil {
        return fmt.Errorf("failed to write config file: %w", err)
    }

    return nil
}

// SaveJSONConfig saves configuration to a JSON file
func SaveJSONConfig(cfg *Config, path string) error {
    data, err := json.MarshalIndent(cfg, "", "  ")
    if err != nil {
        return fmt.Errorf("failed to marshal config to JSON: %w", err)
    }

    if err := os.WriteFile(path, data, 0644); err != nil {
        return fmt.Errorf("failed to write config file: %w", err)
    }

    return nil
}

// validateAndMergeDefaults validates the configuration and merges with defaults
func validateAndMergeDefaults(cfg *Config) (*Config, error) {
    defaultCfg := DefaultConfig()

    // Merge with defaults if fields are empty
    if cfg.GestureBindings == nil {
        cfg.GestureBindings = defaultCfg.GestureBindings
    }

    if cfg.Camera.Width == 0 {
        cfg.Camera.Width = defaultCfg.Camera.Width
    }
    if cfg.Camera.Height == 0 {
        cfg.Camera.Height = defaultCfg.Camera.Height
    }
    if cfg.Camera.FPS == 0 {
        cfg.Camera.FPS = defaultCfg.Camera.FPS
    }

    if cfg.Detection.MinHandArea == 0 {
        cfg.Detection.MinHandArea = defaultCfg.Detection.MinHandArea
    }
    if cfg.Detection.MaxHandArea == 0 {
        cfg.Detection.MaxHandArea = defaultCfg.Detection.MaxHandArea
    }
    if cfg.Detection.CooldownMs == 0 {
        cfg.Detection.CooldownMs = defaultCfg.Detection.CooldownMs
    }
    if cfg.Detection.Confidence == 0 {
        cfg.Detection.Confidence = defaultCfg.Detection.Confidence
    }
    if len(cfg.Detection.SkinColorLower) == 0 {
        cfg.Detection.SkinColorLower = defaultCfg.Detection.SkinColorLower
    }
    if len(cfg.Detection.SkinColorUpper) == 0 {
        cfg.Detection.SkinColorUpper = defaultCfg.Detection.SkinColorUpper
    }

    // Validate configuration
    if err := validateConfig(cfg); err != nil {
        return nil, err
    }

    return cfg, nil
}

// validateConfig validates the configuration values
func validateConfig(cfg *Config) error {
    if len(cfg.GestureBindings) == 0 {
        return fmt.Errorf("no gesture bindings configured")
    }

    if cfg.Camera.Width <= 0 || cfg.Camera.Height <= 0 {
        return fmt.Errorf("invalid camera dimensions: %dx%d", cfg.Camera.Width, cfg.Camera.Height)
    }

    if cfg.Camera.FPS <= 0 {
        return fmt.Errorf("invalid camera FPS: %d", cfg.Camera.FPS)
    }

    if cfg.Detection.MinHandArea <= 0 {
        return fmt.Errorf("invalid min hand area: %d", cfg.Detection.MinHandArea)
    }

    if cfg.Detection.MaxHandArea <= cfg.Detection.MinHandArea {
        return fmt.Errorf("max hand area must be greater than min hand area")
    }

    if cfg.Detection.CooldownMs < 0 {
        return fmt.Errorf("invalid cooldown: %d", cfg.Detection.CooldownMs)
    }

    if cfg.Detection.Confidence < 0 || cfg.Detection.Confidence > 1 {
        return fmt.Errorf("confidence must be between 0 and 1: %f", cfg.Detection.Confidence)
    }

    if len(cfg.Detection.SkinColorLower) != 3 || len(cfg.Detection.SkinColorUpper) != 3 {
        return fmt.Errorf("skin color ranges must have 3 values (HSV)")
    }

    return nil
}
