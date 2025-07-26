//go:build opencv
// +build opencv

package gesture

import (
    "fmt"
    "image"
    "image/color"
    "log"
    "math"
    "math/rand"
    "time"

    "gocv.io/x/gocv"
)

// Gesture types
const (
    GestureOpenPalm    = "open_palm"
    GestureClosedFist  = "closed_fist"
    GestureOneFinger   = "one_finger"
    GestureTwoFingers  = "two_fingers"
    GestureThreeFingers = "three_fingers"
    GestureThumbsUp    = "thumbs_up"
    GestureThumbsDown  = "thumbs_down"
    GesturePeaceSign   = "peace_sign"
    GestureOKSign      = "ok_sign"
)

// Hand detection parameters
const (
    minHandArea = 5000
    maxHandArea = 50000
    gestureCooldown = 500 * time.Millisecond
)

type HandDetector struct {
    lastGesture     string
    lastGestureTime time.Time
    gestureCount    map[string]int
    isSimulation    bool
    webcam          *gocv.VideoCapture
    window          *gocv.Window
}

func NewHandDetector() *HandDetector {
    return &HandDetector{
        gestureCount: make(map[string]int),
        isSimulation: false, // Now using real OpenCV detection
    }
}

// StartRecognition starts gesture recognition with a preview window
func StartRecognition(out chan<- string) {
    log.Println("Starting OpenCV-based gesture recognition")
    
    detector := NewHandDetector()
    defer detector.cleanup()
    
    if err := detector.initializeCamera(); err != nil {
        log.Printf("Failed to initialize camera: %v", err)
        log.Println("Falling back to simulation mode")
        detector.fallbackToSimulation(out)
        return
    }
    
    detector.startRealTimeDetection(out)
}

// StartRecognitionBackground starts gesture recognition without a preview window
func StartRecognitionBackground(out chan<- string) {
    log.Println("Starting OpenCV-based gesture recognition in background mode")
    
    detector := NewHandDetector()
    defer detector.cleanup()
    
    if err := detector.initializeCamera(); err != nil {
        log.Printf("Failed to initialize camera: %v", err)
        log.Println("Falling back to simulation mode")
        detector.fallbackToSimulation(out)
        return
    }
    
    detector.startBackgroundDetection(out)
}

// initializeCamera sets up the webcam for gesture detection
func (hd *HandDetector) initializeCamera() error {
    webcam, err := gocv.OpenVideoCapture(0)
    if err != nil {
        return fmt.Errorf("failed to open webcam: %w", err)
    }
    
    // Set webcam properties for better performance
    webcam.Set(gocv.VideoCaptureFrameWidth, 640)
    webcam.Set(gocv.VideoCaptureFrameHeight, 480)
    webcam.Set(gocv.VideoCaptureFPS, 30)
    
    hd.webcam = webcam
    return nil
}

// startRealTimeDetection runs the main detection loop with preview window
func (hd *HandDetector) startRealTimeDetection(out chan<- string) {
    window := gocv.NewWindow("HandTyped - Gesture Recognition")
    defer window.Close()
    hd.window = window
    
    img := gocv.NewMat()
    defer img.Close()
    
    log.Println("Press 'ESC' to stop gesture recognition")
    
    for {
        if ok := hd.webcam.Read(&img); !ok || img.Empty() {
            log.Println("Failed to read from webcam")
            continue
        }
        
        // Detect gesture in the current frame
        gesture := hd.detectGesture(img)
        
        // Send gesture if detected and cooldown has passed
        if gesture != "" && time.Since(hd.lastGestureTime) > gestureCooldown {
            hd.lastGesture = gesture
            hd.lastGestureTime = time.Now()
            hd.gestureCount[gesture]++
            
            log.Printf("Detected gesture: %s (count: %d)", gesture, hd.gestureCount[gesture])
            out <- gesture
        }
        
        // Show the processed frame
        window.IMShow(img)
        
        // Check for ESC key to exit
        if window.WaitKey(1) == 27 {
            log.Println("ESC pressed, stopping gesture recognition")
            break
        }
    }
}

