import qrcode
import os

codes = {
    "QR_01": "Lift",
    "QR_02": "Down the stairs",
    "QR_03": "Down the stairs",
    "QR_04": "Floor 1"
}

# Ensure directory exists
output_dir = "public/qrcodes"
if not os.path.exists(output_dir):
    os.makedirs(output_dir)

for code_text, label in codes.items():
    # The actual data in the QR code must match the keys in NAV_DATA in QRNavigation.jsx
    
    img = qrcode.make(code_text)
    
    filename = f"{output_dir}/{code_text}.png"
    img.save(filename)
    print(f"Generated {filename}")

print("Done generating QR Codes.")
