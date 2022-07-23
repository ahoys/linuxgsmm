# LinuxGSM master

This is a simple Node-application that enables remote control for LinuxGSM instances.

By sending a command like http://127.0.0.1:5000/api/exec with a body of `{ "command": "update" }`, you can for example update a LinuxGSM server.

My personal use case was to provide these linuxgsmm instances to a Discord-bot, which enables a community controlled gaming server.

## How to use

1. Pull this repo and install npm-dependencies `npm i`
2. Create an .env file and use the example below to fill it.
3. `npm run build`
4. By running the build/linuxgsmm.js file you have successfully started the application.

### Example .env

```
PORT=5000
PATH_TO_GSM=/home/armareforger/armarserver
ALLOWED_COMMANDS=start,stop,restart,update
PATH_TO_LOGS=/home/armareforger/linuxgsmm/logs/
```

- **PORT** is the port to call. By using different ports, you can have multiple LinuxGSM instances controlled.
- **PATH_TO_GSM** refers to LinuxGSM main executable that controls the LinuxGSM instance.
- **ALLOWED_COMMANDS** refers to LinuxGSM commands that are allowed for the instance.
- **PATH_TO_LOGS** failures etc will generate log-files that will be stored here.

## Recommendations

- Make sure the port doesn't have a public access. There's no authentication.

## Requirements

- Linux server running LinuxGSM servers.
- Node >= 12.
