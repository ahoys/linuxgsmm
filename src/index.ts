import fs from 'fs';
import express from 'express';
import superagent from 'superagent';
import { execFile } from 'child_process';
import { print } from 'logscribe';
import { urlencoded, json } from 'body-parser';

const PORT = process.env.PORT;
const PATH_TO_GSM = process.env.PATH_TO_GSM;
const ALLOWED_COMMANDS = process.env.ALLOWED_COMMANDS;
const BODY_MAX_SIZE_IN_MB = process.env.BODY_MAX_SIZE_IN_MB ?? '1';
const PATH_TO_MIDDLEWARE = process.env.PATH_TO_MIDDLEWARE;
const ATTACHMENTS_PATH = process.env.ATTACHMENTS_PATH;
const ATTACHMENTS_ALLOWED_EXTENSIONS =
  process.env.ATTACHMENTS_ALLOWED_EXTENSIONS;
const ATTACHMENTS_ALLOWED_CONTENT_TYPES =
  process.env.ATTACHMENTS_ALLOWED_CONTENT_TYPES;

if (typeof PORT !== 'string' || !PORT.trim().length) {
  throw new Error('Invalid or missing process.env.PORT!');
}

if (typeof PATH_TO_GSM !== 'string' || !fs.existsSync(PATH_TO_GSM)) {
  throw new Error(
    'Invalid or missing process.env.PATH_TO_GSM! Does the file exist?'
  );
}

if (typeof ALLOWED_COMMANDS !== 'string' || !ALLOWED_COMMANDS.trim().length) {
  throw new Error('Invalid or missing process.env.ALLOWED_COMMANDS!');
}

if (
  typeof BODY_MAX_SIZE_IN_MB === 'string' &&
  (BODY_MAX_SIZE_IN_MB.trim() === '' ||
    isNaN(Number(BODY_MAX_SIZE_IN_MB)) ||
    Number(BODY_MAX_SIZE_IN_MB) === 0)
) {
  throw new Error('Invalid process.env.BODY_MAX_SIZE_IN_MB!');
}

if (
  typeof PATH_TO_MIDDLEWARE === 'string' &&
  !fs.existsSync(PATH_TO_MIDDLEWARE)
) {
  throw new Error(
    "PATH_TO_MIDDLEWARE was given but the location doesn't exist!"
  );
}

if (typeof ATTACHMENTS_PATH === 'string' && !fs.existsSync(ATTACHMENTS_PATH)) {
  throw new Error("ATTACHMENTS_PATH was given but the location doesn't exist!");
}

// Only pre-defined commands are usable.
const allowedCommands = (ALLOWED_COMMANDS || '')
  .split(',')
  .filter((f) => f.length);

const allowedExtensions = (ATTACHMENTS_ALLOWED_EXTENSIONS || '')
  .split(',')
  .filter((f) => f.length);

const allowedContentTypes = (ATTACHMENTS_ALLOWED_CONTENT_TYPES || '')
  .split(',')
  .filter((f) => f.length);

/**
 * Returns something if awake.
 * @param req
 * @param res
 * @returns
 */
const ping = (req: express.Request, res: express.Response) =>
  res.status(200).end();

/**
 * Executes the command if it is allowed.
 * @param req
 * @param res
 */
const exec = (req: express.Request, res: express.Response) => {
  try {
    const { command } = req?.body || {};
    if (typeof command === 'string' && allowedCommands.includes(command)) {
      const runExecLinuxGSM = (mwStdout?: string, mwStderr?: string) => {
        execFile(PATH_TO_GSM, [command], (error, stdout, stderr) => {
          if (stderr) {
            print(stderr);
          }
          if (error) {
            print(error);
          }
          res.status(200).send({ stdout, stderr, mwStdout, mwStderr });
        });
      };
      if (PATH_TO_MIDDLEWARE) {
        // Middleware should be ran before LinuxGSM.
        execFile(PATH_TO_MIDDLEWARE, [command], (error, stdout, stderr) => {
          if (stderr) {
            print(PATH_TO_MIDDLEWARE, stderr);
          }
          if (error) {
            print('PATH_TO_MIDDLEWARE', error);
          } else {
            runExecLinuxGSM(stdout, stderr);
          }
        });
      } else {
        // No middleware.
        runExecLinuxGSM();
      }
    } else {
      print('Request ' + command + ' denied.');
      res.status(401).end();
    }
  } catch (err) {
    print(err);
  }
};

