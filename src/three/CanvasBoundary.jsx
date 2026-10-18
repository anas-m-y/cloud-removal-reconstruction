import { Component } from 'react';

// If the GPU context fails, keep the page and show the CSS fallback instead (R3F docs, "Errors and fallbacks").
export default class CanvasBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e) { console.warn('3D layer disabled:', e?.message || e); }
  render() { return this.state.failed ? (this.props.fallback ?? null) : this.props.children; }
}

export const hasWebGL = () => {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
};
