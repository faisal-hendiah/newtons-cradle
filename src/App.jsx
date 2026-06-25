import React from 'react';
import Scene from './components/Scene';
import ControlPanel from './components/ControlPanel';

function App() {
  const [audioUnlocked, setAudioUnlocked] = React.useState(false);

  const unlockAudio = () => {
    if (!audioUnlocked) {
      // Create a dummy sound and play it to unlock audio on mobile/browsers
      const context = new (window.AudioContext || window.webkitAudioContext)();
      if (context.state === 'suspended') {
        context.resume();
      }
      setAudioUnlocked(true);
    }
  };

  return (
    <div 
      className="relative w-full h-screen bg-[#050505] overflow-hidden"
      onPointerDown={unlockAudio}
    >
      {/* Background UI */}
      <div className="absolute top-8 left-8 z-10 pointer-events-none">
        <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">
          Newton's <span className="text-blue-500">Cradle</span>
        </h1>
        <p className="text-gray-500 text-sm mt-1 tracking-widest uppercase">
          Precision Physics Simulation
        </p>
      </div>

      {/* Main 3D Scene */}
      <div className="w-full h-full">
        <Scene />
      </div>

      {/* Controls Overlay */}
      <ControlPanel />

      {/* Hint Overlay */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-gray-500 text-[10px] tracking-[0.2em] uppercase pointer-events-none">
        Use Mouse to Rotate • Scroll to Zoom • Drag to Interact
      </div>
    </div>
  );
}

export default App;
