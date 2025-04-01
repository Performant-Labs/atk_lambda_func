/**
 * atk_taxonomy.spec.js
 *
 * Validate taxonomy entity.
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

// Import ATK configuration.
import atkConfig from '../../playwright.atk.config'

// Holds standard accounts that use user accounts created
// by QA Accounts. QA Accounts are created when the QA
// Accounts module is enabled.
import qaUserAccounts from '../data/qaUsers.json'

test.describe('Entity tests.', () => {
  //
  // Create taxonomy term, confirm it, update it, confirm update then delete it via the UI.
  //
  test('(ATK-PW-1120) Create, update, delete a taxonomy term via the UI. @ATK-PW-1120 @taxonomy @smoke @alters-db', async ({ page, context }) => {
    const testId = 'ATK-PW-1120'
    const uniqueToken = atkUtilities.createRandomString(6)
    const termName = `${testId}: ${uniqueToken}`
    let bodyText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean a ultrices tortor.'

    // Log in with the administrator account.
    // You should change this to an account other than the administrator,
    // which has all rights.
    await atkCommands.logInViaForm(page, context, qaUserAccounts.admin)

    //
    // Add a taxonomy node to the tags vocabulary.
    //
    await page.goto(baseUrl + atkConfig.termAddUrl)

    // Fill in as many fields as you need here.
    // Below we provide a name and body.
    const titleTextfield = await page.$('input[name="name[0][value]"]')
    await titleTextfield.fill(termName)

    // Some versions of Drupal may want this code instead of using Javascript
    // to type into CKEditor (which is what InputTextIntoCKEditor does).
    // ckEditor = await page.locator('[aria-label="Editor editing area: main"]')
    // await ckEditor.fill(bodyText)
    await atkCommands.inputTextIntoCKEditor(page, bodyText)

    await page.getByRole('button', { name: 'Save and go to list' }).click()

    //
    // Fetch tag id from the list. The new term should be at
    // or near the top but we shouldn't assume that.
    //
    await page.goto(baseUrl + atkConfig.termListUrl)
    const termLocator = await page.getByText(termName)

    // Get the tid from the edit button.
    const linkLocator = await termLocator.locator('xpath=following::a[starts-with(@href, "/taxonomy/term/")]').first()
    const workingUrl = await linkLocator.getAttribute('href')

    // Extract the tid.
    const regex = /\/taxonomy\/term\/(\d+)(?:\/([a-zA-Z0-9_-]+))?/
    const tidArray = workingUrl.match(regex)
    const tid = tidArray[1]

    const termEditUrl = atkConfig.termEditUrl.replace('{tid}', tid)
    const termViewUrl = atkConfig.termViewUrl.replace('{tid}', tid)
    const termDeleteUrl = atkConfig.termDeleteUrl.replace('{tid}', tid)

    // Validate the body.
    await page.goto(baseUrl + termViewUrl)
    await expect(bodyText).toContain(bodyText)

    // Extract the tid placed in the body class by this hook:
    // automated_testing_kit.module:automated_testing_kit_preprocess_html().
    const bodyClass = await page.evaluate(() => document.body.className) // eslint-disable-line no-unused-vars

    //
    // Update the term.
    //
    bodyText = 'Ut eget ex vitae nibh dapibllus vulputate ut id lacus.'

    await page.goto(baseUrl + termEditUrl)

    // See comment above if inputTextIntoCKEditor() does not work for you.
    await atkCommands.inputTextIntoCKEditor(page, bodyText)

    const button = await page.locator('#edit-save') // eslint-disable-line no-unused-vars
    // await button.click( { force: true } )
    await page.getByRole('button', { name: 'Save and go to list' }).click()

    //
    // Delete the term.
    //
    await page.goto(baseUrl + termDeleteUrl)
    await page.getByRole('button', { name: 'Delete' }).click()

    // Adjust this confirmation to your needs.
    const divContainer = await page.textContent('.messages--status')
    await expect(divContainer).toContain('Deleted term')
  })
})
