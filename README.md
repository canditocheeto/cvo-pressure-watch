# cvo-pressure-watch

A Temporal workflow that monitors barometric pressure at a configured location and sends SMS alerts when a significant pressure drop is detected, helping you stay ahead of barometric pressure headaches.

## How it works

The workflow runs on a 4-hour cycle using Temporal's Durable Execution. Each cycle it:

1. Fetches the current barometric pressure from OpenWeatherMap
2. Compares it to the previous reading stored in workflow state (no external database needed)
3. If the pressure has dropped more than the configured threshold (default 5 hPa), sends an SMS via Twilio advising you to take Advil
4. Loops every 4 hours for ~30 days, then uses `continueAsNew` to reset workflow history while carrying the last pressure reading forward into the next month

There is no database. Temporal's Durable Execution *is* the persistence layer. The workflow remembers the last pressure reading as part of its own state.

## Stack

- **Temporal TypeScript SDK** for workflow orchestration
- **OpenWeatherMap API** for barometric pressure data
- **Twilio** for SMS alerts
- **Railway** for hosting the worker

## Setup

### Prerequisites

- Node.js 20+
- A Temporal Cloud namespace with an API key
- An OpenWeatherMap API key (free tier)
- A Twilio account with a phone number
- A Railway account

### Environment variables

Copy `.env.example` to `.env` and fill in your values:

```
TEMPORAL_ADDRESS=your-namespace.tmprl.cloud:7233
TEMPORAL_NAMESPACE=your-namespace
TEMPORAL_API_KEY=your-temporal-api-key

OPENWEATHER_API_KEY=your-openweather-api-key

TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_FROM_NUMBER=+1234567890
ALERT_TO_NUMBER=+1234567890
```

### Install dependencies

```bash
npm install
```

### Run locally

Start the worker:

```bash
npm run start:worker
```

In a separate terminal, start the workflow:

```bash
npm run start:client
```

### Test your Twilio setup

With the worker running, send a test SMS to verify your Twilio credentials and phone numbers are configured correctly:

```bash
npm run test:alert
```

This fires a one-shot workflow that sends a test message and prints the Twilio message SID on success. Each run uses a unique workflow ID so it can be run as many times as needed.

## Deploy to Railway

1. Push the code to GitHub
2. Create a new project in the Railway UI
3. Connect the GitHub repo (`canditocheeto/cvo-pressure-watch`)
4. Add all environment variables from `.env.example` in the Railway service settings
5. Railway will use Nixpacks to build and deploy the worker automatically

The worker is a long-running process, not a web server. No PORT configuration is needed.

## Configuration

The workflow accepts the following parameters (set in `src/client.ts`):

- **lat / lon** - coordinates for the weather check (set to your target location in `src/client.ts`)
- **pressureDropThreshold** - minimum pressure drop in hPa to trigger an alert (default: 5)
- **previousPressure** - initial previous reading, set to null on first run

## How this was built

This project was built entirely using Claude Code in the terminal. The following prompt was used to generate the initial project structure, after which a few follow-up commands handled Railway deployment and refinements.

### The prompt

