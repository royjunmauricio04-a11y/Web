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
// Email — application link, sent via Resend's HTTPS API instead of raw
// SMTP. Render's outbound network could not reach smtp.gmail.com on
// ports 587 or 465 no matter how the DNS/family settings were forced
// (repeated ENETUNREACH to Gmail's IPv6 address) — that's a network-level
// limitation of the Render service, not something fixable in code.
// Resend sends over plain HTTPS (port 443), which always works.
//
// Setup (one-time):
//   1. Sign up free at https://resend.com
//   2. Verify a sending domain (Resend -> Domains), OR while testing,
//      send FROM "onboarding@resend.dev" and TO only your own signup
//      email — Resend's shared test sender can't email anyone else
//      until you verify your own domain.
//   3. Create an API key (Resend -> API Keys).
//   4. On Render: Environment -> add RESEND_API_KEY = <your key>.
//      EMAIL_USER / EMAIL_PASS are no longer used and can be removed.
// ---------------------------------------------------------------------
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || 'COMPASS Support <onboarding@resend.dev>';

app.post('/api/send-email', async (req, res) => {
    const { email, college, applyUrl, website } = req.body;

    if (!email || !college) {
        return res.status(400).json({ success: false, message: 'Missing parameters' });
    }

    if (!RESEND_API_KEY) {
        console.error('RESEND_API_KEY is not set.');
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
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: RESEND_FROM,
                to: [email],
                subject: `Application Link - ${college}`,
                html: htmlBody
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Resend error:', data);
            return res.status(500).json({ success: false, message: data.message || 'Failed to send email' });
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
