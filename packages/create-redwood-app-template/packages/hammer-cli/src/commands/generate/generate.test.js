import React from 'react';
import { render } from 'ink-testing-library';

import Generate from './generate';

describe('Command: Generate', () => {
  const generators = {
    testGenerator: () => ({ 'a.js': 'a', 'a.test.js': 'b' }),
  };

  it('command usage is shown when no or a bad generator is selected', () => {
    const { lastFrame } = render(
      <Generate args={['generate']} generators={generators} />
    );
    expect(lastFrame()).toMatch(/Usage:/g);
  });

  it('routes to the correct command', () => {
    const { lastFrame } = render(
      <Generate
        args={['generate', 'testGenerator', 'NewComponent']}
        generators={generators}
        fileWriter={() => {}}
      />
    );
    console.log(lastFrame());
  });
});
