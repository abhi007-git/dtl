import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useVoice } from '../context/VoiceContext';

const NAV_DATA = {
    "QR_01": "Move right 1 step and walk down 8 steps infront of you.",
    "QR_02": "Turn left and move forward 2 steps to access the 3rd QR.",
    "QR_03": "Turn left and walk down 8 steps infront of you to reach floor 1 and turn right.",
    "QR_04": "Turn left, walk straight 3 steps, turn left and walk straight 4 steps to reach entrance of room 1."
};

const QRNavigation = () => {
    const { speak } = useVoice();
    const [data, setData] = useState('Scanning...');
    const scannerRef = useRef(null);
    const hasSpokenRef = useRef(false);

    useEffect(() => {
        speak("Navigation Mode. Scanning for QR codes.");

        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        // Auto-start using back camera
        html5QrCode.start(
            { facingMode: "environment" },
            config,
            onScanSuccess,
            onScanFailure
        ).catch(err => {
            console.error("Error starting scanner", err);
            speak("Camera permission denied.");
        });

        // Cleanup
        return () => {
            if (html5QrCode.isScanning) {
                html5QrCode.stop().then(() => html5QrCode.clear());
            }
        };
    }, []);

    const onScanSuccess = (decodedText, decodedResult) => {
        if (decodedText === data) return;

        setData(decodedText);
        const message = NAV_DATA[decodedText] || `Unknown Location Code: ${decodedText}`;
        speak(message);
    };

    const onScanFailure = (error) => {
        // handle error if needed
    };

    const simulateScan = (code) => {
        onScanSuccess(code, null);
    }

    return (
        <div className="container">
            <h1 className="hc-text mb-4 text-center">QR Navigation</h1>

            <div className="card max-w-lg mx-auto">
                {/* Scanner Viewport */}
                <div id="reader" style={{ width: '100%', minHeight: '300px', background: 'black' }}></div>

                <div className="mt-4 p-4 text-center bg-gray-900 rounded border border-gray-700">
                    <h3 className="text-gray-400 text-sm">Detected Location:</h3>
                    <p className="text-xl font-bold text-accent-primary mt-2">{data}</p>
                </div>

                {/* Simulation Controls for Demo */}
                <div className="mt-8 border-t border-gray-700 pt-4">
                    <h4 className="mb-2 text-sm text-gray-500">Simulation Controls (Click to test):</h4>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {Object.keys(NAV_DATA).map(key => (
                            <button
                                key={key}
                                onClick={() => simulateScan(key)}
                                className="px-3 py-1 bg-gray-700 rounded hover:bg-white hover:text-black text-xs"
                            >
                                {key}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QRNavigation;
