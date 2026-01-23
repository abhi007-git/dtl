import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVoice } from '../context/VoiceContext';

const steps = [
    { id: 'name', question: "What is your full name?" },
    { id: 'age', question: "How old are you?" },
    { id: 'contact', question: "Please say your contact number." }
];

const VoiceForm = () => {
    const { speak, transcript, resetTranscript } = useVoice();
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState({});
    const [confirming, setConfirming] = useState(false);
    const [tempValue, setTempValue] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Timer to detect silence
    const silenceTimer = useRef(null);

    // Initial welcome
    useEffect(() => {
        speak("Opening Form. " + steps[0].question);
        resetTranscript();
    }, []);

    // Handle Transcript updates
    useEffect(() => {
        if (isProcessing) return; // Don't process if already doing something
        if (!transcript) return;

        // reset timer on every change
        if (silenceTimer.current) clearTimeout(silenceTimer.current);

        silenceTimer.current = setTimeout(() => {
            handleInput(transcript);
        }, 2000); // 2 seconds silence to trigger

        return () => {
            if (silenceTimer.current) clearTimeout(silenceTimer.current);
        }
    }, [transcript]);

    const handleInput = (text) => {
        if (!text) return;

        // Cleaning helper
        const clean = (t) => t.toLowerCase().replace(/[^a-z0-9]/g, '');

        // Anti-echo: If the input is just the question echoed back, ignore it.
        const currentQ = clean(steps[currentStep].question);
        const inputClean = clean(text);

        if (inputClean.includes(currentQ) || (inputClean.length > 5 && currentQ.includes(inputClean))) {
            console.log("Ignored potential echo:", text);
            resetTranscript();
            return;
        }

        // Anti-echo for Confirmation phase
        if (inputClean.includes('yesorno') || inputClean.includes('sayyes') || inputClean.includes('isthiscorrect')) {
            console.log("Ignored prompt echo:", text);
            resetTranscript();
            return;
        }

        setIsProcessing(true);
        console.log("Processing input:", text);

        // Improved Strict Matching Helper that handles punctuation
        const isAffirmative = (t) => {
            // Remove all non-alphanumeric chars for checking
            const cleaned = t.toLowerCase().replace(/[^a-z]/g, '');
            return cleaned === 'yes' || cleaned === 'correct' || cleaned === 'yeah' || cleaned === 'yep';
        };

        const isNegative = (t) => {
            const cleaned = t.toLowerCase().replace(/[^a-z]/g, '');
            return cleaned === 'no' || cleaned === 'nope' || cleaned === 'nah' || cleaned === 'wrong';
        };

        if (confirming) {
            if (isAffirmative(text)) {
                // Save and Next
                const newData = { ...formData, [steps[currentStep].id]: tempValue };
                setFormData(newData);

                // CRITICAL: Reset transcript BEFORE moving next to prevent bleeding
                resetTranscript();

                if (currentStep < steps.length - 1) {
                    const nextStep = currentStep + 1;
                    setCurrentStep(nextStep);
                    setConfirming(false);
                    setTempValue('');
                    speak("Saved. " + steps[nextStep].question);
                } else {
                    speak("Form completed. Submitting data. Thank you.");
                    console.log("Submitted:", newData);

                    // Navigate back to home after a short delay to allow speech to finish
                    setTimeout(() => {
                        navigate('/');
                    }, 4000);
                }
            } else if (isNegative(text)) {
                // Retry
                resetTranscript();
                setConfirming(false);
                setTempValue('');
                speak("Let's try again. " + steps[currentStep].question);
            } else {
                // Ambiguous input during confirmation - ignore or re-ask?
                // Better to just wait for a clear Yes/No. 
                // We ask again to clarify.
                resetTranscript();
                speak("Please say just Yes or No.");
            }
        } else {
            // Capture value
            setTempValue(text);
            setConfirming(true);
            resetTranscript();

            // Speak back logic
            let speakValue = text;
            if (steps[currentStep].id === 'contact') {
                // Read digits individually for contact
                speakValue = text.split('').join(' ');
            }

            speak(`You said ${speakValue}. Is this correct? Say Yes or No.`);
        }

        setIsProcessing(false);
    };

    return (
        <div className="container">
            <h1 className="hc-text mb-8">Voice Form Filling</h1>

            <div className="grid gap-4">
                {steps.map((step, index) => (
                    <div key={step.id} className={`card ${index === currentStep ? 'voice-active border-accent-primary' : 'opacity-50'}`}>
                        <h3 className="text-xl mb-2">{step.question}</h3>
                        <div className="text-2xl font-bold text-accent-secondary">
                            {formData[step.id] || (index === currentStep ? (confirming ? `Confirming: "${tempValue}"` : "Listening...") : "Pending")}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-8 text-center text-gray-400">
                Tip: Determine your answer, speak clearly, then wait 2 seconds.
            </div>
        </div>
    );
};

export default VoiceForm;
