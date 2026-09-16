# Email Outreach

A single-user personal email outreach and manual follow-up application.

## Purpose

- Add contacts
- Write and send personalized emails to one or many contacts
- Preview every personalized email before sending
- Track sent/opened/clicked emails
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
- Nodemailer (SMTP)
- Zod + React Hook Form
- iron-session (authentication)

## Setup

```bash
npm install
cp .env.example .env.local
# Configure .env.local with your SMTP settings
npm run dev
# In a separate terminal:
npm run worker
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `APP_USERNAME` | Login username |
| `APP_PASSWORD` | Login password |
| `MONGODB_URI` | MongoDB connection URI |
| `MONGODB_DB` | Database name (default: `email_outreach`) |
| `REDIS_URL` | Redis connection URL |
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP port (587 for TLS, 465 for SSL) |
| `SMTP_USER` | SMTP username / email |
| `SMTP_PASS` | SMTP password or app password |
| `EMAIL_FROM` | Sender email address |
| `EMAIL_FROM_NAME` | Sender display name |
| `APP_URL` | Public URL (required for tracking pixels) |
| `SEND_RATE_PER_MINUTE` | Sending rate limit (default: `10`) |
| `TRACKING_ENABLED` | Enable open/click tracking (`true`/`false`) |

## SMTP Examples

### Gmail
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your-app-password
```

### Outlook
```
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=you@outlook.com
SMTP_PASS=your-password
```

## Features

- **Bulk Import**: Paste contacts in various formats
- **Personalization**: Use `[[Name]]` in subjects and bodies
- **Pre-send Preview**: Review every personalized email before sending
- **Threaded Follow-ups**: Follow-ups include `In-Reply-To` and `References` headers
- **Open/Click Tracking**: Pixel-based tracking with cryptographic tokens
