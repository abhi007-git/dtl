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

    // A helper to play short UI sounds for accessibility feedback
    const playUISound = React.useCallback((freq, duration) => {
        try {
            if (!audioContextRef.current) return;
            const osc = audioContextRef.current.createOscillator();
            const gain = audioContextRef.current.createGain();
            osc.connect(gain);
            gain.connect(audioContextRef.current.destination);
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioContextRef.current.currentTime + duration);
            osc.start();
            osc.stop(audioContextRef.current.currentTime + duration);
        } catch (e) { console.warn("UI Sound failed", e); }
    }, []);

    // Speak function - Memoized to prevent infinite re-renders in App.jsx
    const speak = React.useCallback((text) => {
        if (!text) return;
        setIsSystemSpeaking(true);
        window.speechSynthesis.cancel();

        const safetyTimer = setTimeout(() => {
            console.log("Forcing Speech Reset");
            setIsSystemSpeaking(false);
        }, 12000);

        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.lang.startsWith("en-") && (v.name.includes("US") || v.name.includes("Google")));
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onend = () => {
            clearTimeout(safetyTimer);
            setTimeout(() => setIsSystemSpeaking(false), 800);
        };
        utterance.onerror = () => {
            clearTimeout(safetyTimer);
            setIsSystemSpeaking(false);
        };
        window.speechSynthesis.speak(utterance);
    }, []);

    const sendAudioToServer = async (mimeType = 'audio/webm', audioChunks) => {
        try {
            const blob = new Blob(audioChunks, { type: mimeType });
            console.log(`Sending Audio: ${blob.size} bytes, Type: ${mimeType}`);

            if (blob.size < 500) { // Slightly higher threshold to ignore noise
                console.log("Audio too small, ignoring.");
                return;
            }

            const formData = new FormData();
            const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
            formData.append('audio', blob, `command.${ext}`);

            setStatus("Analyzing...");
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

    const finalizeRecording = React.useCallback(() => {
        if (!isRecordingRef.current) return;
        console.log("Finalizing Recording...");
        setStatus("Processing...");
        isRecordingRef.current = false;
        playUISound(440, 0.15); // Clear Stop Beep
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            try {
                mediaRecorderRef.current.stop();
            } catch (e) {
                console.error("Failed to stop recorder:", e);
            }
        }
    }, [playUISound]);

    const detectVoiceActivity = React.useCallback(() => {
        if (!analyserRef.current || !listening) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkVolume = () => {
            if (!listening || !analyserRef.current) return;

            if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                audioContextRef.current.resume().catch(() => { });
            }

            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
            const average = sum / bufferLength;
            setAudioLevel(average);

            const SPEECH_THRESHOLD = 1.0; // Optimized for hospital hallways
            const SILENCE_DURATION = 1500;

            if (average < 0.01 && listening) {
                if (!window.micDeadCheck) window.micDeadCheck = Date.now();
                if (Date.now() - window.micDeadCheck > 10000) {
                    console.log("Hardware unresponsive, rebooting...");
                    window.micDeadCheck = null;
                    startListening();
                    return;
                }
            } else {
                window.micDeadCheck = Date.now();
            }

            if (average > SPEECH_THRESHOLD && !isSystemSpeaking) {
                if (!isRecordingRef.current) {
                    console.log("Wake Started");
                    isRecordingRef.current = true;
                    chunksRef.current = [];
                    setStatus("Recording...");
                    playUISound(880, 0.15); // Clear Start Beep
                    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "inactive") {
                        try { mediaRecorderRef.current.start(); } catch (e) { isRecordingRef.current = false; }
                    }
                }

                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = setTimeout(() => {
                    if (isRecordingRef.current) finalizeRecording();
                }, SILENCE_DURATION);
            }

            requestAnimationFrame(checkVolume);
        };
        checkVolume();
    }, [listening, isSystemSpeaking, finalizeRecording, playUISound]);

    const startListening = React.useCallback(async () => {
        if (listening) return;
        setListening(true);
        setStatus("Starting...");

        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioContextClass();
            audioContextRef.current = ctx;
            if (ctx.state === 'suspended') await ctx.resume();

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 512;
            source.connect(analyser);
            analyserRef.current = analyser;

            let mimeType = 'audio/webm';
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                mimeType = 'audio/webm;codecs=opus';
            } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                mimeType = 'audio/mp4';
            }

            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const capturedChunks = [...chunksRef.current];
                chunksRef.current = [];
                sendAudioToServer(mimeType, capturedChunks);
            };

            if ('wakeLock' in navigator) {
                try { await navigator.wakeLock.request('screen'); } catch (e) { }
            }

            setStatus("Listening...");
            // detectVoiceActivity() will be triggered by the useEffect
        } catch (err) {
            console.error("Mic Error:", err);
            setStatus("Mic Error");
            setListening(false);
            speak("Microphone access denied.");
        }
    }, [listening, speak]);

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

    const stopListening = React.useCallback(() => {
        setListening(false);
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        if (audioContextRef.current) audioContextRef.current.close().catch(() => { });
        setStatus("Stopped");
    }, []);

    const resetTranscript = React.useCallback(() => setTranscript(''), []);

    // Persistence Effect: Keep loop alive
    useEffect(() => {
        if (listening && analyserRef.current) {
            detectVoiceActivity();
        }
    }, [listening]);

    useEffect(() => {
        window.speechSynthesis.getVoices();
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
