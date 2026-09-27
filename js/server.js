const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// ---------------------------------------------------------------------
// Serve the site itself from this same server.
// This is the fix for the old "hardcoded http://localhost:3000" bug:
// once this server also serves index.html/colleges.html/etc., every
// relative fetch("/api/...") call in the frontend (see js/config.js)
// automatically hits the right host — locally, on staging, or in
// production — with nothing to update by hand.
// ---------------------------------------------------------------------
const SITE_ROOT = path.join(__dirname, '..');
app.use(express.static(SITE_ROOT));

// ---------------------------------------------------------------------
// Email — application link, sent via MailerSend's HTTPS API instead of
// raw SMTP. Render's outbound network could not reach smtp.gmail.com on
// ports 587 or 465 no matter how the DNS/family settings were forced
// (repeated ENETUNREACH to Gmail's IPv6 address) — that's a network-level
// limitation of the Render service, not something fixable in code.
// MailerSend sends over plain HTTPS (port 443), which always works.
//
// Setup (one-time):
//   1. In MailerSend -> Domains, copy your trial/sandbox domain — it
//      looks like test-xxxxxxxxxxxxxxx.mlsender.net. Your sender address
//      is anything @ that domain, e.g. noreply@test-xxxx.mlsender.net.
//   2. While in trial/sandbox mode, MailerSend only lets you send TO the
//      email address(es) you've added as "Recipients" under that trial
//      domain (Domains -> your domain -> Recipients) — add your own
//      email there to test. This limit goes away once you verify a real
//      domain.
//   3. Create an API key (MailerSend -> API Tokens).
//   4. On Render -> Environment, add:
//        MAILERSEND_API_KEY   = <your API token>
//        MAILERSEND_FROM      = noreply@test-xxxx.mlsender.net  (yours)
// ---------------------------------------------------------------------
const MAILERSEND_API_KEY = process.env.MAILERSEND_API_KEY;
const MAILERSEND_FROM = process.env.MAILERSEND_FROM;

app.post('/api/send-email', async (req, res) => {
    const { email, college, applyUrl, website } = req.body;

    if (!email || !college) {
        return res.status(400).json({ success: false, message: 'Missing parameters' });
    }

    if (!MAILERSEND_API_KEY || !MAILERSEND_FROM) {
        console.error('MAILERSEND_API_KEY or MAILERSEND_FROM is not set.');
        return res.status(500).json({ success: false, message: 'Email service is not configured yet.' });
    }

    const applySection = applyUrl
        ? `<p style="margin: 20px 0;"><a href="${applyUrl}" style="background:#1f56c5;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">Go to Application Portal ↗</a></p>`
        : '';
    const websiteSection = website
        ? `<p>Official website: <a href="${website}">${website}</a></p>`
        : '';

    const htmlBody = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2>COMPASS Admission Request</h2>
            <p>Hello!</p>
            <p>Narito ang link para sa iyong application sa <strong>${college}</strong>.</p>
            ${applySection}
            ${websiteSection}
            <p>Sundin ang mga tagubilin sa portal para makumpleto ang iyong application.</p>
            <br>
            <p>Salamat,<br><strong>COMPASS Team</strong></p>
        </div>
    `;

    try {
        const response = await fetch('https://api.mailersend.com/v1/email', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MAILERSEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: { email: MAILERSEND_FROM, name: 'COMPASS Support' },
                to: [{ email }],
                subject: `Application Link - ${college}`,
                html: htmlBody
            })
        });

        // MailerSend returns 202 with an EMPTY body on success — only try
        // to parse JSON when there's actually an error to read.
        if (!response.ok) {
            let errorData = {};
            try { errorData = await response.json(); } catch (e) { /* empty body */ }
            console.error('MailerSend error:', errorData);
            return res.status(500).json({ success: false, message: errorData.message || 'Failed to send email' });
        }

        res.status(200).json({ success: true, message: 'Email sent successfully!' });
    } catch (error) {
        console.error('Email error:', error);
        res.status(500).json({ success: false, message: 'Failed to send email' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
