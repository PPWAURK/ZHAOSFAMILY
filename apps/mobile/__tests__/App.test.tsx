/**
 * @format
 */

import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

test('renders correctly', async () => {
  const rendererRef: { current?: ReactTestRenderer.ReactTestRenderer } = {};
  await ReactTestRenderer.act(async () => {
    rendererRef.current = ReactTestRenderer.create(<App />);
  });

  expect(rendererRef.current?.root.type).toBe(App);
});