// startBackgroundDetection runs the detection loop without preview window
func (hd *HandDetector) startBackgroundDetection(out chan<- string) {
    img := gocv.NewMat()
    defer img.Close()
    
    log.Println("Running background gesture detection")
    
    for {
        if ok := hd.webcam.Read(&img); !ok || img.Empty() {
            log.Println("Failed to read from webcam")
            time.Sleep(100 * time.Millisecond)
            continue
        }
        
        // Detect gesture in the current frame
        gesture := hd.detectGesture(img)
        
        // Send gesture if detected and cooldown has passed
        if gesture != "" && time.Since(hd.lastGestureTime) > gestureCooldown {
            hd.lastGesture = gesture
            hd.lastGestureTime = time.Now()
            hd.gestureCount[gesture]++
            
            log.Printf("Detected gesture: %s (count: %d)", gesture, hd.gestureCount[gesture])
            out <- gesture
        }
        
        // Small delay to prevent excessive CPU usage
        time.Sleep(10 * time.Millisecond)
    }
}

// detectGesture performs the actual gesture detection using OpenCV
func (hd *HandDetector) detectGesture(img gocv.Mat) string {
    // Convert to HSV for better skin detection
    hsv := gocv.NewMat()
    defer hsv.Close()
    gocv.CvtColor(img, &hsv, gocv.ColorBGRToHSV)
    
    // Create skin color mask
    skinMask := gocv.NewMat()
    defer skinMask.Close()
    
    // Define skin color range in HSV
    lowerSkin := gocv.NewScalar(0, 20, 70, 0)
    upperSkin := gocv.NewScalar(20, 255, 255, 0)
    
    // Create lower and upper bound matrices
    lowerMat := gocv.NewMatWithSize(hsv.Rows(), hsv.Cols(), hsv.Type())
    upperMat := gocv.NewMatWithSize(hsv.Rows(), hsv.Cols(), hsv.Type())
    defer lowerMat.Close()
    defer upperMat.Close()
    
    lowerMat.SetTo(lowerSkin)
    upperMat.SetTo(upperSkin)
    
    gocv.InRange(hsv, lowerMat, upperMat, &skinMask)
    
    // Morphological operations to clean up the mask
    kernel := gocv.GetStructuringElement(gocv.MorphEllipse, image.Pt(3, 3))
    defer kernel.Close()
    
    gocv.MorphologyEx(skinMask, &skinMask, gocv.MorphOpen, kernel)
    gocv.MorphologyEx(skinMask, &skinMask, gocv.MorphClose, kernel)
    
    // Find contours
    contours := gocv.FindContours(skinMask, gocv.RetrievalExternal, gocv.ChainApproxSimple)
    
    if contours.Size() == 0 {
        return ""
    }
    
    // Find the largest contour (assumed to be the hand)
    largest := contours.At(0)
    maxArea := gocv.ContourArea(largest)
    
    for i := 0; i < contours.Size(); i++ {
        contour := contours.At(i)
        if area := gocv.ContourArea(contour); area > maxArea {
            largest = contour
            maxArea = area
        }
    }
    
    // Filter by area
    if maxArea < minHandArea || maxArea > maxHandArea {
        return ""
    }
    
    // Draw contour for debugging
    green := color.RGBA{0, 255, 0, 0}
    gocv.DrawContours(&img, contours, 0, green, 2)
    
    // Analyze the contour to determine gesture
    return hd.analyzeContour(largest, maxArea)
}

// analyzeContour analyzes the hand contour to determine the gesture
func (hd *HandDetector) analyzeContour(contour gocv.PointVector, area float64) string {
    // Calculate convex hull
    hull := gocv.NewMat()
    defer hull.Close()
    gocv.ConvexHull(contour, &hull, false, false)
    
    // Calculate convexity defects
    defects := gocv.NewMat()
    defer defects.Close()
    gocv.ConvexityDefects(contour, hull, &defects)
    
    // Count significant defects (fingers)
    fingerCount := 0
    for i := 0; i < defects.Rows(); i++ {
        defect := defects.GetVecfAt(i, 0)
        depth := defect[3]
        
        // Filter defects by depth (avoid noise)
        if depth > 10000 {
            fingerCount++
        }
    }
    
    // Calculate aspect ratio for additional analysis
    rect := gocv.BoundingRect(contour)
    aspectRatio := float64(rect.Dx()) / float64(rect.Dy())
    
    // Determine gesture based on finger count and other features
    switch {
    case fingerCount >= 4:
        return GestureOpenPalm
    case fingerCount == 0:
        return GestureClosedFist
    case fingerCount == 1:
        return GestureOneFinger
    case fingerCount == 2:
        // Check if it's a peace sign (V shape)
        if hd.isPeaceSign(contour) {
            return GesturePeaceSign
        }
        // Use aspect ratio to help distinguish between gestures
        if aspectRatio > 1.2 {
            return GestureThumbsUp
        }
        return GestureTwoFingers
    case fingerCount == 3:
        return GestureThreeFingers
    default:
        return ""
    }
}

