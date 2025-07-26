# main.py
import cv2
from gesture_detector import GestureDetector
from key_simulator import send_key
from bindings_manager import load_bindings, save_bindings

QUIT_GESTURE = "thumbs down"  # or "open_palm", whatever you want
_running = False


def main():
    print("[INFO] Starting HandTyped...")
    detector = GestureDetector()
    bindings = load_bindings()

    cap = cv2.VideoCapture(0)

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        

        gesture_name = detector.detect_gesture(frame, bindings)

        if gesture_name == QUIT_GESTURE:
            break
        if gesture_name:
            key = bindings[gesture_name]["bound_key"]
            print(f"[DETECTED] {gesture_name} → {key}")
            send_key(key)

        cv2.imshow("HandTyped - Press 'q' to Quit | 's' to Save Gesture", frame)
        key = cv2.waitKey(1) & 0xFF

        if key == ord('q'):
            break
        

        elif key == ord('s'):
            # Save current gesture
            img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            landmarks = detector.capture_current_landmarks(img_rgb)
            if landmarks:
                gesture_label = input("Enter gesture name: ")
                bound_key = input(f"Key to bind '{gesture_label}' to: ")
                bindings[gesture_label] = {
                    "landmarks": landmarks,
                    "bound_key": bound_key
                }
                save_bindings(bindings)
                print(f"[SAVED] {gesture_label} → {bound_key}")
            else:
                print("[WARN] No hand detected. Try again.")

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
