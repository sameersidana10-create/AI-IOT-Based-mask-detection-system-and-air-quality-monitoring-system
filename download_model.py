
from huggingface_hub import hf_hub_download
from ultralytics import YOLO

print("Downloading AI model...")

model_path = hf_hub_download(
    repo_id="jashwanthpeddisetty0712/ppe-detection-yolov8m",
    filename="best.pt"
)

print("Loading model...")

model = YOLO(model_path)

print("Model loaded successfully!")
print("Available classes:")

for class_id, class_name in model.names.items():
    print(class_id, ":", class_name)
