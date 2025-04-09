/**
 * atk_commands.js
 *
 * Useful functions for Playwright.
 *
 */

/** ESLint directives */
/* eslint-disable no-prototype-builtins */

// Set up Playwright.
import { expect } from '@playwright/test'
import { execSync } from 'child_process'
import { NodeSSH } from "node-ssh";

import playwrightConfig from '../../playwright.config'

// Fetch the Automated Testing Kit config, which is in the project root.
import atkConfig from '../../playwright.atk.config'
import { getProperty, readYAML } from './atk_utilities'

const baseUrl = playwrightConfig.use.baseURL

/**
 * Create a user via Drush using a JSON user object.
 * See qaUsers.json for the definition.
 *
 * TODO: cy.exec is failing to capture the result of user:create,
 * which should provide the UID.
 * See issue: https://github.com/drush-ops/drush/issues/5660
 *
 * @param {object} user JSON user object; see qaUsers.json for the structure.
 * @param {array} roles Array of string roles to pass to Drush (machine names).
 * @param {array} args Array of string arguments to pass to Drush.
 * @param {array} options Array of string options to pass to Drush.
 */
async function createUserWithUserObject(user, roles = [], args = [], options = []) {
  let cmd = 'user:create '

  if (args === undefined || !Array.isArray(args)) {
    console.error('createUserWithUserObject: Pass an array for args.')
    return
  }

  if (options === undefined || !Array.isArray(options)) {
    console.error('createUserWithUserObject: Pass an array for options.')
    return
  }

  args.unshift(`'${user.userName}'`)
  options.push(`--mail='${user.userEmail}'`, `--password='${user.userPassword}'`)

  // Uncomment for debugging.
  // console.log(`Attempting to create: ${user.userName}. `)

  await execDrush(cmd, args, options)

  // TODO: Bring this in when execDrush reliably
  // returns results.

  // Get the UID, if present.
  // const pattern = '/Created a new user with uid ([0-9]+)/g'

  // let uid = result.match(pattern)

  // Attempt to add the roles.
  // Role(s) may come from the user object or the function arguments.
  if (user.hasOwnProperty('userRoles')) {
    user.userRoles.forEach((role) => {
      roles.push(role)
    })
  }

  for (const role of roles) {
    cmd = `user:role:add '${role}' '${user.userName}'`
    await execDrush(cmd)

    // Uncomment for debugging.
    // console.log(`${role}: If role exists, role assigned to the user ${user.userName}`)
  }
}

/**
 * Delete currently opened node.
 * @param page {object} Page object.
 * @returns {Promise<void>}
 */
async function deleteCurrentNodeViaUi(page) {
  await page.getByRole('link', { name: 'Delete' }).click()
  await page.getByRole('button', { name: 'Delete' }).click()
}

/**
 * Delete node via UI given a nid.
 *
 * @param {object} page Page object.
 * @param {object} context Context object.
 * @param {int} nid Node ID of item to delete.
 */
async function deleteNodeViaUiWithNid(page, context, nid) {
  const nodeDeleteUrl = atkConfig.nodeDeleteUrl.replace('{nid}', nid)

  // Delete a node page.
  await page.goto(`${baseUrl}${nodeDeleteUrl}`)
  await page.getByRole('button', { name: 'Delete' }).click()

  // Adjust this confirmation to your needs.
  const statusLocator = await page.locator('.messages--status')
  const text = await statusLocator.textContent()
  await expect(text).toContain('has been deleted.')
}

/**
 * Delete node via drush with a given nid.
 *
 * @param nid {number} Node ID.
 * @return {Promise<string>} Command output.
 */
async function deleteNodeWithNid(nid) {
  return await execDrush(`entity:delete node ${nid}`)
}

/**
 * Deletes a user account via Drush using the provided email address.
 *
 * @param {string} email - The email address of the account to be deleted.
 * @param {string[]} [options=[]] - An optional array of additional Drush command options.
 * @throws {Error} Throws an error if options is provided but is not an array.
 * @returns {void}
 *
 * @description
 * This function uses Drush to delete a user account based on the given email address.
 * It includes a workaround for a Drush issue where the --mail option requires an argument.
 *
 * @example
 * // Delete a user with email "user@example.com"
 * deleteUserWithEmail("user@example.com");
 *
 * // Delete a user with email "user@example.com" and additional options
 * deleteUserWithEmail("user@example.com", ["--delete-content"]);
 *
 * @todo Remove the "dummy" workaround when using Drush 12.x or later (expected 2025).
 * @see {@link https://github.com/drush-ops/drush/issues/5652|Drush Issue #5652}
 */
