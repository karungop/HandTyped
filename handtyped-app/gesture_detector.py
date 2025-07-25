# gesture_detector.py
import mediapipe as mp
import numpy as np
import cv2

class GestureDetector:
    def __init__(self):
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(max_num_hands=1)
        self.mp_draw = mp.solutions.drawing_utils

    def normalize_landmarks(self, landmarks):
        origin = landmarks[0]
        return [(lm[0] - origin[0], lm[1] - origin[1], lm[2] - origin[2]) for lm in landmarks]

    def detect_gesture(self, frame, bindings):
        img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.hands.process(img_rgb)

        if results.multi_hand_landmarks:
            hand_landmarks = results.multi_hand_landmarks[0]
            landmarks = [(lm.x, lm.y, lm.z) for lm in hand_landmarks.landmark]
            norm = self.normalize_landmarks(landmarks)

            for name, data in bindings.items():
                ref = np.array(data["landmarks"])
                if self._is_similar(np.array(norm), ref):
                    return name
        return None

    def _is_similar(self, a, b, threshold=0.2):
        if a.shape != b.shape:
            return False
        diff = np.linalg.norm(a - b)
        return diff < threshold

    def capture_current_landmarks(self, img_rgb):
        results = self.hands.process(img_rgb)
        if results.multi_hand_landmarks:
            hand_landmarks = results.multi_hand_landmarks[0]
            landmarks = [(lm.x, lm.y, lm.z) for lm in hand_landmarks.landmark]
            return self.normalize_landmarks(landmarks)
        return None
