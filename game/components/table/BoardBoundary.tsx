"use client";

import { Component, type ReactNode } from "react";

/** A failed WebGL context must never take the authoritative game down with it. */
export class BoardBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
