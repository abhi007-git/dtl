import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import { useVoice } from '../context/VoiceContext';

const SignReader = () => {
    const webcamRef = useRef(null);
    const { speak, transcript, resetTranscript } = useVoice();

    const [processing, setProcessing] = useState(false);
    const [text, setText] = useState('');
    const [image, setImage] = useState(null);

    useEffect(() => {
        speak("Signboard Reader Active. Say 'Read This' to scan.");
    }, []);

    useEffect(() => {
        const cmd = transcript.toLowerCase();
        if ((cmd.includes("read this") || cmd.includes("scan")) && !processing) {
            captureAndRead();
            resetTranscript();
        }
        if (cmd.includes("reset") || cmd.includes("clear")) {
            resetReader();
            resetTranscript();
        }
    }, [transcript, processing]);

    // Removed Debug Model Checker

    const captureAndRead = async () => {
        if (processing || !webcamRef.current) return;

        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) {
            speak("Camera not ready.");
            return;
        }

        setImage(imageSrc);
        setProcessing(true);
        speak("Analyzing sign. Please hold steady.");

        // PRO-TIP: Start a synthetic "thinking" pulse so the user knows the app is working
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const pulseInterval = setInterval(() => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.value = 440;
            gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.1);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.1);
        }, 800);

        try {
            const base64Image = imageSrc.split(',')[1];
            const response = await fetch('/api/analyze_sign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64Image })
            });

            if (!response.ok) {
                speak("Connection error. Please try again.");
                return;
            }

            const data = await response.json();
            const textFound = data.text ? data.text.trim() : "";

            if (textFound && textFound.toLowerCase() !== "no text found") {
                setText(textFound);
                speak("The sign says: " + textFound);
            } else {
                speak("I couldn't identify the sign. Please try moving the camera and scanning again.");
            }
        } catch (err) {
            speak("Scanning failed. Please try again.");
        } finally {
            clearInterval(pulseInterval);
            audioCtx.close();
            setProcessing(false);
        }
    };

    const resetReader = () => {
        setImage(null);
        setText('');
        setProcessing(false);
        speak("Camera active.");
    };

    return (
        <div className="container">
            <h1 className="hc-text mb-4 text-center">Medical Sign & Medicine Reader</h1>

            <div className="card max-w-2xl mx-auto flex flex-col items-center gap-4">
                <p className="text-sm text-accent-secondary mb-2">Identify departments or medicine dosages</p>
                <div className="relative w-full aspect-video bg-black rounded overflow-hidden border border-gray-700">
                    {!image ? (
                        <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            videoConstraints={{ facingMode: "environment" }} // Use back camera on mobile
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <img src={image} alt="Captured" className="w-full h-full object-cover" />
                    )}

                    {processing && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <div className="text-accent-primary animate-pulse text-xl font-bold flex flex-col items-center">
                                <span>Scanning...</span>
                                <span className="text-sm font-normal text-white mt-2">Connecting to Google Gemini</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex gap-4 flex-wrap justify-center">
                    <button disabled={processing || !!image} onClick={captureAndRead} className={`hc-button ${image ? 'opacity-50' : ''}`}>
                        📸 Scan
                    </button>

                    {image && (
                        <button onClick={resetReader} className="hc-button" style={{ borderColor: '#fff', color: '#fff' }}>
                            🔄 Reset
                        </button>
                    )}
                </div>

                <p className="text-gray-500 text-sm">Say "Read This" or "Reset"</p>

                {text && (
                    <div className="mt-4 p-6 bg-gray-800 rounded w-full border border-accent-secondary shadow-lg">
                        <h3 className="text-accent-secondary mb-2 text-sm uppercase tracking-wider">Detected Text</h3>
                        <p className="text-2xl text-white font-mono leading-relaxed">{text}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SignReader;