async function deleteUserWithEmail(email, options = []) {
  if (options === undefined || !Array.isArray(options)) {
    throw new Error('deleteUserWithEmail: Pass an array for options.')
  }

  options.push(`--mail=${email}`)
  const cmd = 'user:cancel -y dummy '

  await execDrush(cmd, [], options)
}

/**
 * Deletes a user account via Drush using the provided Drupal user ID.
 *
 * @param {number} uid - The Drupal user ID of the account to be deleted.
 * @param {string[]} [options=[]] - An optional array of additional Drush command options.
 * @throws {Error} Throws an error if options is provided but is not an array.
 * @returns {Promise<string>} Command output if the command executed successfully.
 * Empty string otherwise.
 *
 * @description
 * This function uses Drush to delete a user account based on the given
 * Drupal user ID. It automatically includes the '--delete-content' option
 * to remove user content along with the account.
 * A workaround is implemented due to a Drush issue where the --uid option
 * requires a name argument.
 *
 * @example
 * // Delete a user with Drupal user ID 123
 * deleteUserWithUid(123);
 *
 * // Delete a user with Drupal user ID 123 and additional options
 * deleteUserWithUid(123, ["--disable-workflow"]);
 *
 * @todo Review and potentially remove the "dummy" workaround in future Drush versions.
 * @see Related to {@link https://github.com/drush-ops/drush/issues/5652|Drush Issue #5652}
 */
async function deleteUserWithUid(uid, options = []) {
  if (options === undefined || !Array.isArray(options)) {
    throw new Error('deleteUserWithUid: Pass an array for options.')
  }

  options.push(`--uid=${uid}`)
  options.push('--delete-content')
  const cmd = 'user:cancel -y dummy '

  return await execDrush(cmd, [], options)
}

/**
 * Deletes a Drupal user using Drush command.
 *
 * This function executes a Drush command to delete a user from a Drupal site.
 * It uses the `user:cancel` Drush command with the `-y` option for automatic confirmation.
 *
 * @param {string} userName - The Drupal username of the user to be deleted.
 * @param {string[]} [args=[]] - An array of additional string arguments to pass to Drush.
 * @param {string[]} [options=[]] - An array of additional string options to pass to Drush.
 * @throws {Error} Throws an error if args or options are not arrays.
 * @returns {Promise<string>} Command output if the command executed successfully, empty string
 * otherwise.
 *
 * @example
 * deleteUserWithUserName('johndoe');
 * deleteUserWithUserName('janedoe', ['--delete-content'], ['--notify']);
 */
async function deleteUserWithUserName(userName, args = [], options = []) {
  const cmd = `user:cancel -y '${userName}'`

  if (!Array.isArray(args)) {
    throw new Error('deleteUserWithUserName: args must be an array.')
  }

  if (!Array.isArray(options)) {
    throw new Error('deleteUserWithUserName: options must be an array.')
  }

  // Uncomment for debugging.
  // console.log(`Attempting to delete: ${userName}.`)

  return await execDrush(cmd, args, options)
}

/**
 * Run drush command locally or remotely depending on the environment.
 * Generally you'll use this function and let it figure out
 * how to execute Drush (locally, remotely, native OS, inside container, etc.).
 *
 * @param {string} cmd The Drush command.
 * @param {array} args Array of string arguments to pass to Drush.
 * @param {array} options Array of string options to pass to Drush.
 * @returns {Promise<string>} The output from executing the command in a shell.
 */
async function execDrush(cmd, args = [], options = []) {
  let output = ''

  if (args === undefined || !Array.isArray(args)) {
    console.error('execDrush: Pass an array for arguments.')
  }

  if (options === undefined || !Array.isArray(options)) {
    console.error('execDrush: Pass an array for options.')
  }

  const drushAlias = getDrushAlias()
  const argsString = args.join(' ')
  const optionsString = options.join(' ')
  const command = `${drushAlias} ${cmd} ${argsString} ${optionsString}`
  // const command = 'echo $PATH'

  // Pantheon needs special handling.
  if (atkConfig.pantheon.isTarget) {
    // sshCmd comes from the test and is set in the before()
    return execPantheonDrush(command) // Returns stdout (not wrapped).
  }

  if (atkConfig.targetSite.isTarget) {
    return execViaSsh(command)
  }

  try {
    // output = execSync(command, { shell: 'bin/bash'}).toString()
    output = execSync(command).toString()

    // Uncomment for debugging.
    // console.log(`execDrush result: ${output}`)
  } catch (error) {
    console.error(`execDrush error: ${error.message}`)
  }

  return output
}

