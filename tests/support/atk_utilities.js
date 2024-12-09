import fs from 'fs';
import YAML from 'yaml';


export {
  createRandomString,
  getRandomUser,
  readYAML
}

/**
 * Return a string of random characters of specified length.
 *
 * @param length        int   Length of string to return.
 * @returns
 */
function createRandomString (length) {
  let result = ''
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const charactersLength = characters.length

  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}

/**
 * Read data from a YAML file located in tests/data.
 * @param filename {string}
 * @return {object}
 */
function readYAML(filename) {
  const file = fs.readFileSync(`tests/data/${filename}`, 'utf8');
  return YAML.parse(file);
}

/**
 * Return a user object with random name, email, and password.
 * @return {{userRoles: *[], userPassword: string, userEmail: string, userName: string}}
 */
function getRandomUser() {
  const name1 = createRandomString(6);
  const name2 = createRandomString(6);
  return {
    userName: `${name1} ${name2}`,
    userEmail: `${name1.toLowerCase()}.${name2.toLowerCase()}@ethereal.email`,
    userPassword: createRandomString(18),
    userRoles: [],
  }
}
