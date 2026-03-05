
import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(process.cwd(), '.wolverine');
const JOBS_PATH = path.join(CONFIG_DIR, 'cron', 'jobs.json');

const newsletterJob = {
    id: "job_newsletter_daily",
    name: "Daily Intelligence Newsletter",
    prompt: "Search for today's top 5 global news stories in Tech, Science, and World Events. Summarize them into a cohesive 'Wolverine Intelligence Brief'. Use a professional but agentic tone. Mention any relevant ties to our current 'Wolverine' project development if applicable.",
    type: "recurring",
    schedule: "0 8 * * *",
    tz: "Asia/Kolkata",
    sessionTarget: "isolated",
    payloadKind: "agentTurn",
    enabled: true,
    priority: 0,
    delivery: "web",
    lastRun: null,
    lastResult: null,
    lastDuration: null,
    consecutiveErrors: 0,
    deleteAfterRun: false,
    nextRun: new Date(Date.now() + 60000).toISOString(), // Set to 1 minute from now for testing? No, user wants daily.
    status: "scheduled",
    lastOutputSessionId: null,
    createdAt: new Date().toISOString()
};

const store = {
    heartbeat: {
        enabled: true,
        intervalMinutes: 30,
        activeHoursStart: 8,
        activeHoursEnd: 22
    },
    jobs: [newsletterJob]
};

if (!fs.existsSync(path.dirname(JOBS_PATH))) {
    fs.mkdirSync(path.dirname(JOBS_PATH), { recursive: true });
}

fs.writeFileSync(JOBS_PATH, JSON.stringify(store, null, 2));
console.log('Successfully created Daily Newsletter job at', JOBS_PATH);