/**
 * Fetches attachments and streams them into the given path.
 */
const attachment = (req: express.Request, res: express.Response) => {
  try {
    const { url, name, size, contentType } = req?.body || {};
    const fileSize =
      !isNaN(Number(size)) && Number(size) > 0 ? Number(size) / 1024 / 1024 : 0;
    print('Receiving a request for a new attachment.', {
      url,
      name,
      size,
      fileSize,
      contentType,
    });
    if (typeof url !== 'string') {
      const errMessage = 'Attachment rejected. Reason: url is not a string.';
      print(errMessage);
      return res.status(400).send(errMessage);
    } else if (typeof name !== 'string') {
      const errMessage = 'Attachment rejected. Reason: name is not a string.';
      print(errMessage);
      return res.status(400).send(errMessage);
    } else if (fileSize > Number(BODY_MAX_SIZE_IN_MB)) {
      const errMessage = `Attachment rejected. Reason: filesize of ${Number(
        fileSize
      )} is larger than ${Number(BODY_MAX_SIZE_IN_MB)}.`;
      print(errMessage);
      return res.status(400).send(errMessage);
    } else if (allowedContentTypes.includes(String(contentType))) {
      const errMessage = `The given file is of wrong content-type: ${String(
        contentType
      )}`;
      print(errMessage);
      return res.status(400).send(errMessage);
    }
    const nameSplit = name.split('.');
    const unsafeExt = nameSplit[nameSplit.length - 1];
    if (allowedExtensions.length && !allowedExtensions.includes(unsafeExt)) {
      const errMessage = `The given file is of wrong filetype: ${String(
        unsafeExt
      )}`;
      print(errMessage);
      return res.status(400).send(errMessage);
    }
    const pathWithSlash = ATTACHMENTS_PATH?.endsWith('/')
      ? ATTACHMENTS_PATH
      : ATTACHMENTS_PATH + '/';
    const stream = fs.createWriteStream(pathWithSlash + name);
    stream.on('open', () => {
      print('Opening a tunnel for the attachment:', url);
    });
    stream.on('finish', () => {
      print('Done. Received', name);
      res.status(200).end();
    });
    stream.on('error', (err) => {
      print(err);
      res.status(500).end();
    });
    if (!stream.closed) {
      superagent.get(url).pipe(stream);
    }
  } catch (err) {
    print(err);
  }
};

/**
 * Runs the server application.
 */
const bootstrap = () => {
  try {
    const app = express();
    app.use(
      urlencoded({
        extended: true,
        limit: BODY_MAX_SIZE_IN_MB + 'mb',
      })
    );
    app.use(
      json({
        limit: BODY_MAX_SIZE_IN_MB + 'mb',
      })
    );
    app.get('/api/ping', (req, res) => ping(req, res));
    app.post('/api/exec', (req, res) => exec(req, res));
    if (ATTACHMENTS_PATH) {
      app.post('/api/attachment', (req, res) => attachment(req, res));
    }
    app.listen(PORT, () => {
      print(
        'Path to LinuxGSM: ' + PATH_TO_GSM,
        'Allowed commands: ' + allowedCommands.join(', ') + '.',
        'Listening http://localhost:' + PORT
      );
      print('Listening http://localhost:' + PORT);
    });
  } catch (err) {
    print(err);
  }
};

bootstrap();
