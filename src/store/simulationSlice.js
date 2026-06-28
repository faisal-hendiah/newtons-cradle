import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  is3DMode: false, // false = 2D Mode, true = 3D Mode
  ballCount: 5,
  gravity: 9.81,
  mass: 1.0,
  lengths: [5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0],
  masses: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
  restitution: 0.99,
  isDampingEnabled: true,
  damping: 0.001,      // Air resistance strength slider
  ballRadius: 0.5,
  timeScale: 1.0,      // Time dilation scale
  liftedBalls: 1,      // Number of balls initially lifted
  resetVersion: 0,
  stopVersion: 0,
};

export const simulationSlice = createSlice({
  name: 'simulation',
  initialState,
  reducers: {
    set3DMode: (state, action) => {
      state.is3DMode = action.payload;
      state.resetVersion += 1; // إعادة تهيئة النظام عند تغيير النمط
    },
    setBallCount: (state, action) => {
      state.ballCount = action.payload;
      // Ensure liftedBalls doesn't exceed new ballCount - 1
      if (state.liftedBalls >= state.ballCount) {
        state.liftedBalls = Math.max(1, state.ballCount - 1);
      }
      state.resetVersion += 1;
    },
    setGravity: (state, action) => {
      state.gravity = action.payload;
    },
    setMass: (state, action) => {
      state.mass = action.payload;
      state.masses = state.masses.map(() => action.payload);
      state.resetVersion += 1; // Re-init engine to apply mass
    },
    setMasses: (state, action) => {
      state.masses = action.payload;
      state.resetVersion += 1;
    },
    setLengths: (state, action) => {
      state.lengths = action.payload;
      state.resetVersion += 1;
    },
    setRestitution: (state, action) => {
      state.restitution = action.payload;
    },
    setDampingEnabled: (state, action) => {
      state.isDampingEnabled = action.payload;
    },
    setDamping: (state, action) => {
      state.damping = action.payload;
    },
    setTimeScale: (state, action) => {
      state.timeScale = action.payload;
    },
    setLiftedBalls: (state, action) => {
      state.liftedBalls = action.payload;
      state.resetVersion += 1;
    },
    resetSimulation: (state) => {
      state.ballCount = initialState.ballCount;
      state.gravity = initialState.gravity;
      state.mass = initialState.mass;
      state.lengths = [...initialState.lengths];
      state.masses = [...initialState.masses];
      state.restitution = initialState.restitution;
      state.isDampingEnabled = initialState.isDampingEnabled;
      state.damping = initialState.damping;
      state.ballRadius = initialState.ballRadius;
      state.timeScale = initialState.timeScale;
      state.liftedBalls = initialState.liftedBalls;
      state.resetVersion += 1;
    },
    stopSimulation: (state) => {
      state.stopVersion += 1;
    },
  },
});

export const {
  setBallCount,
  setGravity,
  setMass,
  setMasses,
  setLengths,
  setRestitution,
  setDampingEnabled,
  setDamping,
  setTimeScale,
  setLiftedBalls,
  set3DMode,
  resetSimulation,
  stopSimulation,
} = simulationSlice.actions;

export default simulationSlice.reducer;
