import { useRef, useLayoutEffect, useState } from 'react';
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useMotionValue,
  useVelocity,
  useAnimationFrame
} from 'motion/react';
import './ScrollVelocity.css';

const DIRECTION_DEADZONE = 0.5;

function useElementWidth(ref) {
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return undefined;
    }

    function updateWidth() {
      setWidth(element.getBoundingClientRect().width);
    }

    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, [ref]);

  return width;
}

function wrap(min, max, v) {
  const range = max - min;
  const mod = (((v - min) % range) + range) % range;
  return mod + min;
}

function VelocityText({
                        children,
                        baseVelocity,
                        scrollContainerRef,
                        className,
                        damping,
                        stiffness,
                        numCopies,
                        velocityMapping,
                        parallaxClassName,
                        scrollerClassName,
                        parallaxStyle,
                        scrollerStyle
                      }) {
  const baseX = useMotionValue(0);
  const scrollOptions = scrollContainerRef ? { container: scrollContainerRef } : {};
  const { scrollY } = useScroll(scrollOptions);
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: damping ?? 200,
    stiffness: stiffness ?? 400
  });
  const velocityFactor = useTransform(
      smoothVelocity,
      velocityMapping?.input || [0, 1000],
      velocityMapping?.output || [0, 5],
      { clamp: false }
  );

  const trackRef = useRef(null);
  const trackWidth = useElementWidth(trackRef);

  const x = useTransform(baseX, v => {
    if (trackWidth === 0) return '0px';
    return `${wrap(-trackWidth, 0, v)}px`;
  });

  const directionFactor = useRef(1);
  useAnimationFrame((t, delta) => {
    if (trackWidth === 0) {
      return;
    }

    let moveBy = directionFactor.current * baseVelocity * (delta / 1000);
    const nextVelocityFactor = velocityFactor.get();

    if (nextVelocityFactor < -DIRECTION_DEADZONE) {
      directionFactor.current = -1;
    } else if (nextVelocityFactor > DIRECTION_DEADZONE) {
      directionFactor.current = 1;
    }

    moveBy *= 1 + Math.abs(nextVelocityFactor);
    baseX.set(baseX.get() + moveBy);
  });

  const items = [];
  for (let i = 0; i < numCopies; i++) {
    items.push(
        <span className={className} key={`primary-${i}`}>
          {children}&nbsp;
        </span>
    );
  }
  const duplicateItems = [];
  for (let i = 0; i < numCopies; i++) {
    duplicateItems.push(
        <span className={className} key={`duplicate-${i}`}>
          {children}&nbsp;
        </span>
    );
  }

  const trackStyles = {
    display: 'flex',
    flexShrink: 0,
    minWidth: 'max-content',
    ...scrollerStyle
  };

  return (
      <div className={parallaxClassName} style={parallaxStyle}>
        <motion.div style={{ x, display: 'flex', willChange: 'transform', visibility: trackWidth === 0 ? 'hidden' : 'visible' }}>
          <div className={scrollerClassName} style={trackStyles} ref={trackRef}>
            {items}
          </div>
          <div className={scrollerClassName} style={trackStyles} aria-hidden="true">
            {duplicateItems}
          </div>
        </motion.div>
      </div>
  );
}

export const ScrollVelocity = ({
                                 scrollContainerRef,
                                 texts = [],
                                 velocity = 100,
                                 className = '',
                                 damping = 200,
                                 stiffness = 400,
                                 numCopies = 6,
                                 velocityMapping = { input: [0, 1000], output: [0, 5] },
                                 parallaxClassName = 'parallax',
                                 scrollerClassName = 'scroller',
                                 parallaxStyle,
                                 scrollerStyle
                               }) => {
  return (
      <section>
        {texts.map((text, index) => (
            <VelocityText
                key={index}
                className={className}
                baseVelocity={index % 2 !== 0 ? -velocity : velocity}
                scrollContainerRef={scrollContainerRef}
                damping={damping}
                stiffness={stiffness}
                numCopies={numCopies}
                velocityMapping={velocityMapping}
                parallaxClassName={parallaxClassName}
                scrollerClassName={scrollerClassName}
                parallaxStyle={parallaxStyle}
                scrollerStyle={scrollerStyle}
            >
              {text}
            </VelocityText>
        ))}
      </section>
  );
};

export default ScrollVelocity;
