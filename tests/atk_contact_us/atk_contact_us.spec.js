/**
 * atk_contact_us.spec.js
 *
 * Contact Us tests.
 *
 */

/** ESLint directives */
/* eslint-disable import/first */

// Set up Playwright.
import { expect, test } from '@playwright/test'

import * as atkCommands from '../support/atk_commands'
import * as atkUtilities from '../support/atk_utilities'

import playwrightConfig from '../../playwright.config'

const baseUrl = playwrightConfig.use.baseURL

// Import ATK Configuration.
import atkConfig from '../../playwright.atk.config'

// Standard accounts that use user accounts created
// by QA Accounts. QA Accounts are created when the QA
// Accounts module is enabled.
import qaUserAccounts from '../data/qaUsers.json'

test.describe('Contact Us tests.', () => {
  //
  // Validate Contact us.
  //
  test('(ATK-PW-1050)  Contact Us form accepts input, sends email. @ATK-PW-1050 @contact-us @smoke @alters-db', async ({ page, context }) => {
    const testId = 'ATK-PW-1050'
    const uniqueToken = atkUtilities.createRandomString(6)
    const subjectLine = `${testId} ${uniqueToken}`

    // Begin Contact us.
    const user = atkUtilities.createRandomUser()
    await page.goto(baseUrl + atkConfig.contactUsUrl)

    await page.getByLabel('Your name').fill(user.userName)
    await page.getByLabel('Your email').fill(user.userEmail)
    await page.getByLabel('Subject').fill(subjectLine)
    await page.getByLabel('Message').fill(testId)
    await page.getByRole('button', { name: 'Send message' }).click()

    // The status box needs a moment to appear.
    await atkCommands.expectMessage(page, 'Your message has been sent.')

    await atkCommands.logInViaForm(page, context, qaUserAccounts.admin)

    await page.goto(`${baseUrl}admin/structure/webform/manage/contact/results/submissions`)

    // Check for presence of random string.
    // Part A passes: the submission appears.
    await expect(page.getByText(uniqueToken)).toBeVisible()
  })
})
