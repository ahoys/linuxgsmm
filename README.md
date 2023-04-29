# LinuxGSM master

This is a simple Node-application providing a REST-service for controlling your LinuxGSM instances remotely.

By sending a command like http://127.0.0.1:5000/api/exec with a body of `{ "command": "update" }`, you can for example update a LinuxGSM server.

My personal use case was to build a Discord-bot for a gaming community that would be able to control LinuxGSM instances from Discord.

## How to use

1. Pull this repo and install npm-dependencies `npm i --production`
2. Create an `.env` file and use the example below to fill it.
3. `npm run build` must be ran every time `.env` is updated. Do it now.
4. Now by running the build/linuxgsmm.js file with Node you have successfully started the application.

## Recommendations on running the application

- Use [nvm](https://github.com/nvm-sh/nvm#install--update-script) to install the latest LTS-version of Node.
- Use [pm2](https://pm2.keymetrics.io/docs/usage/quick-start/) to run this node-application. To make the application start automatically, check `pm2 startup`
- Make sure this application cannot be accessed from the Internet. There is no authentication included. Use a Discord-bot or some other service in-between to handle the communication to outside.

### Example .env

```
PORT=5000
PATH_TO_GSM=/home/armareforger/armarserver
ALLOWED_COMMANDS=start,stop,restart,update
```

- **PORT**: is the port to call. By using different ports, you can have multiple LinuxGSM instances controlled.
- **PATH_TO_GSM**: refers to LinuxGSM main executable that controls the LinuxGSM instance.
- **ALLOWED_COMMANDS**: refers to LinuxGSM commands that are allowed for the instance.
- **BODY_MAX_SIZE_IN_MB (optional)**: maximum size of the received request bodies. Default is 1.
- **PATH_TO_MIDDLEWARE (optional)**: Custom sh-script that will always run before LinuxGSM. Path to script.
- **ATTACHMENTS_PATH (optional)**: In case this service supports attachments, define the path for the files.
- **ATTACHMENTS_ALLOWED_EXTENSIONS (optional)**: Allowed extensions for the attachments. I.e. jpg,png,bmp. If empty, all are allowed.
- **ATTACHMENTS_ALLOWED_CONTENT_TYPES (optional)**: Allowed content-types for the attachments. I.e. image/jpeg,image/png. If empty, all are allwed.

## Security considerations

- Make sure this application cannot be accessed from the Internet. There is no authentication involved. Use a Discord-bot or some other service in-between to handle the communication to outside.
