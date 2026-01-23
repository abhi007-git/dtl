# Fully Voice-Based App for Visually Impaired Users

I have successfully built a voice-based web application tailored for visually impaired users. 
The app features high-contrast aesthetics and four distinct modules controllable via voice.

## 🚀 Features

### 1. **Voice Form Filling**
   - **How it works**: A step-by-step conversational interface.
   - **Interaction**: The system speaks a question, listens for your answer, and asks for confirmation.
   - **Commands**: Answer naturally, then confirm with "Yes" or "No".

### 2. **Queue Status Announcer**
   - **User Mode**: Say "My token is [number]" to register. The system notifies you when it's your turn.
   - **Admin Mode**: Admin increments the counter.
   - **Voice Output**: "Attention please. Token number 50. It is your turn."

### 3. **QR Code Navigation**
   - **Scanner**: Uses the camera to detect QR codes.
   - **Feedback**: Speaks the location description (e.g., "Room 101, Cardiology").
   - **Simulation**: Includes buttons to simulate scanning for demonstration purposes.

### 4. **Signboard Reader (OCR)**
   - **Technology**: Uses Tesseract.js to read text from the camera feed.
   - **Usage**: Say "Read This" or click the button. The system captures the image and speaks the text found.

## 🎨 Aesthetic & Accessibility
- **High Contrast Theme**: Dark mode with neon accents (#00FF9D, #00D2FF) for visibility.
- **Voice Feedback**: Visualizer bar at the bottom reacts to your voice.
- **Large Typography**: Easy to read headings and instructions.

## 🛠️ Tech Stack
- **Framework**: React + Vite
- **Voice**: `react-speech-recognition`, Web Speech API (TTS)
- **Computer Vision**: `tesseract.js` (OCR), `html5-qrcode` (Scanner), `react-webcam`
- **Styling**: Vanilla CSS (High Contrast)

## 🏃 如何 Run
1. Ensure dependencies are installed: `npm install`
2. Start the development server: `npm run dev`
3. Open `http://localhost:5173`
4. **Grant Permissions**: Allow Microphone and Camera access when prompted.
