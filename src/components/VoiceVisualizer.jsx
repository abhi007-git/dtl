import React, { useEffect, useState } from 'react';
import { useVoice } from '../context/VoiceContext';

const VoiceVisualizer = () => {
    const { listening, transcript, status, audioLevel } = useVoice();
    const [bars, setBars] = useState([20, 20, 20, 20, 20]);

    useEffect(() => {
        if (!listening) {
            setBars([10, 10, 10, 10, 10]);
            return;
        }

        // Dynamic bars based on real audio level
        const multiplier = Math.min(audioLevel / 5, 3); // Scale factor
        const newBars = bars.map(() => Math.max(10, Math.random() * 20 * multiplier + 10));
        setBars(newBars);

    }, [audioLevel, listening]);

    const styles = {
        container: {
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '20px',
            background: 'linear-gradient(to top, #000 0%, transparent 100%)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            pointerEvents: 'none'
        },
        transcript: {
            marginBottom: '10px',
            color: '#fff',
            fontSize: '1.2rem',
            background: 'rgba(0,0,0,0.7)',
            padding: '10px 20px',
            borderRadius: '10px',
            fontFamily: 'monospace',
            textAlign: 'center',
            maxWidth: '80%'
        },
        status: {
            color: status === 'Recording...' ? '#ff4444' : '#00ff9d',
            marginBottom: '10px',
            fontSize: '1rem',
            fontWeight: 'bold',
            textTransform: 'uppercase'
        },
        visualizer: {
            display: 'flex',
            gap: '10px',
            height: '60px',
            alignItems: 'flex-end'
        },
        bar: {
            width: '15px',
            background: status === 'Recording...' ? '#ff4444' : (listening ? '#00ff9d' : '#333'),
            borderRadius: '10px',
            transition: 'height 0.1s ease, background 0.3s ease'
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.status}>{status}</div>

            {transcript && (
                <div style={styles.transcript}>
                    "{transcript}"
                </div>
            )}

            <div style={styles.visualizer}>
                {bars.map((height, i) => (
                    <div
                        key={i}
                        style={{ ...styles.bar, height: `${height}px` }}
                    />
                ))}
            </div>
        </div>
    );
};

export default VoiceVisualizer;
