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
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.name.includes("US English") || v.name.includes("Samantha"));
        if (preferredVoice) utterance.voice = preferredVoice;
        utterance.rate = 1.0;
        utterance.onend = () => {
            setIsSystemSpeaking(false);
        };
        window.speechSynthesis.speak(utterance);
    };

    const sendAudioToServer = async (mimeType = 'audio/webm') => {
        try {
            const blob = new Blob(chunksRef.current, { type: mimeType });
            // Very small files are probably noise
            if (blob.size < 1000) return;

            const formData = new FormData();
            // Use correct extension for backend MIME sniffing if possible, though backend detects content
            const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
            formData.append('audio', blob, `command.${ext}`);

            const response = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();

            if (data.text) {
                console.log("Server Transcript:", data.text);
                setTranscript(data.text);
            }
        } catch (e) {
            console.error("Transcription Failed", e);
        } finally {
            setStatus("Listening...");
        }
    };

    const detectVoiceActivity = () => {
        if (!analyserRef.current || !listening) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkVolume = () => {
            // Stop loop if stopped listening
            if (!listening || !analyserRef.current) return;

            analyserRef.current.getByteFrequencyData(dataArray);

            let sum = 0;
            for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
            const average = sum / bufferLength;

            // Update Visualizer
            setAudioLevel(average);

            const SPEECH_THRESHOLD = 5; // Lowered from 20 to 5 for better sensitivity
            const SILENCE_DURATION = 1500;

            // Only record if system isn't speaking (to avoid self-trigger)
            if (average > SPEECH_THRESHOLD && !isSystemSpeaking) {
                if (!isRecordingRef.current) {
                    console.log("Speech Detected - Recording...");
                    setStatus("Recording...");
                    isRecordingRef.current = true;
                    chunksRef.current = [];
                    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "inactive") {
                        mediaRecorderRef.current.start();
                    }
                }

                // Reset silence timer on speech
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

                // Set silence timer to stop recording
                silenceTimerRef.current = setTimeout(() => {
                    if (isRecordingRef.current) {
                        console.log("Silence Detected - Stopping...");
                        setStatus("Processing...");
                        isRecordingRef.current = false;
                        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                            mediaRecorderRef.current.stop();
                        }
                    }
                }, SILENCE_DURATION);
            }

            requestAnimationFrame(checkVolume);
        };
        checkVolume();
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

            // Pass the mimeType to the sender so it prepares the Blob correctly
            mediaRecorderRef.current.onstop = () => sendAudioToServer(mimeType);

            setStatus("Listening...");
            // Start logic
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

    // Trigger detect loop when listening state changes
    useEffect(() => {
        if (listening && analyserRef.current) {
            detectVoiceActivity();
        }
    }, [listening]);

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
            startManualRecord,
            stopManualRecord
        }}>
            {children}
        </VoiceContext.Provider>
    );
};
