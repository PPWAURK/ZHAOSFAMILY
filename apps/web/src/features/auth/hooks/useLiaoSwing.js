"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "motion";
import { useMotionTemplate, useMotionValue } from "motion/react";

import { LIAO_SWING_CONFIG } from "@/features/auth/constants/auth-ui";

const {
  maxHorizontalRotation,
  horizontalDegreesPerPixel,
  releaseRotationCap,
  releaseVelocityFactor,
  reboundDelayMs,
  returnDelayMs,
} = LIAO_SWING_CONFIG;

export function useLiaoSwing() {
  const [isDragging, setIsDragging] = useState(false);
  const timeoutIds = useRef([]);
  const animationRef = useRef(null);
  const pointerState = useRef({
    pointerId: null,
    startX: 0,
    startRotation: 0,
    lastX: 0,
    lastTime: 0,
    velocity: 0,
  });
  const rotation = useMotionValue(0);
  const rotationVar = useMotionTemplate`${rotation}deg`;

  useEffect(() => {
    return () => {
      timeoutIds.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      animationRef.current?.stop();
    };
  }, [rotation]);

  function clearTimers() {
    timeoutIds.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutIds.current = [];
  }

  function stopAnimation() {
    animationRef.current?.stop();
    animationRef.current = null;
    clearTimers();
  }

  function clampRotation(nextRotation) {
    return Math.max(
      -maxHorizontalRotation,
      Math.min(maxHorizontalRotation, nextRotation),
    );
  }

  function settleSwing(targetRotation) {
    const reboundRotation = clampRotation(-targetRotation * 0.24);

    animationRef.current = animate(rotation, targetRotation, {
      type: "spring",
      stiffness: 200,
      damping: 13,
      mass: 0.85,
    });

    const reboundTimeoutId = window.setTimeout(() => {
      animationRef.current?.stop();
      animationRef.current = animate(rotation, reboundRotation, {
        type: "spring",
        stiffness: 180,
        damping: 15,
        mass: 0.85,
      });
    }, reboundDelayMs);

    const returnTimeoutId = window.setTimeout(() => {
      animationRef.current?.stop();
      animationRef.current = animate(rotation, 0, {
        type: "spring",
        stiffness: 165,
        damping: 19,
        mass: 0.9,
      });
    }, reboundDelayMs + returnDelayMs);

    timeoutIds.current.push(reboundTimeoutId, returnTimeoutId);
  }

  function finishDrag(pointerId) {
    if (pointerState.current.pointerId !== pointerId) {
      return;
    }

    const releaseRotation = Math.max(
      -releaseRotationCap,
      Math.min(
        releaseRotationCap,
        pointerState.current.velocity * releaseVelocityFactor,
      ),
    );

    pointerState.current.pointerId = null;
    setIsDragging(false);
    settleSwing(clampRotation(rotation.get() + releaseRotation));
  }

  function handlePointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    stopAnimation();

    pointerState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startRotation: rotation.get(),
      lastX: event.clientX,
      lastTime: performance.now(),
      velocity: 0,
    };

    setIsDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function handlePointerMove(event) {
    if (pointerState.current.pointerId !== event.pointerId) {
      return;
    }

    const nextRotation = clampRotation(
      pointerState.current.startRotation +
        (event.clientX - pointerState.current.startX) * horizontalDegreesPerPixel,
    );
    const now = performance.now();
    const elapsed = Math.max(now - pointerState.current.lastTime, 16);

    pointerState.current.velocity =
      (event.clientX - pointerState.current.lastX) / elapsed;
    pointerState.current.lastX = event.clientX;
    pointerState.current.lastTime = now;
    rotation.set(nextRotation);
  }

  function handlePointerUp(event) {
    finishDrag(event.pointerId);
  }

  function handlePointerCancel(event) {
    finishDrag(event.pointerId);
  }

  return {
    isDragging,
    rotationVar,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  };
}
