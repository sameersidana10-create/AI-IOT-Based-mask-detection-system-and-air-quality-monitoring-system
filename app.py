
import cv2
import threading
import time
import winsound

from flask import Flask, jsonify, Response
from flask_cors import CORS
from ultralytics import YOLO
from huggingface_hub import hf_hub_download


# ---------------- APP SETUP ----------------

app = Flask(__name__)
CORS(app)

# ---------------- AI MODEL ----------------

print("Downloading AI model...")

model_path = hf_hub_download(
    repo_id="jashwanthpeddisetty0712/ppe-detection-yolov8m",
    filename="best.pt"
)

print("Loading AI model...")
model = YOLO(model_path)
print("AI model loaded successfully!")
print("Available classes:", model.names)


# ---------------- SHARED DATA ----------------

detection_status = {
    "mask_detected": False,
    "no_mask_detected": False,
    "person_detected": False,
    "status": "STARTING",
    "confidence": 0.0
}

latest_frame = None

data_lock = threading.Lock()
camera_running = False

# Prevent the same sound from playing on every frame.
last_sound_status = None
sound_lock = threading.Lock()


# ---------------- DETECTION SOUNDS ----------------

def play_detection_sound(status):
    global last_sound_status

    if status not in ("MASK DETECTED", "NO MASK DETECTED"):
        with sound_lock:
            last_sound_status = None
        return

    with sound_lock:
        if status == last_sound_status:
            return

        last_sound_status = status

    try:
        if status == "MASK DETECTED":
            # One short, high-pitched confirmation beep.
            winsound.Beep(1500, 180)

        elif status == "NO MASK DETECTED":
            # Two lower-pitched warning beeps.
            winsound.Beep(600, 250)
            winsound.Beep(600, 250)

    except RuntimeError as error:
        print("Sound error:", error)


# ---------------- CLASS LABEL HELPERS ----------------

def normalize_label(label):
    return str(label).strip().lower().replace("_", "-").replace(" ", "-")


def classify_label(label):
    label = normalize_label(label)

    if label in ("mask", "with-mask", "masked"):
        return "mask"

    if label in (
        "no-mask",
        "nomask",
        "without-mask",
        "unmasked"
    ):
        return "no_mask"

    if label in ("person", "people"):
        return "person"

    return None


# ---------------- CAMERA WORKER ----------------

def camera_worker():
    global latest_frame, camera_running

    print("Starting webcam...")

    # DirectShow helps avoid common Windows MSMF camera issues.
    camera = cv2.VideoCapture(0, cv2.CAP_DSHOW)

    if not camera.isOpened():
        print("Could not open camera. Check camera permissions or camera index.")

        with data_lock:
            detection_status["status"] = "CAMERA ERROR"

        camera_running = False
        return

    camera_running = True
    print("Camera started successfully!")

    while camera_running:
        success, frame = camera.read()

        if not success:
            print("Could not read camera frame.")
            time.sleep(0.2)
            continue

        try:
            results = model.predict(frame, verbose=False)
            result = results[0]

            mask_detected = False
            no_mask_detected = False
            person_detected = False
            highest_confidence = 0.0

            if result.boxes is not None:
                for box in result.boxes:
                    class_id = int(box.cls[0].item())
                    confidence = float(box.conf[0].item())

                    label = model.names.get(class_id, str(class_id))
                    category = classify_label(label)

                    if category == "mask":
                        mask_detected = True
                        highest_confidence = max(
                            highest_confidence, confidence
                        )

                    elif category == "no_mask":
                        no_mask_detected = True
                        highest_confidence = max(
                            highest_confidence, confidence
                        )

                    elif category == "person":
                        person_detected = True
                        highest_confidence = max(
                            highest_confidence, confidence
                        )

            # No-mask takes priority if both classes are detected.
            if no_mask_detected:
                status = "NO MASK DETECTED"
            elif mask_detected:
                status = "MASK DETECTED"
            elif person_detected:
                status = "PERSON DETECTED"
            else:
                status = "NO PERSON DETECTED"

            with data_lock:
                detection_status.update({
                    "mask_detected": mask_detected,
                    "no_mask_detected": no_mask_detected,
                    "person_detected": person_detected,
                    "status": status,
                    "confidence": round(highest_confidence * 100, 2)
                })

            # Play the appropriate sound when detection status changes.
            play_detection_sound(status)

            # Draw YOLO detection boxes and labels on the camera frame.
            annotated_frame = result.plot()

            with data_lock:
                latest_frame = annotated_frame.copy()

        except Exception as error:
            print("Detection error:", error)
            time.sleep(0.2)

    camera.release()
    print("Camera stopped.")


# ---------------- HOME API ----------------

@app.route("/")
def home():
    return jsonify({
        "project": "Smart Mask AI",
        "backend": "Python Flask",
        "status": "running"
    })


# ---------------- HEALTH API ----------------

@app.route("/api/health")
def health():
    return jsonify({
        "status": "running",
        "camera_running": camera_running
    })


# ---------------- DETECTION API ----------------

@app.route("/api/detection")
def get_detection():
    with data_lock:
        current_status = detection_status.copy()

    return jsonify(current_status)


# ---------------- LIVE VIDEO STREAM ----------------

def generate_frames():
    while True:
        with data_lock:
            frame = (
                latest_frame.copy()
                if latest_frame is not None
                else None
            )

        if frame is None:
            time.sleep(0.1)
            continue

        success, buffer = cv2.imencode(".jpg", frame)

        if not success:
            continue

        frame_bytes = buffer.tobytes()

        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n"
            + frame_bytes
            + b"\r\n"
        )


@app.route("/video_feed")
def video_feed():
    return Response(
        generate_frames(),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )


# ---------------- START APPLICATION ----------------

if __name__ == "__main__":
    camera_thread = threading.Thread(
        target=camera_worker,
        daemon=True
    )
    camera_thread.start()

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=False,
        threaded=True,
        use_reloader=False
    )
