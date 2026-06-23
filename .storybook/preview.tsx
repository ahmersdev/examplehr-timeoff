import type { Preview } from '@storybook/nextjs-vite';
import { initialize, mswLoader } from 'msw-storybook-addon';

import { Providers } from '../src/components/providers';
import { withStoryReset } from '../src/stories/decorators';
import { handlers } from '../src/mocks/handlers/default';
import '../src/app/globals.css';

initialize({ onUnhandledRequest: 'warn' }, handlers);

const preview: Preview = {
  loaders: [mswLoader],
  decorators: [
    withStoryReset,
    (Story) => (
      <Providers>
        <Story />
      </Providers>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },
  },
};

export default preview;
