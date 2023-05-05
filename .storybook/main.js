// import { configure } from '@storybook/html';
// import { StorybookConfig } from '@storybook/html';

// configure(require.context('./src', true, /\.stories\.tsx$/), module);

const config = {
  // stories: ['./src', '/\.stories\.tsx$/'],
  stories: ['./src/*.stories.tsx'],
  // addons: ['@storybook/addon-essentials', '@storybook/addon-interactions'],
  framework: {
    name: '@storybook/html-webpack5',
    options: {}
  }
  // features: {
  //   legacyMdx1: true, // 👈 Enables MDX v1 support
  // },
  // ,
  // docs: {
  //   autodocs: true
  // }
};
export default config;
