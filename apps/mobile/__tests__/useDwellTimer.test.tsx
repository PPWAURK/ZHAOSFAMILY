import ReactTestRenderer from "react-test-renderer";

import { useDwellTimer } from "@/features/training/useDwellTimer";

interface ProbeProps {
  enabled: boolean;
  resetKey: number;
  onReached: () => void;
}

function Probe({ enabled, resetKey, onReached }: ProbeProps): null {
  useDwellTimer({ enabled, seconds: 5, resetKey, onReached });
  return null;
}

describe("useDwellTimer", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("fires once after the dwell time", () => {
    const onReached = jest.fn();
    ReactTestRenderer.act(() => {
      ReactTestRenderer.create(<Probe enabled resetKey={1} onReached={onReached} />);
    });

    ReactTestRenderer.act(() => jest.advanceTimersByTime(4999));
    expect(onReached).not.toHaveBeenCalled();

    ReactTestRenderer.act(() => jest.advanceTimersByTime(1));
    expect(onReached).toHaveBeenCalledTimes(1);

    ReactTestRenderer.act(() => jest.advanceTimersByTime(20000));
    expect(onReached).toHaveBeenCalledTimes(1);
  });

  it("does not fire while disabled", () => {
    const onReached = jest.fn();
    ReactTestRenderer.act(() => {
      ReactTestRenderer.create(
        <Probe enabled={false} resetKey={1} onReached={onReached} />,
      );
    });

    ReactTestRenderer.act(() => jest.advanceTimersByTime(10000));
    expect(onReached).not.toHaveBeenCalled();
  });

  it("restarts when the reset key changes", () => {
    const onReached = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <Probe enabled resetKey={1} onReached={onReached} />,
      );
    });

    ReactTestRenderer.act(() => jest.advanceTimersByTime(4000));
    ReactTestRenderer.act(() => {
      renderer.update(<Probe enabled resetKey={2} onReached={onReached} />);
    });
    ReactTestRenderer.act(() => jest.advanceTimersByTime(4000));
    expect(onReached).not.toHaveBeenCalled();

    ReactTestRenderer.act(() => jest.advanceTimersByTime(1000));
    expect(onReached).toHaveBeenCalledTimes(1);
  });

  it("clears the timer on unmount", () => {
    const onReached = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <Probe enabled resetKey={1} onReached={onReached} />,
      );
    });

    ReactTestRenderer.act(() => renderer.unmount());
    ReactTestRenderer.act(() => jest.advanceTimersByTime(10000));
    expect(onReached).not.toHaveBeenCalled();
  });
});
