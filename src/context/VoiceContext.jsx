import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import regeneratorRuntime from "regenerator-runtime";

const VoiceContext = createContext();

export const useVoice = () => useContext(VoiceContext);

export const VoiceProvider = ({ children }) => {
    const [transcript, setTranscript] = useState('');
    const [listening, setListening] = useState(false);
    const [isSystemSpeaking, setIsSystemSpeaking] = useState(false);
    const [status, setStatus] = useState("Idle");
    const [audioLevel, setAudioLevel] = useState(0);
    const [lastLocation, setLastLocation] = useState("Unknown Location");

    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const silenceTimerRef = useRef(null);
    const isRecordingRef = useRef(false);
    const streamRef = useRef(null);

    // Speak function
    const speak = (text) => {
        setIsSystemSpeaking(true);
        window.speechSynthesis.cancel();

        // Safety timeout: reset speaking state after 10s max
        const safetyTimer = setTimeout(() => setIsSystemSpeaking(false), 10000);

        const utterance = new SpeechSynthesisUtterance(text);

        // Select a natural voice if available
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.lang.startsWith("en-") && (v.name.includes("US") || v.name.includes("Google")));
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onend = () => {
            clearTimeout(safetyTimer);
            setIsSystemSpeaking(false);
        };
        utterance.onerror = () => {
            clearTimeout(safetyTimer);
            setIsSystemSpeaking(false);
        };
        window.speechSynthesis.speak(utterance);
    };

    const sendAudioToServer = async (mimeType = 'audio/webm') => {
        try {
            const blob = new Blob(chunksRef.current, { type: mimeType });
            console.log(`Sending Audio: ${blob.size} bytes, Type: ${mimeType}`);

            // Lower threshold to 100 bytes to catch short commands
            if (blob.size < 100) {
                console.log("Audio too short/empty, ignoring.");
                return;
            }

            const formData = new FormData();
            const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
            formData.append('audio', blob, `command.${ext}`);

            setStatus("Sending...");
            const response = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error("Server Error:", errText);
                setStatus("Error");
                // Alert the user only if it's a critical failure during manual mode
                if (status.includes("Manual")) alert(`Voice Error: ${response.statusText}\n${errText}`);
                return;
            }

            const data = await response.json();

            if (data.error) {
                console.error("API Error:", data.error);
                setStatus("Error");
                return;
            }

            if (data.text) {
                console.log("Server Transcript:", data.text);
                setTranscript(data.text);
            } else {
                console.log("No text transcribed");
            }
        } catch (e) {
            console.error("Transcription Failed", e);
            setStatus("Conn Error");
        } finally {
            if (!status.includes("Error")) setStatus("Listening...");
        }
    };

    const detectVoiceActivity = () => {
        if (!analyserRef.current || !listening) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkVolume = () => {
            // Stop loop if stopped listening or if context is suspended
            if (!listening || !analyserRef.current) return;

            // Auto-resume if suspended (important for long-running mobile apps)
            if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                audioContextRef.current.resume();
            }

            analyserRef.current.getByteFrequencyData(dataArray);

            let sum = 0;
            for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
            const average = sum / bufferLength;

            // Update Visualizer
            setAudioLevel(average);

            const SPEECH_THRESHOLD = 2; // Even more sensitive for hospitals
            const SILENCE_DURATION = 1500; // 1.5s for more natural pauses

            // We detect speech
            if (average > SPEECH_THRESHOLD && !isSystemSpeaking) {
                if (!isRecordingRef.current) {
                    console.log("Speech Started...");
                    setStatus("Recording...");
                    isRecordingRef.current = true;
                    chunksRef.current = [];
                    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "inactive") {
                        try {
                            mediaRecorderRef.current.start();
                        } catch (e) {
                            console.error("Failed to start recorder:", e);
                        }
                    }
                }

                // Any speech resets the silence timer
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

                // Start silence timer to finalize chunk
                silenceTimerRef.current = setTimeout(() => {
                    if (isRecordingRef.current) {
                        finalizeRecording();
                    }
                }, SILENCE_DURATION);
            }

            requestAnimationFrame(checkVolume);
        };
        checkVolume();
    };

    const finalizeRecording = () => {
        if (!isRecordingRef.current) return;
        console.log("Finalizing Recording...");
        setStatus("Processing...");
        isRecordingRef.current = false;
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            try {
                mediaRecorderRef.current.stop();
            } catch (e) {
                console.error("Failed to stop recorder:", e);
            }
        }
    };

    const startListening = async () => {
        if (listening) return;
        setListening(true);
        setStatus("Starting...");

        try {
            // Ensure context is running (fixes "suspended" state in some browsers)
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioContextClass();
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }
            audioContextRef.current = ctx;

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 512;
            source.connect(analyser);
            analyserRef.current = analyser;

            // Determine supported mime type
            let mimeType = 'audio/webm';
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                mimeType = 'audio/webm;codecs=opus';
            } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                mimeType = 'audio/mp4'; // Safari fallback
            }

            console.log(`Using MimeType: ${mimeType}`);

            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const currentMime = mediaRecorderRef.current?.mimeType || mimeType;
                sendAudioToServer(currentMime);
            };

            mediaRecorderRef.current.onerror = (e) => {
                console.error("MediaRecorder Error:", e);
                // Attempt to restart if it dies
                setTimeout(() => {
                    if (listening) startListening();
                }, 1000);
            };

            setStatus("Listening...");
            detectVoiceActivity();
        } catch (err) {
            console.error("Mic Error:", err);
            setStatus("Mic Error: " + err.message);
            speak("Microphone error. Please allow access.");
        }
    };

    // MANUAL CONTROLS FOR PRESENTATION
    const startManualRecord = () => {
        if (!mediaRecorderRef.current || isRecordingRef.current) return;
        isRecordingRef.current = true;
        chunksRef.current = [];
        mediaRecorderRef.current.start();
        setStatus("Recording (Manual)...");
    };

    const stopManualRecord = () => {
        if (!mediaRecorderRef.current || !isRecordingRef.current) return;
        isRecordingRef.current = false;
        mediaRecorderRef.current.stop();
        setStatus("Processing...");
    };

    const stopListening = () => {
        setListening(false);
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        if (audioContextRef.current) audioContextRef.current.close();
        setStatus("Stopped");
    };

    const resetTranscript = () => setTranscript('');

    // Safety: Ensure voices are loaded (browsers load them async)
    useEffect(() => {
        window.speechSynthesis.getVoices();
    }, []);

    useEffect(() => {
        return () => stopListening();
    }, []);

    return (
        <VoiceContext.Provider value={{
            speak,
            startListening,
            stopListening,
            listening,
            transcript,
            resetTranscript,
            status,
            audioLevel,
            lastLocation,
            setLastLocation,
            startManualRecord,
            stopManualRecord
        }}>
            {children}
        </VoiceContext.Provider>
    );
};