/**
 * Run a Pantheon Drush command via Terminus.
 * Called by execDrush().
 *
 * @param {string} cmd Drush command; execDrush() contructs this with args and options.
 * @returns {string} The output from executing the command in a shell.
 */
function execPantheonDrush(cmd) {
  let result

  // Construct the Terminus command. Remove "drush" from argument.
  const remoteCmd = `terminus remote:drush ${atkConfig.pantheon.site}.${atkConfig.pantheon.environment} -- ${cmd.substring(5)}`

  result = ''
  try {
    result = execSync(remoteCmd)
    // Uncomment for debugging.
    // console.log(`execPantheonDrush result: ${result}`)
  } catch (error) {
    console.error(`execPantheonDrush error: ${error}`)
  }

  return result
}

/**
 * Run a command via SSH.
 *
 * @param cmd {string} Command line.
 * @returns {Promise<string>} The output from executing the command.
 */
async function execViaSsh(cmd) {
  // Construct the command that will talk to the Pantheon server including
  // the cmd argument.
  // const sshOptions = atkConfig.targetSite.sshOptions;
  // const envConnection = atkConfig.targetSite.remoteUser ?
  //     `${atkConfig.targetSite.remoteUser}:${atkConfig.targetSite.remoteHost}` :
  //     atkConfig.targetSite.remoteHost;
  // const remoteCmd = `ssh -T ${sshOptions} -o 'StrictHostKeyChecking=no' -o 'AddressFamily inet' ${envConnection} '${cmd}'`

  const ssh = new NodeSSH()

  await ssh.connect({
    host: atkConfig.targetSite.host,
    port: atkConfig.targetSite.port,
    username: atkConfig.targetSite.username,
    privateKeyPath: '/tmp/atk_lambda_func',
  })

  let result = ''

  try {
    const { stdout, stderr } = await ssh.execCommand(cmd)
    result = stdout
    if (stderr) {
      console.error(stderr)  // we shouldn't ignore it completely, huh???
    }
  } catch (error) {
    console.error('execViaSsh error:', error)
  }

  return result
}

/**
 * Assert presence of a message with given text on the page.
 *
 * @param page Playwright Page object.
 * @param text Text, which the message box should partially match.
 * @return {Promise<void>}
 */
async function expectMessage(page, text) {
  // The status box needs a moment to appear.
  const message = await page.waitForSelector('[aria-label="Status message"]')

  // Should see the thank-you message.
  expect(await message.textContent()).toContain(text)
}

/**
 * Returns Drush alias per environment.
 * Adapt this to the mechanism that communicates to the remote server.
 *
 * @returns {string} The Drush command i.e 'lando drush ', etc.
 */
function getDrushAlias() {
  let cmd = ''

  // Drush to Pantheon requires Terminus.
  if (atkConfig.pantheon.isTarget) {
    cmd = 'drush '
  } else {
    // Fetch the Drush command appropriate to the operating mode.
    cmd = `${atkConfig.drushCmd} `
  }
  return cmd
}

/**
 * Return the UID of a user given an email.
 *
 * @param {string} email Email of the account.
 * @returns {Promise<number>} UID of user.
 */
async function getUidWithEmail(email) {
  const cmd = `user:info --mail=${email} --format=json`

  const result = await execDrush(cmd)
  if (result) {
    // Fetch uid from json object, if present.
    const userJson = JSON.parse(result)

    for (const key in userJson) {
      if (userJson[key].hasOwnProperty('uid')) {
        const uidValue = userJson[key].uid
        return parseInt(uidValue, 10) // Exit the loop once the mail property is found.
      }
    }
  }
  return 0
}

/**
 * Return the Username of a user given an email.
 *
 * @param {string} email Email of the account.
 * @returns {Promise<string>} Username of user.
 */
async function getUsernameWithEmail(email) {
  const cmd = `user:info --mail=${email} --format=json`
  const result = await execDrush(cmd)

  // Fetch uid from json object, if present.
  let nameValue = null
  if (!result === '') {
    // Expecting a string in json form.
    const userJson = JSON.parse(result)

    for (const key in userJson) {
      if (userJson[key].hasOwnProperty('name')) {
        nameValue = userJson[key].name
        break // Exit the loop once the mail property is found.
      }
    }
  }
  return nameValue
}

