/**
 * atk_page_error.spec.js
 *
 * Page error tests such as 4xx, 5xx, etc.
 *
 */

/** ESLint directives */
/* eslint-disable import/first */

import * as atkCommands from '../support/atk_commands';
import * as atkUtilities from '../support/atk_utilities';

// Set up Playwright.
const { test, expect } = require('@playwright/test');

import playwrightConfig from '../../playwright.config';

const baseUrl = playwrightConfig.use.baseURL;

// Import ATK Configuration.
import atkConfig from '../../playwright.atk.config'; // eslint-disable-line no-unused-vars

// Import email settings for Ethereal fake SMTP service.
import userEtherealAccount from '../data/etherealUser.json'; // eslint-disable-line no-unused-vars

// Standard accounts that use user accounts created
// by QA Accounts. QA Accounts are created when the QA
// Accounts module is enabled.
import qaUserAccounts from '../data/qaUsers.json';

test.describe('Page error tests.', () => {
  //
  // Validate that 403 page appears.
  // Assumes:
  // Create a basic page with alias of "403-error-page" that has text content below.
  // admin/config/system/site-information:Default 403 (access denied) page = /403-error-page
  //
  test('(ATK-PW-1060) Validate that 403 page appears. @ATK-PW-1060 @page-error @smoke', async ({ page, context }) => {
    const testId = 'ATK-PW-1060'; // eslint-disable-line no-unused-vars
    const badAnonymousUrl = 'admin';

    await atkCommands.logOutViaUi(page, context);
    await page.goto(baseUrl + badAnonymousUrl);

    // Should see the 403 message.
    await expect(page.getByText('403 Error Page')).toBeVisible();
  });

  // Validate that 403 page appears.
  // Assumes:
  // Create a basic page with the title of "403 error page" that has the
  // text "403 error page".
  // In admin/config/system/site-information, set Default 403 (access denied) page = /node/x
  // where x is the new node ID.
  test('(ATK-PW-1061) Validate that 404 page appears. @ATK-PW-1061 @page-error @smoke', async ({ page, context }) => {
    const testId = 'ATK-PW-1061';
    const randomString = atkUtilities.createRandomString(6);
    const badAnonymousUrl = `${testId}-BadAnonymousPage-${randomString}`;
    const badAuthenticatedUrl = `${testId}-BadAuthenticatedPage-${randomString}`;

    await atkCommands.logOutViaUi(page, context);
    await page.goto(baseUrl + `${badAnonymousUrl}`);

    // Should see the 404 message.
    await expect(page.getByText('404 Error Page')).toBeVisible();

    await atkCommands.logInViaForm(page, context, qaUserAccounts.authenticated);
    await page.goto(baseUrl + badAuthenticatedUrl);

    // Should see the 404 message.
    await expect(page.getByText('404 Error Page')).toBeVisible();
  });
});
