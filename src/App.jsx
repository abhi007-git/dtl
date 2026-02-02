import React, { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useVoice } from './context/VoiceContext';
import VoiceVisualizer from './components/VoiceVisualizer';

// Placeholder Pages
import Home from './pages/Home';
import VoiceForm from './pages/VoiceForm';
import QueueStatus from './pages/QueueStatus';
import QRNavigation from './pages/QRNavigation';
import SignReader from './pages/SignReader';

const App = () => {
  const { transcript, resetTranscript, speak, startListening, lastLocation } = useVoice();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasInteracted, setHasInteracted] = React.useState(false);

  const [emergency, setEmergency] = React.useState(false);

  useEffect(() => {
    // Basic Global Navigation Commands
    const lower = transcript.toLowerCase();

    // EMERGENCY / HELP COMMAND
    if (lower.includes('help') || lower.includes('emergency') || lower.includes('medical alert')) {
      resetTranscript();
      setEmergency(true);

      const locMessage = lastLocation !== "Unknown Location"
        ? ` You are near the ${lastLocation}.`
        : " Location tracking is active.";

      speak("Emergency Alert Activated. Assistance has been notified." + locMessage + " Please stay where you are. I am alerting the medical staff.");

      // Stop emergency after 20 seconds or via "stop"
      setTimeout(() => setEmergency(false), 20000);
      return;
    }

    // GLOBAL STOP COMMAND
    if (lower.includes('stop') || lower.includes('cancel') || lower.includes('exit')) {
      resetTranscript();
      if (emergency) {
        setEmergency(false);
        speak("Emergency Alert Cancelled. Resetting to main menu.");
      } else {
        speak("Stopping current action. Returning to main menu.");
      }
      navigate('/');
      return;
    }

    if (lower.includes('go to form') || lower.includes('open form')) {
      resetTranscript();
      speak("Opening Voice Form");
      navigate('/form');
    } else if (lower.includes('go to token') || lower.includes('queue status')) {
      resetTranscript();
      speak("Opening Token System");
      navigate('/queue');
    } else if (lower.includes('go to map') || lower.includes('navigation') || lower.includes('open map')) {
      resetTranscript();
      speak("Opening Navigation System");
      navigate('/qr');
    } else if (lower.includes('read sign') || lower.includes('open reader')) {
      resetTranscript();
      speak("Opening Sign Reader");
      navigate('/signs');
    } else if (lower.includes('go home') || lower.includes('main menu') || lower.includes('go to home')) {
      resetTranscript();
      speak("Going to Main Menu");
      navigate('/');
    }
  }, [transcript, navigate, resetTranscript, speak]);

  const handleInitialInteraction = () => {
    startListening();
    setHasInteracted(true);
    // Play a silent sound or speak to unlock AudioContext
    const audio = new Audio();
    audio.play().catch(() => { });
    speak("Voice Assistant Active.");
  };

  return (
    <div className={`app-container ${emergency ? 'emergency-mode' : ''}`}>
      {emergency && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10001,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,0,0,0.9)', color: 'white',
          fontSize: '2rem', fontWeight: 'bold', textAlign: 'center', padding: '20px'
        }}>
          <h1 style={{ fontSize: '4rem', marginBottom: '20px' }}>⚠️ HELP ⚠️</h1>
          <p>ASSISTANCE REQUESTED</p>
          <p style={{ fontSize: '1rem', marginTop: '20px' }}>Staff has been notified of your location.</p>
          <button
            onClick={() => { setEmergency(false); speak("Alert cancelled."); }}
            className="hc-button"
            style={{ marginTop: '40px', background: 'white', color: 'red', borderColor: 'white' }}
          >
            Cancel Alert
          </button>
        </div>
      )}

      {!hasInteracted ? (
        <div
          onClick={handleInitialInteraction}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.95)', color: '#ffffff',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            textAlign: 'center', padding: '20px',
            touchAction: 'manipulation',
            userSelect: 'none'
          }}
        >
          <div style={{ fontSize: '5rem', marginBottom: '20px' }}>👆</div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '15px', fontWeight: 'bold' }}>Tap to Activate Assistant</h1>
          <p style={{ fontSize: '1.2rem', opacity: 0.8 }}>
            Specialized Hospital Assistant<br />
            <span style={{ fontSize: '0.9rem', marginTop: '10px', display: 'block' }}>(Voice & Vision Ready)</span>
          </p>
        </div>
      ) : null}

      <div style={{ paddingBottom: '100px' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/form" element={<VoiceForm />} />
          <Route path="/queue" element={<QueueStatus />} />
          <Route path="/qr" element={<QRNavigation />} />
          <Route path="/signs" element={<SignReader />} />
        </Routes>
      </div>

      <VoiceVisualizer />
    </div>
  );
}

export default App;
