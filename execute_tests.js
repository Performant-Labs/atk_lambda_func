require('dotenv').config();
const { spawn } = require('child_process');
const { S3Client } = require('@aws-sdk/client-s3');
const { CloudWatchLogsClient, CreateLogStreamCommand, PutLogEventsCommand } = require('@aws-sdk/client-cloudwatch-logs');
const { Upload } = require('@aws-sdk/lib-storage');
const path = require('path');
const fs = require('fs');

// Must be in /tmp and the same as in the playwright config, can't import it here.
const testResultsPath = '/tmp/test-results/';

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const cloudWatchLogsClient = new CloudWatchLogsClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  const s3Bucket = process.env.AWS_S3_BUCKET;

  if (!event.url) {
    return {
      statusCode: 400,
      message: '"url" is missing',
    }
  }
  // Read in playwright.config.js
  process.env.BASE_URL = event.url;

  // Customize grep if needed
  const grep = event.grep ?? '@smoke';


  // Custom LogWatch which is different from the defalut (console) logs.
  // The perpose of it is to have predictable stream name
  const uuid = event.uuid;
  if (typeof uuid !== 'string' || !/[0-9a-z\-]{36}/.test(uuid)) {
    return {
      statusCode: 400,
      message: '"uuid" is missing or doesn\'t seem uuiddy enough',
    }
  }
  const params = {
    logGroupName: process.env.AWS_CLOUDWATCH_GROUP,
    logStreamName: uuid,
  };
  const command = new CreateLogStreamCommand(params);
  const response = await cloudWatchLogsClient.send(command);

  try {
    // Execute the Playwright tests
    const { code, message } = await runTests({ grep, }, params);

    // Report is not written, consider it an error and raise with command output
    if (!fs.existsSync(testResultsPath) || !fs.existsSync(`${testResultsPath}/index.json`)) {
      return {
        statusCode: 500,
        message,
      }
    }

    // Upload results to S3
    const resultUri = await uploadResultsToS3({
      bucket: s3Bucket,
      uuid: uuid,
    });

    return {
      statusCode: 200,
      message: `Tests executed with exit code ${code}`,
      resultUri,
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      message: error.toString(),
    };
  }
};

/**
 * Run the test, with the particular run params, and logging params.
 *
 * @param grep Grep in Playwright
 * @param logGroupName CloudWatch log group
 * @param logStreamName CloudWatch log stream
 * @return {Promise<{message: string, code: number}>} Commandline output
 */
async function runTests({ grep }, { logGroupName, logStreamName }) {
  return new Promise((resolve, reject) => {
    // Configure runner options / replace command to debug / ... here.
    exec('npx', [
      'playwright',
      'test',
      '--config=playwright.service.config.js',
      '--workers=10',
      `--grep=${grep}`,
    ], ({ code, output }) => {
      // Cut off npm update notice.
      let message = `${output}`.replaceAll(/npm notice[^\n]*\n/g, "");
      // Resolve command line output, and exit code.
      resolve({ message, code });
    }, {
      logGroupName,
      logStreamName,
    });
  });
}

/**
 * Similar to child_process.exec but with logging of stdout and stderr.
 *
 * @param cmd {string} Command to run.
 * @param args {string[]} List of string arguments.
 * @param callback {function({code: number, output: string}): *} Callback.
 * @param logGroupName CloudWatch log group
 * @param logStreamName CloudWatch log stream
 */
function exec(cmd, args, callback, { logGroupName, logStreamName }) {
  const childProcess = spawn(cmd, args, { stdio: 'pipe' });
  let output = '';
  let cursor = 0;

  const onAppendOutput = () => {
    let pos;
    const lines = [];
    while ((pos = output.indexOf('\n', cursor)) !== -1) {
      const line = output.substring(cursor,pos );

      lines.push(line);

      cursor = pos + 1;
    }

    // Send the lines as event(s) to the custom stream.
    const timestamp = new Date().getTime();
    const logEvents = lines.filter(line => line).map(line => ({
      timestamp,
      message: line,
    }));
    if (logEvents.length) {
      const params = {
        logGroupName,
        logStreamName,
        logEvents,
      };
      const command = new PutLogEventsCommand(params);
      // Do we need to wait logs before return function results??
      cloudWatchLogsClient.send(command);
    }
  }

  childProcess.stdout.on('data', (chunk) => {
    output += chunk.toString();
    onAppendOutput();
  });

  childProcess.stderr.on('data', (chunk) => {
    output += chunk.toString();
    onAppendOutput();
  });

  childProcess.on('close', (code) => callback({ code, output }));
}

async function uploadResultsToS3({ bucket, uuid }) {
  // Root of the report in the bucket.
  const root = `${uuid}`;

  // Upload result of index.json.
  let result;

  await walk(testResultsPath, async (filepath) => {
    // Path relative to testResultsPath. It will comprise path inside the bucket.
    const relativePath = filepath.replace(new RegExp(`${testResultsPath}/?`), '');
    const body = await fs.promises.readFile(filepath);
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: bucket,
        Key: `${root}/${relativePath}`,
        Body: body
      }
    });
    let output = await upload.done();
    if (relativePath === 'index.json') {
      result = output;
    }
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
  return fs.promises.readdir(dir).then(function (files) {
    return Promise.all(files.map(function (file) {
      const filepath = path.join(dir, file);
      return fs.promises.stat(filepath).then(function (stats) {
        if (stats.isDirectory()) {
          return walk(filepath, callback);
        } else if (stats.isFile()) {
          return callback(filepath, stats);
        }
      });
    }));
  });
}
