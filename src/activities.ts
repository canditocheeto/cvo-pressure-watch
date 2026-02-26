import axios from 'axios';
import twilio from 'twilio';
import * as dotenv from 'dotenv';

dotenv.config();

export async function fetchBarometricPressure(lat: number, lon: number): Promise<number> {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
    params: {
      lat,
      lon,
      appid: apiKey,
      units: 'metric',
    },
  });

  return response.data.main.pressure as number;
}

export async function sendHeadacheAlert(message: string): Promise<string> {
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  const result = await client.messages.create({
    body: message,
    from: process.env.TWILIO_FROM_NUMBER!,
    to: process.env.ALERT_TO_NUMBER!,
  });

  return `SMS sent: ${result.sid}`;
}
