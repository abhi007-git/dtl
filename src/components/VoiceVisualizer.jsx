import React, { useEffect, useState } from 'react';
import { useVoice } from '../context/VoiceContext';

const VoiceVisualizer = () => {
    const { listening, transcript, status, audioLevel, startManualRecord, stopManualRecord } = useVoice();
    const [bars, setBars] = useState([20, 20, 20, 20, 20]);
    const [isManual, setIsManual] = useState(false);

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

    const handleTouchStart = (e) => {
        e.preventDefault(); // Prevent ghost clicks
        setIsManual(true);
        startManualRecord();
    };

    const handleTouchEnd = (e) => {
        e.preventDefault();
        setIsManual(false);
        stopManualRecord();
    };

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
            pointerEvents: 'auto' // Re-enable pointer events for button
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
            maxWidth: '80%',
            pointerEvents: 'none'
        },
        status: {
            color: status.includes('Recording') ? '#ff4444' : '#00ff9d',
            marginBottom: '10px',
            fontSize: '1rem',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            pointerEvents: 'none'
        },
        visualizer: {
            display: 'flex',
            gap: '10px',
            height: '60px',
            alignItems: 'flex-end',
            marginBottom: '15px',
            pointerEvents: 'none'
        },
        bar: {
            width: '15px',
            background: status.includes('Recording') ? '#ff4444' : (listening ? '#00ff9d' : '#333'),
            borderRadius: '10px',
            transition: 'height 0.1s ease, background 0.3s ease'
        },
        micBtn: {
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: isManual ? '#ff4444' : 'rgba(255,255,255,0.2)',
            border: '2px solid white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: isManual ? '0 0 20px #ff4444' : 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            touchAction: 'none' // Important for preventing scroll while holding
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.status}>{status} (Vol: {Math.round(audioLevel)})</div>

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

            <div
                style={styles.micBtn}
                onMouseDown={handleTouchStart}
                onMouseUp={handleTouchEnd}
                onMouseLeave={handleTouchEnd}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                🎙️
            </div>
            <div style={{ color: '#aaa', fontSize: '0.8rem', marginTop: '10px' }}>Hold to Speak</div>
        </div>
    );
};

export default VoiceVisualizer;
