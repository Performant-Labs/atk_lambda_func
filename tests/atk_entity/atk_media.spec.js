/**
 * atk_media.spec.js
 *
 * Validate media entity.
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

test.describe('Media tests.', () => {
  //
  // Create media with image, confirm it, update it, confirm update then delete it via the UI.
  //
  test('(ATK-PW-1130) Create, update, delete an image via the UI. @ATK-PW-1130 @media @smoke @alters-db', async ({ page, context }) => {
    const testId = 'ATK-PW-1130'
    const image1Filepath = 'tests/data/RobotsAtDesk.png'
    const image2Filepath = 'tests/data/SmokeTest.png'
    const uniqueToken1 = atkUtilities.createRandomString(6)
    const uniqueToken2 = atkUtilities.createRandomString(6)

    // Log in with the administrator account.
    // You should change this to an account other than the administrator,
    // that has all rights.
    await atkCommands.logInViaForm(page, context, qaUserAccounts.admin)

    //
    // Add an image.
    //
    await page.goto(baseUrl + atkConfig.imageAddUrl)

    // Upload image.
    await page.setInputFiles('#edit-field-media-image-0-upload', image1Filepath)
    const altField = page.locator('input[name="field_media_image[0][alt]"]')
    await altField.fill(`${testId}: ${uniqueToken1}`)

    // Fill in as many fields as you need
    // if you've customized your media entity.

    // Uncomment to unpublish.
    const publishInput = page.locator('input[name="status[value]"]') // eslint-disable-line no-unused-vars
    // await publishInput.uncheck()

    // Then save the entity.
    await page.getByRole('button', { name: 'Save' }).first().click()

    // We are now on the media content list. Confirm the image
    // was rendered by checking for the token.
    let imageLocator = page.locator(`img[alt*="${uniqueToken1}"]`)
    await expect(imageLocator).toBeVisible()

    // Confirm image downloads correctly by testing the naturalWidth
    // and NaturalHeight properties.
    let isImageDownloaded = await imageLocator.evaluate((img) => img.naturalWidth > 0
      && img.naturalHeight > 0)

    // Extract the media id that was added by
    // automated_testing_kit_preprocess_image().
    const mid = await imageLocator.getAttribute('data-media-id')

    //
    // Update the media.
    //
    const mediaEditUrl = atkConfig.mediaEditUrl.replace('{mid}', mid)
    await page.goto(baseUrl + mediaEditUrl)
    await page.getByRole('button', { name: 'Remove' }).click()
    await page.setInputFiles('input[name="files[field_media_image_0]"]', image2Filepath)
    await altField.fill(`${testId}: ${uniqueToken2}`)
    await page.getByRole('button', { name: 'Save' }).first().click()

    //
    // Confirm content has changed.
    //

    // We are back again on the media content list. Confirm the image
    // was rendered by checking for the token.
    imageLocator = page.locator(`img[alt*="${uniqueToken2}"]`)
    await expect(imageLocator).toBeVisible()

    // Confirm image downloads correctly by testing the naturalWidth
    // and NaturalHeight properties.
    isImageDownloaded = await imageLocator.evaluate((img) => img.naturalWidth > 0
      && img.naturalHeight > 0)

    //
    // Delete the media entity.
    //
    const mediaDeleteUrl = atkConfig.mediaDeleteUrl.replace('{mid}', mid)
    await page.goto(baseUrl + mediaDeleteUrl)
    await page.getByRole('button', { name: 'Delete' }).click()
  })
})
