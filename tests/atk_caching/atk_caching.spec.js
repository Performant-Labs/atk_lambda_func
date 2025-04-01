/**
 * atk_caching.spec.js
 *
 * Caching tests.
 *
 */

// Set up Playwright.
import { expect, test } from '@playwright/test'

/** ESLint directives */
/* eslint-disable import/first */

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

test.describe('Caching tests.', () => {
  const tmpNid = []

  //
  // Validate Caching.
  //
  test('(ATK-PW-1090) Verify block caching and cache tag functionality. @ATK-PW-1090 @caching @smoke @alters-db', async ({ page, context }) => {
    const testId = 'ATK-PW-1090'
    const uniqueToken = atkUtilities.createRandomString(6)
    const blockContent = `Block content state ${uniqueToken}`
    const uniqueToken1 = atkUtilities.createRandomString(6)
    const blockContent1 = `Block content state ${uniqueToken1}`

    // Log in as admin.
    await atkCommands.logInViaForm(page, context, qaUserAccounts.admin)

    // Create a page.
    await page.goto(baseUrl + atkConfig.pageAddUrl)
    const titleTextField = await page.locator('input[name="title[0][value]"]')
    await titleTextField.fill(`${testId}: A Title`)
    await atkCommands.inputTextIntoCKEditor(page, 'Page to include a block')
    await page.getByRole('button', { name: 'Save' }).first().click()
    await page.waitForEvent('domcontentloaded')
    const pageUrl = page.url()

    // Extract the nid placed in the body class by this hook:
    // automated_testing_kit.module:automated_testing_kit_preprocess_html().
    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded')
    const bodyClass = await page.evaluate(() => document.body.className)
    const match = bodyClass.match(/node-nid-(\d+)/)

    // Get the nid.
    const nid = parseInt(match[1], 10)
    tmpNid.push(nid)

    // Create a block.
    await page.goto(baseUrl + atkConfig.blockAddUrl)
    await page.getByRole('textbox', { name: 'Block description' }).fill(`${testId}: Custom block`)
    await atkCommands.inputTextIntoCKEditor(page, blockContent)
    await page.getByRole('button', { name: 'Save' }).first().click()

    // Place the block to the content layout.
    // Set the content.
    await page.goto(`${baseUrl}admin/structure/block`)
    await page.getByRole('link', { name: 'Place block in the Content region' }).click()
    await page.locator('tr', { hasText: testId }).first()
      .getByRole('link', { name: 'Place block' }).click()
    await page.getByRole('textbox', { name: 'Pages' }).fill(new URL(pageUrl).pathname)
    await page.locator('button', { hasText: 'Save block' }).click()

    // Monitor the page response.
    let responsePromise
    responsePromise = page.waitForResponse(pageUrl)

    // Log out.
    await atkCommands.logOutViaUi(page)

    // Open the page.
    await page.goto(pageUrl)
    let response = await responsePromise
    expect(response.headers()['x-drupal-cache']).toEqual('MISS')

    // Open the page again.
    responsePromise = page.waitForResponse(pageUrl)
    await page.goto(pageUrl)
    response = await responsePromise
    expect(response.headers()['x-drupal-cache']).toEqual('HIT')

    // Change the block content.
    await atkCommands.logInViaForm(page, context, qaUserAccounts.admin)
    await page.goto(`${baseUrl}admin/structure/block`)
    const blockRowLocator = page.locator('tr', { hasText: testId })
    await blockRowLocator.locator('.dropbutton__toggle').click()
    await blockRowLocator.getByText('Edit').click()
    await atkCommands.inputTextIntoCKEditor(page, blockContent1)
    await page.getByRole('button', { name: 'Save' }).first().click()

    // Log out.
    await atkCommands.logOutViaUi(page)

    // Open the page.
    responsePromise = page.waitForResponse(pageUrl)
    await page.goto(pageUrl)
    response = await responsePromise
    expect(response.headers()['x-drupal-cache']).toEqual('MISS')

    // Open the page again.
    responsePromise = page.waitForResponse(pageUrl)
    await page.goto(pageUrl)
    response = await responsePromise
    expect(response.headers()['x-drupal-cache']).toEqual('HIT')
  })

  test.afterEach(async ({ page, context }) => {
    // Delete the page.
    tmpNid.forEach((nid) => {
      atkCommands.deleteNodeWithNid(nid)
    })

    // Remove the block from the content layout.
    await atkCommands.logInViaForm(page, context, qaUserAccounts.admin)
    await page.goto(`${baseUrl}admin/structure/block`)
    const blockRowLocator = page.locator('tr', { hasText: 'ATK' }).first()
    while (await blockRowLocator.isVisible()) {
      await blockRowLocator.locator('.dropbutton__toggle').click()
      await blockRowLocator.getByText('Remove').click()
      await page.getByRole('button', { name: 'Remove' }).click()
    }

    // Delete the block.
    await page.goto('admin/content/block')
    while (await blockRowLocator.isVisible()) {
      await blockRowLocator.locator('.dropbutton__toggle').click()
      await blockRowLocator.getByText('Delete').click()
      await page.getByRole('button', { name: 'Delete' }).click()
    }
  })
})
