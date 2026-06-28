import { useDispatch, useSelector } from "react-redux";
import {
  setBallCount,
  setGravity,
  setMasses,
  setLengths,
  setRestitution,
  setDampingEnabled,
  setDamping,
  setTimeScale,
  setLiftedBalls,
  resetSimulation,
  stopSimulation
} from "../store/simulationSlice";
import {
  Settings,
  RefreshCw,
  Globe,
  Moon,
  Zap,
  Timer,
  Weight,
  Waves,
  Layers,
  Square,
  Ruler,
  Dna
} from "lucide-react";

const ControlPanel = () => {
  const dispatch = useDispatch();
  const config = useSelector(state => state.simulation);

  const presets = [
    { name: "Moon", value: 1.62, icon: <Moon size={14} /> },
    { name: "Earth", value: 9.81, icon: <Globe size={14} /> },
    { name: "Jupiter", value: 24.79, icon: <Zap size={14} /> }
  ];

  return (
    <div className="absolute top-4 right-4 w-80 bg-black/70 backdrop-blur-xl text-white p-6 rounded-3xl border border-white/10 shadow-2xl flex flex-col gap-5 select-none pointer-events-auto max-h-[90vh] overflow-y-auto scrollbar-hide">
      <div className="flex items-center gap-2 border-b border-white/10 pb-4">
        <Settings size={20} className="text-blue-400 animate-spin-slow" />
        <h2 className="text-xl font-bold tracking-tight">
          Simulation Settings
        </h2>
      </div>

      {/* Ball Count */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs text-gray-400 font-medium">
          <span className="flex items-center gap-1.5">
            <Layers size={14} /> Ball Count
          </span>
          <span className="text-blue-400 font-mono">{config.ballCount}</span>
        </div>
        <input
          type="range"
          min="3"
          max="9"
          step="1"
          value={config.ballCount}
          onChange={e => dispatch(setBallCount(Number(e.target.value)))}
          className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      {/* String Lengths (Per Ball) */}
      <div className="flex flex-col gap-3 border-b border-white/5 pb-3">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
          <Ruler size={14} /> String Lengths
        </div>

        {/* رسم شريط تمرير لكل كرة بناءً على العدد الحالي */}
        {config.lengths.slice(0, config.ballCount).map((length, index) => (
          <div key={index} className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] text-gray-500 font-medium">
              <span>Ball {index + 1}</span>
              <span className="text-blue-400 font-mono">
                {length.toFixed(1)}m
              </span>
            </div>
            <input
              type="range"
              min="2.0"
              max="8.0"
              step="0.1"
              value={length}
              onChange={e => {
                // نأخذ نسخة من المصفوفة، نعدل طول الكرة المحددة، ثم نرسل المصفوفة الجديدة
                const newLengths = [...config.lengths];
                newLengths[index] = Number(e.target.value);
                dispatch(setLengths(newLengths));
              }}
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        ))}
      </div>

      {/* Lifted Balls */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs text-gray-400 font-medium">
          <span className="flex items-center gap-1.5">
            <RefreshCw size={14} /> Lifted Balls
          </span>
          <span className="text-blue-400 font-mono">{config.liftedBalls}</span>
        </div>
        <input
          type="range"
          min="1"
          max={config.ballCount - 1}
          step="1"
          value={config.liftedBalls}
          onChange={e => dispatch(setLiftedBalls(Number(e.target.value)))}
          className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      {/* Time Scale */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs text-gray-400 font-medium">
          <span className="flex items-center gap-1.5">
            <Timer size={14} /> Time Speed
          </span>
          <span className="text-blue-400 font-mono">
            {config.timeScale.toFixed(1)}x
          </span>
        </div>
        <input
          type="range"
          min="0.1"
          max="1.0"
          step="0.1"
          value={config.timeScale}
          onChange={e => dispatch(setTimeScale(Number(e.target.value)))}
          className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      {/* Ball Masses */}
      <div className="flex flex-col gap-3 border-b border-white/5 pb-3">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
          <Weight size={14} /> Ball Masses
        </div>

        {config.masses.slice(0, config.ballCount).map((mass, index) => (
          <div key={index} className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] text-gray-500 font-medium">
              <span>Ball {index + 1}</span>
              <span className="text-blue-400 font-mono">
                {mass.toFixed(1)} kg
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="5.0"
              step="0.1"
              value={mass}
              onChange={e => {
                const newMasses = [...config.masses];
                newMasses[index] = Number(e.target.value);
                dispatch(setMasses(newMasses));
              }}
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        ))}
      </div>

      {/* Gravity */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs text-gray-400 font-medium">
          <span className="flex items-center gap-1.5">
            <Globe size={14} /> Gravity (m/s²)
          </span>
          <span className="text-blue-400 font-mono">
            {config.gravity.toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="25"
          step="0.1"
          value={config.gravity}
          onChange={e => dispatch(setGravity(Number(e.target.value)))}
          className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <div className="flex gap-2 mt-1">
          {presets.map(p => (
            <button
              key={p.name}
              onClick={() => dispatch(setGravity(p.value))}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-[10px] transition-all font-semibold ${
                Math.abs(config.gravity - p.value) < 0.1
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}>
              {p.icon} {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Restitution */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs text-gray-400 font-medium">
          <span className="flex items-center gap-1.5">
            <Dna size={14} /> Restitution (Elasticity)
          </span>
          <span className="text-blue-400 font-mono">
            {config.restitution.toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min="0.5"
          max="1.0"
          step="0.01"
          value={config.restitution}
          onChange={e => dispatch(setRestitution(Number(e.target.value)))}
          className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      {/* Air Resistance */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs text-gray-400 font-medium">
          <span className="flex items-center gap-1.5">
            <Waves size={14} /> Air Resistance
          </span>
          <span className="text-blue-400 font-mono">
            {config.damping.toFixed(3)}
          </span>
        </div>
        <input
          type="range"
          min="0.01" /* تم التعديل هنا (كان 0.0001) */
          max="0.50" /* تم التعديل هنا (كان 0.005) */
          step="0.01" /* تم التعديل هنا */
          value={config.damping}
          onChange={e => dispatch(setDamping(Number(e.target.value)))}
          className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      {/* Damping Toggle */}
      <div className="flex items-center justify-between py-2 border-t border-white/5 mt-1">
        <span className="text-xs text-gray-400 font-medium">
          Enable Physics Damping
        </span>
        <button
          onClick={() => dispatch(setDampingEnabled(!config.isDampingEnabled))}
          className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
            config.isDampingEnabled ? "bg-blue-600" : "bg-gray-700"
          }`}>
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
              config.isDampingEnabled ? "translate-x-5.5" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="flex gap-3 mt-2">
        {/* Reset */}
        <button
          onClick={() => dispatch(resetSimulation())}
          className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl shadow-blue-900/20 group">
          <RefreshCw
            size={18}
            className="group-active:rotate-180 transition-transform duration-500"
          />
          Reset
        </button>

        {/* Stop */}
        <button
          onClick={() => dispatch(stopSimulation())}
          className="flex-1 py-3.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 group">
          <Square size={18} />
          Stop
        </button>
      </div>

      <div className="text-[9px] text-gray-500 text-center uppercase tracking-widest pt-3 border-t border-white/5 opacity-50">
        Newton's Cradle • Engine v2.0
      </div>
    </div>
  );
};

export default ControlPanel;