// isPeaceSign checks if the contour represents a peace sign (V shape)
func (hd *HandDetector) isPeaceSign(contour gocv.PointVector) bool {
    // Simple heuristic: check if the contour has a V-like shape
    if contour.Size() < 10 {
        return false
    }
    
    // Calculate the angle between three consecutive points
    // If we find a sharp angle, it might be a V shape
    for i := 1; i < contour.Size()-1; i++ {
        p1 := contour.At(i-1)
        p2 := contour.At(i)
        p3 := contour.At(i+1)
        
        angle := hd.calculateAngle(p1, p2, p3)
        if angle < 90 && angle > 30 { // Sharp angle
            return true
        }
    }
    return false
}

// calculateAngle calculates the angle between three points
func (hd *HandDetector) calculateAngle(p1, p2, p3 image.Point) float64 {
    // Calculate angle between three points
    v1 := image.Point{p1.X - p2.X, p1.Y - p2.Y}
    v2 := image.Point{p3.X - p2.X, p3.Y - p2.Y}
    
    dot := float64(v1.X*v2.X + v1.Y*v2.Y)
    mag1 := math.Sqrt(float64(v1.X*v1.X + v1.Y*v1.Y))
    mag2 := math.Sqrt(float64(v2.X*v2.X + v2.Y*v2.Y))
    
    if mag1 == 0 || mag2 == 0 {
        return 0
    }
    
    cosAngle := dot / (mag1 * mag2)
    cosAngle = math.Max(-1, math.Min(1, cosAngle)) // Clamp to [-1, 1]
    
    return math.Acos(cosAngle) * 180 / math.Pi
}

// fallbackToSimulation falls back to simulation mode if OpenCV fails
func (hd *HandDetector) fallbackToSimulation(out chan<- string) {
    hd.isSimulation = true
    log.Println("Running in simulation mode")
    hd.simulateGestures(out)
}

// simulateGestures simulates gesture detection for demonstration purposes
func (hd *HandDetector) simulateGestures(out chan<- string) {
    gestures := []string{
        GestureOpenPalm,
        GestureClosedFist,
        GestureOneFinger,
        GestureTwoFingers,
        GestureThreeFingers,
        GesturePeaceSign,
        GestureThumbsUp,
        GestureThumbsDown,
    }
    
    ticker := time.NewTicker(3 * time.Second)
    defer ticker.Stop()
    
    for {
        select {
        case <-ticker.C:
            gesture := gestures[rand.Intn(len(gestures))]
            
            if time.Since(hd.lastGestureTime) > gestureCooldown {
                hd.lastGesture = gesture
                hd.lastGestureTime = time.Now()
                hd.gestureCount[gesture]++
                
                log.Printf("Simulated gesture detected: %s (count: %d)", gesture, hd.gestureCount[gesture])
                out <- gesture
            }
        }
    }
}

// cleanup properly closes OpenCV resources
func (hd *HandDetector) cleanup() {
    if hd.webcam != nil {
        hd.webcam.Close()
    }
    if hd.window != nil {
        hd.window.Close()
    }
}

// GetGestureStats returns statistics about detected gestures
func (hd *HandDetector) GetGestureStats() map[string]int {
    return hd.gestureCount
}

// ResetStats resets the gesture statistics
func (hd *HandDetector) ResetStats() {
    hd.gestureCount = make(map[string]int)
}

// IsSimulationMode returns whether the detector is in simulation mode
func (hd *HandDetector) IsSimulationMode() bool {
    return hd.isSimulation
}
