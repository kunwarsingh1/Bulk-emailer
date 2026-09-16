# Email Outreach

A single-user personal email outreach and manual follow-up application.

## Purpose

- Add contacts
- Write and send personalized emails to one or many contacts
- Preview every personalized email before sending
- Track sent/delivered/bounced/opened/clicked emails
- Store email conversations for every contact
- Return days or weeks later and write a manual follow-up
- Send follow-ups as part of the existing email thread

**This is NOT an automated sequence system.** There are no drip campaigns, no automated scheduling, no recurring emails. The user controls every follow-up manually.

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS + shadcn-style components
- MongoDB (Mongoose)
- Redis + BullMQ (background email sending)
- Resend (email provider with webhooks)
- Zod + React Hook Form
- iron-session (authentication)

## Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Configure .env.local with your Resend API key

# Run the dev server
npm run dev

# Run the email worker (in a separate terminal)
npm run worker
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `APP_USERNAME` | Login username |
| `APP_PASSWORD` | Login password |
| `SESSION_SECRET` | Optional. Auto-derived from APP_PASSWORD if not set |
| `MONGODB_URI` | MongoDB connection URI (e.g., `mongodb://localhost:27017`) |
| `MONGODB_DB` | Database name (default: `email_outreach`) |
| `REDIS_URL` | Redis connection URL (e.g., `redis://localhost:6379`) |
| `EMAIL_PROVIDER` | Email provider (`resend`) |
| `RESEND_API_KEY` | Resend API key |
| `RESEND_WEBHOOK_SECRET` | Resend webhook signing secret |
| `EMAIL_FROM` | Sender email address |
| `EMAIL_FROM_NAME` | Sender display name |
| `APP_URL` | Public URL (required for tracking pixels) |
| `SEND_RATE_PER_MINUTE` | Sending rate limit (default: `10`) |
| `TRACKING_ENABLED` | Enable open/click tracking (`true`/`false`) |

## Resend Configuration

### Domain Setup
1. Add and verify your domain at https://resend.com/domains
2. Set `EMAIL_FROM` to an address on your verified domain

### Webhooks
Configure webhooks in Resend dashboard:
- **Delivery events**: `https://yourdomain.com/api/webhook/events`
- **Inbound emails**: Create a route for `replies@yourdomain.com` → `https://yourdomain.com/api/webhook/inbound`
- Set the webhook secret and add it to `RESEND_WEBHOOK_SECRET`

### Tracking
Set `APP_URL` to your publicly accessible URL. This is required for open tracking pixels and click tracking redirects.

## Architecture

```
Contact
   └── Conversation
          └── Email (Messages)
                 └── Events
```

- **Contacts**: People you're reaching out to
- **Conversations**: Email threads with a contact
- **Emails**: Individual messages (inbound/outbound)
- **Events**: Delivery status changes

## Background Worker

The email worker processes sending jobs from Redis:

```bash
npm run worker
```

The worker rate-limits sending to respect provider limits. It continues processing even if the browser is closed.

## Features

- **Bulk Import**: Paste contacts in various formats (CSV, angle-bracket, email-only)
- **Personalization**: Use `[[Name]]` in subjects and bodies
- **Pre-send Preview**: Review every personalized email before sending
- **Threaded Follow-ups**: Follow-ups include `In-Reply-To` and `References` headers
- **Open/Click Tracking**: Pixel-based tracking with cryptographic tokens
- **Delivery Webhooks**: Real bounce/complaint handling from Resend
- **Inbound Replies**: Received replies appear in the conversation thread
- **Suppression List**: Bounced/complained addresses are automatically suppressed