/**
 * Inputs text into a specific CKEditor instance on a Playwright-controlled page.
 *
 * This function waits for CKEditor elements to be present on the page,
 * then attempts to input the provided text into the specified editor instance.
 * If no instance number is provided, it defaults to the first editor found.
 *
 * @async
 * @param {import('playwright').Page} page - The Playwright Page object representing the web page.
 * @param {string} text - The text to be input into the CKEditor.
 * @param {number} [instanceNumber=0] - The zero-based index of the CKEditor instance
 *                                      to target (default is 0, i.e., the first instance).
 * @throws {Error} Throws an error if the specified CKEditor instance is
 *                 not found or if unable to input text.
 * @returns {Promise<void>}
 *
 * @example
 * // Input text into the first CKEditor instance
 * await inputTextIntoCKEditor(page, 'Hello, world!');
 *
 * // Input text into the third CKEditor instance (index 2)
 * await inputTextIntoCKEditor(page, 'Hello, third editor!', 2);
 */
async function inputTextIntoCKEditor(page, text, instanceNumber = 0) {
  // Wait for the text areas to appear.
  await page.waitForSelector('.ck-editor__editable')

  // Type into the specified CKEditor instance found on the page.
  await page.evaluate(
    ({ inputText, editorIndex }) => {
      const editorElements = document.querySelectorAll('.ck-editor__editable')
      if (editorElements.length > editorIndex) {
        const targetEditorElement = editorElements[editorIndex]

        // Attempt to get the CKEditor instance.
        const editorInstance = targetEditorElement.ckeditorInstance
              || Object.values(CKEDITOR.instances)[editorIndex]
              || Object.values(ClassicEditor.instances)[editorIndex]

        if (editorInstance) {
          // Set the data in the editor.
          if (typeof editorInstance.setData === 'function') {
            editorInstance.setData(inputText)
          } else if (typeof editorInstance.getData === 'function' && typeof editorInstance.insertHtml === 'function') {
            // For older CKEditor versions.
            editorInstance.setData('')
            editorInstance.insertHtml(inputText)
          } else {
            throw new Error('Unable to set data: setData method not found')
          }
        } else {
          throw new Error(`CKEditor instance not found at index ${editorIndex}`)
        }
      } else {
        throw new Error(`No CKEditor element found at index ${editorIndex}`)
      }
    },
    {
      inputText: text,
      editorIndex: instanceNumber,
    },
  )
}

/**
 * Log in via the login form.
 *
 * @param {object} page Page object.
 * @param {object} context Context object.
 * @param {object} account JSON object see structure of qaUserAccounts.json.
 */
async function logInViaForm(page, context, account) {
  await context.clearCookies()
  await page.goto(`${baseUrl}${atkConfig.logInUrl}`)
  await page.getByLabel('Username').fill(account.userName)
  await page.getByLabel('Password').fill(account.userPassword)
  await page.getByRole('button', { name: 'Log in' }).click()

  await page.waitForLoadState('domcontentloaded')
  const textContent = await page.textContent('body')
  await expect(textContent).toContain('Member for')

  // Keep the stored state in the support directory.
  // const authFile = atkConfig.supportDir + '/loginAuth.json'
  // await page.context().storageState({ path: authFile })
}

/**
 * Log in with user:login given a user id.
 *
 * @param {object} page Page object.
 * @param {object} context Context object.
 * @param {integer} uid Drupal user id.
 */
async function logInViaUli(page, context, uid) {
  let cmd = ''
  let url = ''

  await logOutViaUi(page, context)

  let newUid

  if (uid === undefined) {
    newUid = 1
  } else {
    newUid = uid
  }

  cmd = `user:login --uid=${newUid}`
  url = await execDrush(cmd, [], [`--uri=${baseUrl}`])

  await page.goto(url) // Drush returns fully formed URL.
}

/**
 * Log out user via the UI.
 *
 * @param {import('@playwright/test').Page} page Page object.
 */
async function logOutViaUi(page) {
  const url = `${baseUrl}${atkConfig.logOutUrl}`

  await page.goto(url)
  if (page.url().includes('confirm')) {
    await page.locator('input[value="Log out"]').click()
  }
}

/**
 * Set Drupal configuration via drush.
 *
 * @param {string} objectName Name of configuration category.
 * @param {string} key Name of configuration setting.
 * @param {*} value Value of configuration setting.
 */
async function setDrupalConfiguration(objectName, key, value) {
  const cmd = `cset -y ${objectName} ${key} ${value}`

  await execDrush(cmd)
}

export {
  createUserWithUserObject,
  deleteCurrentNodeViaUi,
  deleteNodeViaUiWithNid,
  deleteNodeWithNid,
  deleteUserWithEmail,
  deleteUserWithUid,
  deleteUserWithUserName,
  execDrush,
  execPantheonDrush,
  expectMessage,
  getDrushAlias,
  getUidWithEmail,
  getUsernameWithEmail,
  inputTextIntoCKEditor,
  logInViaForm,
  logInViaUli,
  logOutViaUi,
  setDrupalConfiguration,
}
