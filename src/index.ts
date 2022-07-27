import fs from 'fs';
import express from 'express';
import { execFile } from 'child_process';
import { setLogPrefix, setLogDirPath, logprint, log, print } from 'logscribe';
import { urlencoded, json } from 'body-parser';

setLogPrefix('linuxgsmm');

const PORT = process.env.PORT;
const PATH_TO_GSM = process.env.PATH_TO_GSM;
const ALLOWED_COMMANDS = process.env.ALLOWED_COMMANDS;
const PATH_TO_LOGS = process.env.PATH_TO_LOGS;
const PATH_TO_MIDDLEWARE = process.env.PATH_TO_MIDDLEWARE;

if (typeof PORT !== 'string' || !PORT.trim().length) {
  throw new Error('Invalid or missing process.env.PORT!');
}

if (typeof PATH_TO_GSM !== 'string' || !fs.existsSync(PATH_TO_GSM)) {
  throw new Error(
    'Invalid or missing process.env.PATH_TO_GSM! Does the file exist?'
  );
}

if (typeof PATH_TO_LOGS !== 'string' || !fs.existsSync(PATH_TO_LOGS)) {
  throw new Error(
    'Invalid or missing process.env.PATH_TO_LOGS! Does the folder exist?'
  );
}

if (typeof ALLOWED_COMMANDS !== 'string' || !ALLOWED_COMMANDS.trim().length) {
  throw new Error('Invalid or missing process.env.ALLOWED_COMMANDS!');
}

if (
  typeof PATH_TO_MIDDLEWARE === 'string' &&
  !fs.existsSync(PATH_TO_MIDDLEWARE)
) {
  throw new Error("PATH_TO_MIDDLEWARE was given but it doesn't exist!");
}

setLogDirPath(PATH_TO_LOGS ?? __dirname);

// Only pre-defined commands are usable.
const allowedCommands = (ALLOWED_COMMANDS || '')
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
            log(stderr);
          }
          if (error) {
            logprint(error);
          }
          res.status(200).send({ stdout, stderr, mwStdout, mwStderr });
        });
      };
      if (PATH_TO_MIDDLEWARE) {
        // Middleware should be ran before LinuxGSM.
        execFile(PATH_TO_MIDDLEWARE, [command], (error, stdout, stderr) => {
          if (stderr) {
            log(PATH_TO_MIDDLEWARE, stderr);
          }
          if (error) {
            logprint('PATH_TO_MIDDLEWARE', error);
          } else {
            runExecLinuxGSM(stdout, stderr);
          }
        });
      } else {
        // No middleware.
        runExecLinuxGSM();
      }
    } else {
      logprint('Request ' + command + ' denied.');
      res.status(401).end();
    }
  } catch (err) {
    logprint(err);
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
        limit: '1mb',
      })
    );
    app.use(
      json({
        limit: '1mb',
      })
    );
    app.get('/api/ping', (req, res) => ping(req, res));
    app.post('/api/exec', (req, res) => exec(req, res));
    app.listen(PORT, () => {
      log(
        'Path to LinuxGSM: ' + PATH_TO_GSM,
        'Allowed commands: ' + allowedCommands.join(', ') + '.',
        'Listening http://localhost:' + PORT
      );
      print('Listening http://localhost:' + PORT);
    });
  } catch (err) {
    logprint(err);
  }
};

bootstrap();
