package config

import (
    "gopkg.in/yaml.v3"
    "os"
)

type Config struct {
    GestureBindings map[string]string `yaml:"gesture_bindings"`
}

func LoadConfig(path string) (*Config, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, err
    }

    var cfg Config
    if err := yaml.Unmarshal(data, &cfg); err != nil {
        return nil, err
    }

    return &cfg, nil
}
