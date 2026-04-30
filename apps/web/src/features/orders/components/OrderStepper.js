"use client";

import styles from "@/features/orders/new-order-page.module.css";

export default function OrderStepper({ steps, currentIndex, onJump }) {
  return (
    <nav
      className={styles.stepper}
      aria-label="steps"
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
    >
      {steps.map((step, index) => {
        const isActive = index === currentIndex;
        const isDone = index < currentIndex;
        const canJump = isDone && typeof onJump === "function";

        const classNames = [
          styles.stepperItem,
          isActive ? styles.stepperItemActive : "",
          isDone ? styles.stepperItemDone : "",
          canJump ? styles.stepperItemClickable : "",
        ]
          .filter(Boolean)
          .join(" ");

        const content = (
          <>
            <span className={styles.stepperIndex}>
              {String(index + 1).padStart(2, "0")} · {step.label}
            </span>
            <span className={styles.stepperLabel}>{step.title}</span>
          </>
        );

        if (canJump) {
          return (
            <button
              key={step.id}
              type="button"
              className={classNames}
              onClick={() => onJump(index)}
            >
              {content}
            </button>
          );
        }

        return (
          <div key={step.id} className={classNames}>
            {content}
          </div>
        );
      })}
    </nav>
  );
}
