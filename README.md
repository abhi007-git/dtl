# Voice Assistant for Visually Impaired

A fully voice-based web application designed to assist visually impaired users with navigation, form filling, and more.

## Features & Voice Commands

### Global Commands
- **"Go to Form"**: Open the Form Filler.
- **"Go to Queue"**: Open the Queue System.
- **"Go to Map"** / **"Navigation"**: Open QR Navigation.
- **"Read Sign"**: Open OCR Sign Reader.
- **"Go Home"**: Return to main menu.

### Module Specifics

#### 1. Voice Form Filling
- The system will ask you questions one by one.
- **Speak your answer** clearly.
- Wait for 2 seconds (silence detection).
- System will ask for confirmation ("Did you say X?").
- Say **"Yes"** to proceed, or **"No"** to retry.

#### 2. Queue Status
- **"My token is [number]"**: Register your token (e.g., "My token is 50").
- **Admin**: Click "Next Token" or say "Next Token" to increment the counter.
- System automatically announces when it's your turn.

#### 3. QR Navigation
- Point the camera at a QR code.
- System reads the location aloud.
- Use the **Simulation Buttons** at the bottom to test without physical QR codes.

#### 4. Signboard Reader
- Point the camera at text.
- Say **"Read This"** or click the button.
- System processes the image and reads the text aloud.

## Setup
1. `npm install`
2. `npm run dev`
3. Allow Microphone and Camera permissions in the browser.
