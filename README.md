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

## Built with Claude

This project was planned in Claude and built entirely using Claude Code as a demonstration of AI-assisted Temporal workflow development.
