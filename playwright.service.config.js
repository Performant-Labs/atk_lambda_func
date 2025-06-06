import path from 'path';

const { defineConfig } = require('@playwright/test');
const { getServiceConfig, ServiceOS } = require('@azure/microsoft-playwright-testing');
const config = require('./playwright.config');

/* Learn more about service configuration at https://aka.ms/mpt/config */
export default defineConfig(
  config,
  getServiceConfig(config, {
    exposeNetwork: '<loopback>',
    timeout: 30000,
    os: ServiceOS.LINUX,
    serviceAuthType: 'ACCESS_TOKEN',
    useCloudHostedBrowsers: true // Set to false if you want to only use reporting and not cloud hosted browsers
  }),
  {
    /*
    Playwright Testing service reporter is added by default.
    This will override any reporter options specified in the base playwright config.
    If you are using more reporters, please update your configuration accordingly.
    */
    reporter: [
      ['list'],
      ['@azure/microsoft-playwright-testing/reporter'],
      // ['json', { outputFile: path.join(config.outputDir, 'index.json') }],
      ['html', { outputFolder: path.join(config.outputDir, 'html-report'), open: 'never' }],
    ],
  }
);