```
Create a Temporal TypeScript project called cvo-pressure-watch. This project monitors
barometric pressure and sends SMS alerts when the pressure drops significantly. The worker
will be deployed to Railway.

Project structure:
- src/workflows.ts - the workflow
- src/activities.ts - the activities
- src/worker.ts - the worker
- src/client.ts - a client script to start the workflow
- .env - actual env file with placeholder values I can fill in (add to .gitignore)
- .env.example - same as .env but with placeholder values, safe to commit
- .gitignore - include node_modules, .env, dist
- tsconfig.json
- package.json

Activities (src/activities.ts):

1. fetchBarometricPressure(lat, lon) - calls the OpenWeatherMap current weather API
   (api.openweathermap.org/data/2.5/weather) with the given coordinates and returns the
   barometric pressure in hPa. Uses OPENWEATHER_API_KEY from env.

2. sendHeadacheAlert(message) - sends an SMS via Twilio using TWILIO_ACCOUNT_SID,
   TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER, and ALERT_TO_NUMBER from env. Returns a
   confirmation string.

Workflow (src/workflows.ts):

- Name: pressureWatchWorkflow
- Inputs: lat: number, lon: number, pressureDropThreshold: number, previousPressure: number | null
- The workflow runs in an internal loop (do not use continueAsNew as a loop mechanism):
  1. Fetch current barometric pressure
  2. If previousPressure exists and the drop (previousPressure - currentPressure) exceeds
     the threshold, call sendHeadacheAlert with a message like: "⚠️ Barometric pressure is
     dropping fast. It dropped from {previous} to {current} hPa. Consider taking Advil now
     before a headache hits."
  3. Update previousPressure to the current reading
  4. Sleep for 4 hours using sleep from @temporalio/workflow
  5. After ~30 days of looping (180 iterations at 4 hours each), call continueAsNew to
     reset the workflow execution history, passing the current pressure as the new
     previousPressure. This keeps the event history from growing unbounded.

Worker (src/worker.ts):
- Connects to Temporal Cloud using API key authentication only. No mTLS, no certificates,
  no file paths.
- Uses TEMPORAL_ADDRESS and TEMPORAL_NAMESPACE from env
- Uses TEMPORAL_API_KEY from env, passed via the apiKey connection option (this sends it
  as a Bearer token internally)
- The connection should use TLS (since it's Temporal Cloud) but authenticate via API key,
  not client certificates
- IMPORTANT: For workflowsPath, use require.resolve('./workflows') NOT
  path.resolve(__dirname, './workflows'). path.resolve does pure string manipulation and
  strips the .ts extension, causing ENOENT errors on Railway. require.resolve correctly
  resolves to workflows.ts via tsx's module hooks.
- Registers the workflow and activities
- Uses task queue cvo-pressure-watch

Client (src/client.ts):
- Starts the workflow with configurable lat/lon coordinates
- Uses a pressure drop threshold of 5 hPa
- Passes null as the initial previousPressure
- Connects to Temporal Cloud using the same API key authentication as the worker. No mTLS,
  no certificates.
- IMPORTANT: Handle WorkflowExecutionAlreadyStartedError gracefully. Since this is a
  singleton monitor workflow, if the workflow is already running, catch the error and log
  "Workflow already running, skipping start." Do not crash.

Railway deployment:
- Add a railway.json to the project root to configure the deployment:
  {
    "$schema": "https://railway.app/railway.schema.json",
    "build": { "builder": "NIXPACKS" },
    "deploy": {
      "startCommand": "npm run start:worker",
      "restartPolicyType": "ON_FAILURE",
      "restartPolicyMaxRetries": 10
    }
  }
- No Dockerfile needed. Railway uses Nixpacks and will run npm run start:worker via
  railway.json.
- The worker is a long-running process, not a web server, so no PORT is needed.
- To deploy: run railway init, then railway add --service <name> --repo <owner>/<repo>,
  then set all environment variables with railway variables set. Railway will auto-deploy
  from the GitHub repo on every push.
- IMPORTANT: When setting long env vars (like JWT tokens) via railway variables set, do
  not inline them as shell arguments — they will be silently truncated. Read them from the
  file instead:
  VALUE=$(grep KEY .env | cut -d= -f2-) && railway variables set KEY="$VALUE"

.env:

TEMPORAL_ADDRESS=your-namespace.tmprl.cloud:7233
TEMPORAL_NAMESPACE=your-namespace
TEMPORAL_API_KEY=your-temporal-api-key

OPENWEATHER_API_KEY=your-openweather-api-key

TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_FROM_NUMBER=+1234567890
ALERT_TO_NUMBER=+1234567890

Use dotenv for env loading. Use tsx for running TypeScript directly. Add npm scripts:
- start:worker (tsx src/worker.ts)
- start:client (tsx src/client.ts)
- test:alert (tsx src/test-alert.ts) — a one-shot workflow that sends a test SMS to verify
  Twilio is configured correctly. Add a testAlertWorkflow to workflows.ts and a
  src/test-alert.ts client script that starts it, awaits the result, and prints the Twilio
  message SID.
```

### What happened next

Claude Code scaffolded the project, wrote all source files, and installed dependencies. From there a few interactive follow-up steps were needed: filling in `.env` values, setting up the Railway project via the CLI, and a couple of small fixes discovered during deployment (corrupted API key when setting env vars inline, and the `workflowsPath` ENOENT issue). The corrections from those fixes are already incorporated into the prompt above.

Total time from prompt to deployed workflow: under 15 minutes.
