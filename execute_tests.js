require('dotenv').config();
const { exec } = require('child_process');
const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { join } = require('path');
const fs = require('fs').promises;

const s3Client = new S3Client({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  const s3Bucket = process.env.AWS_S3_BUCKET;

  if (!event.url) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'Invalid payload',
        error: '"url" is missing'
      }),
    }
  }
  // Read in playwright.config.js
  process.env.BASE_URL = event.url;

  try {
    // Execute the Playwright tests
    const outputObj = await runTests();
    const jsonOutput = outputObj.stdout;
    const code = outputObj.code;

    // Upload results to S3
    const resultUri = await uploadResultsToS3(jsonOutput, s3Bucket);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Tests executed with exit code ${code}`,
        resultUri,
      }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'An error occurred during testing',
        error: error.toString(),
      }),
    };
  }
};

async function runTests() {
  return new Promise((resolve, reject) => {
    // Run a single test. Be aware of timeout here!!! TODO
    exec('npx playwright test --config=playwright.service.config.js --reporter=json --grep=@ATK-PW-1000', (error, stdout, stderr) => {
    // exec('npx playwright test --config=playwright.service.config.js --reporter=json --grep=@ATK-PW-1000', (error, stdout, stderr) => {
    // exec('env', (error, stdout, stderr) => {
      // Playwright Testing Service spoils stdout, so fix it.
      const stdout1 = stdout.replace(/^[^{]*/, '');

      // Resolve if stdout is valid json (even if test failed or raised an error)
      // (Because I want report anyway, later to figure out result format.)
      let ok = true;
      try {
        JSON.parse(stdout1);
      } catch (_) {
        ok = false;
      }
      if (!ok) {
        reject(`Error executing tests: ${stderr}${stdout}`);
        return;
      }
      // Resolve JSON report, and exit code.
      resolve({ stdout: stdout1, stderr, code: error?.code ?? 0 });
    });
  });
}

async function uploadResultsToS3(outputJson, bucket) {
  // Must be consistent with playwright.config.js.
  const testResultsPath = '/tmp/test-results';

  // Upload index.json (maybe should be HTML???)
  // and all files from testResultsPath.
  const root = `results/${Date.now()}`;
  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: bucket,
      Key: `${root}/index.json`,
      Body: outputJson
    }
  });

  const result = await upload.done();

  await walk(testResultsPath, async (filepath) => {
    // Relative path but starting with "/"
    const relativePath = filepath.replace(testResultsPath, '');
    const body = await fs.readFile(filepath);
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: bucket,
        Key: `${root}${relativePath}`,
        Body: body
      }
    });
    await upload.done();
  });

  return result.Location;
}

/**
 * @callback callback
 * @param filename {string}
 * @param stats {import('fs').Stats}
 */

/**
 * Walk.
 *
 * @param dir {string}
 * @param callback {callback}
 * @return {Promise<*>}
 */
function walk(dir, callback) {
  return fs.readdir(dir).then(function (files) {
    return Promise.all(files.map(function (file) {
      const filepath = join(dir, file);
      return fs.stat(filepath).then(function (stats) {
        if (stats.isDirectory()) {
          return walk(filepath, callback);
        } else if (stats.isFile()) {
          return callback(filepath, stats);
        }
      });
    }));
  });
}
