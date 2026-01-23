import React, { useState, useEffect } from 'react';
import { useVoice } from '../context/VoiceContext';

const QueueStatus = () => {
    const { speak, transcript, resetTranscript } = useVoice();
    const lastCommandTime = React.useRef(0);

    const [currentToken, setCurrentToken] = useState(100);
    const [userToken, setUserToken] = useState(null);

    useEffect(() => {
        speak("Queue System Active. Current token is " + currentToken);
    }, []);

    // Check valid voice commands for queue
    useEffect(() => {
        const cmd = transcript.toLowerCase();

        // Admin commands via voice too? strictly admin interface says "admin easily increments"
        // User says "My token is X"
        if (cmd.includes('my token is')) {
            const match = cmd.match(/(\d+)/);
            if (match) {
                const token = parseInt(match[0]);
                setUserToken(token);
                speak(`Registered. Your token is ${token}. We will notify you.`);
                resetTranscript();
            }
        }

        // Admin voice simulation
        if (cmd.includes('next token')) {
            const now = Date.now();
            if (now - lastCommandTime.current > 2000) {
                incrementToken();
                lastCommandTime.current = now;
            }
            resetTranscript();
        }
    }, [transcript]);

    // Alert when match or missed
    useEffect(() => {
        if (!userToken) return;

        if (currentToken === userToken) {
            speak(`Attention please. Token number ${userToken}. It is your turn.`);
        } else if (currentToken > userToken) {
            // Only announce missed if it JUST happened or maybe just once?
            // Actually, if we are on the page, and the admin clicks next 5 times, 
            // the user might want to know they definitely missed it.
            // But saying it every single increment after might be annoying.
            // Let's just say it. The user will likely leave or reset.
            speak(`Alert. Token ${userToken} has passed. You have missed your turn.`);
        }
    }, [currentToken, userToken]);

    const incrementToken = () => {
        const next = currentToken + 1;
        setCurrentToken(next);
        // Simplified announcement as requested
        speak(`Token number ${next}.`);
    };

    return (
        <div className="container">
            <div className="grid md:grid-cols-2 gap-8">

                {/* User Interface */}
                <div className="card border-accent-secondary">
                    <h2 className="text-accent-secondary mb-4">User Status</h2>
                    <div className="text-center">
                        <p className="mb-2">Your Token</p>
                        <div className="text-6xl font-bold mb-4">{userToken || "--"}</div>

                        <p className="text-sm">Say: "My token is 105"</p>

                        {userToken && (
                            <div className="mt-4 p-4 bg-gray-800 rounded">
                                {userToken > currentToken ? (
                                    <p>Wait for {userToken - currentToken} people.</p>
                                ) : userToken === currentToken ? (
                                    <p className="text-green-400 font-bold animate-pulse">YOUR TURN!</p>
                                ) : (
                                    <p className="text-red-400">Missed it.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Admin Interface */}
                <div className="card border-accent-primary">
                    <h2 className="text-accent-primary mb-4">Admin Control</h2>
                    <div className="text-center">
                        <p className="mb-2">Current Serving</p>
                        <div className="text-8xl font-bold mb-8 text-white">{currentToken}</div>

                        <button
                            onClick={incrementToken}
                            className="hc-button w-full justify-center"
                        >
                            Next Token 🔔
                        </button>
                        <p className="mt-4 text-sm text-gray-500">Or say "Next Token"</p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default QueueStatus;
