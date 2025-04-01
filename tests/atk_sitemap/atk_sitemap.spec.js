/**
 * atk_sitemap.spec.js
 *
 * Validate sitemap.xml.
 *
 */

/** ESLint directives */
/* eslint-disable import/first */

import { XMLParser } from 'fast-xml-parser'
import axios from 'axios'
import https from 'https'

// Set up Playwright.
import { expect, test } from '@playwright/test'

import * as atkUtilities from '../support/atk_utilities' // eslint-disable-line no-unused-vars
import * as atkCommands from '../support/atk_commands'

import playwrightConfig from '../../playwright.config'

const baseUrl = playwrightConfig.use.baseURL

// Import ATK Configuration.
import atkConfig from '../../playwright.atk.config'

// Standard accounts that use user accounts created
// by QA Accounts. QA Accounts are created when the QA
// Accounts module is enabled.
import qaUserAccounts from '../data/qaUsers.json'

test.describe('Sitemap tests.', () => {
  //
  // 1070 to 1079 reserved for XML Sitemap (https://www.drupal.org/project/xmlsitemap) tests.
  //

  //
  // Return # of sitemap files; fail if zero.
  //
  test('(ATK-PW-1070) Return # of sitemap files; fail if zero. @ATK-PW-1070 @xml-sitemap @smoke', async ({ page }) => {
    const testId = 'ATK-PW-1070' // eslint-disable-line no-unused-vars
    const fileName = 'sitemap.xml'

    // Fetch file.
    await page.goto(baseUrl)
    const targetUrl = baseUrl + fileName

    // Create a custom Axios instance with SSL verification disabled
    const axiosInstance = axios.create({
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
      }),
    })

    // If there isn't at least one sitemap, this will fail.
    const response = await axiosInstance.get(targetUrl)

    // Uncomment and use with parse() below to test multi-part sitemaps.
    // let tempVal = '<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>http://example.com/sitemap1.xml</loc><lastmod>2023-01-01T00:00:00+00:00</lastmod></sitemap><sitemap><loc>http://example.com/sitemap2.xml</loc><lastmod>2023-01-01T00:00:00+00:00</lastmod></sitemap></sitemapindex>'

    const parser = new XMLParser()
    const jsonObj = parser.parse(response.data)

    let sitemapCount = 1
    try {
      // If there is just one sitemap file, this will fail.
      // Is the module enabled and cron has run?
      sitemapCount = jsonObj.sitemapindex.sitemap.length
    } catch (error) {}

    console.log(`Total sitemap files: ${sitemapCount}`) // eslint-disable-line no-console
  })

  //
  // Regenerate sitemap files.
  // 1. Find Site ID of default sitemap (change for your installation).
  // 2. Fetch the 1.xml timestamp.
  // 3. Use drush xmlsitemap:regenerate to create new files.
  // 4. Validate new files.
  //
  test('(ATK-PW-1071) Regenerate sitemap files. @ATK-PW-1071 @xml-sitemap @smoke', async ({ page, context }) => {
    const testId = 'ATK-PW-1071' // eslint-disable-line no-unused-vars
    const fileName = 'sitemap.xml' // eslint-disable-line no-unused-vars

    //
    // Step 1.
    //
    await atkCommands.logInViaForm(page, context, qaUserAccounts.admin)
    await page.goto(baseUrl + atkConfig.xmlSitemapUrl)

    // Find the row where the first column contains the baseUrl.

    // Remove the final slash and the protocol.
    const trimmedBaseUrl = baseUrl.replace(/\/$/, '').replace(/^[\w+]+:\/\//, '')
    const searchText = `table tr:has(td:first-child:has-text('${trimmedBaseUrl}'))`
    const rowLocator = await page.locator(searchText)

    // Get the text content of the second column in that row
    // const siteId = await rowLocator.$eval('td:nth-child(2)', (el) => el.textContent);
    const siteId = await rowLocator.locator('td:nth-child(2)').textContent()

    //
    // Step 2.
    //
    const firstSitemap = `sites/default/files/xmlsitemap/${siteId}/1.xml`
    const drushFull = `fprop --format=json ${firstSitemap}`

    // Capture the timestamp to ensure it changes.
    const firstFileProps = JSON.parse(atkCommands.execDrush(drushFull))

    //
    // Step 3.
    //
    atkCommands.execDrush('xmlsitemap:rebuild')

    //
    // Step 4.
    //
    const secondFileProps = JSON.parse(atkCommands.execDrush(`fprop --format=json ${firstSitemap}`))
    const firstTime = firstFileProps[0].filemtime
    const secondTime = secondFileProps[0].filemtime
    expect(firstTime).not.toEqual(secondTime)
  })

  //
  // Regenerate sitemap files for SimpleSiteMap.
  // 1080 to 1089 reserved for Simple XML Sitemap (https://www.drupal.org/project/simple_sitemap) tests.
  //
})
