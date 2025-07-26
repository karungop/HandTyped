package keymap

import "github.com/go-vgo/robotgo"

func PressKey(key string) {
    robotgo.KeyTap(key)
}
