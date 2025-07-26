package gesture

import (
    "fmt"
    "image"
    "image/color"
    "time"

    "gocv.io/x/gocv"
)

func StartRecognition(out chan<- string) {
    webcam, err := gocv.OpenVideoCapture(0)
    if err != nil {
        panic(fmt.Sprintf("Error opening webcam: %v", err))
    }
    defer webcam.Close()

    window := gocv.NewWindow("HandTyped - Preview")
    defer window.Close()

    img := gocv.NewMat()
    defer img.Close()

    // Create binary image for processing
    processed := gocv.NewMat()
    defer processed.Close()

    // Define color for drawing
    green := color.RGBA{0, 255, 0, 0}

    for {
        if ok := webcam.Read(&img); !ok || img.Empty() {
            continue
        }

        // Convert to grayscale
        gocv.CvtColor(img, &processed, gocv.ColorBGRToGray)

        // Blur to reduce noise
        gocv.GaussianBlur(processed, &processed, image.Pt(7, 7), 0, 0, gocv.BorderDefault)

        // Apply thresholding to get binary image
        gocv.Threshold(processed, &processed, 60, 255, gocv.ThresholdBinaryInv)

        // Find contours
        contours := gocv.FindContours(processed, gocv.RetrievalExternal, gocv.ChainApproxSimple)

        if len(contours) > 0 {
            largest := contours[0]
            maxArea := gocv.ContourArea(largest)

            // Choose largest contour
            for _, c := range contours {
                if area := gocv.ContourArea(c); area > maxArea {
                    largest = c
                    maxArea = area
                }
            }

            // Draw the largest contour
            gocv.DrawContours(&img, [][]image.Point{largest}, -1, green, 2)

            // Use convexity to guess gesture
            hull := gocv.NewMat()
            gocv.ConvexHull(largest, &hull, false, false)

            // Estimate openness of hand
            defects := len(largest) - hull.Cols()

            var gesture string
            if maxArea > 10000 {
                if defects > 4 {
                    gesture = "open_palm"
                } else {
                    gesture = "closed_fist"
                }
                out <- gesture
                fmt.Println("Detected:", gesture)

                // delay to avoid repeat spam
                time.Sleep(1 * time.Second)
            }
        }

        // Show camera preview
        window.IMShow(img)
        if window.WaitKey(1) == 27 {
            break // Esc key
        }
    }
}
