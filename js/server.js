const path = require('path');
const dns = require('dns');
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

// Render's outbound network can hand back an IPv6 route to Gmail's SMTP
// relay that Render then can't actually reach (ENETUNREACH). Setting
// `family: 4` on the transporter alone doesn't always stop nodemailer from
// trying IPv6 — forcing it here, at the DNS-lookup level, is the stronger
// guarantee that actually works on Render.
try { dns.setDefaultResultOrder('ipv4first'); } catch (e) { /* Node < 18, ignore */ }

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
// Email — application link
// ---------------------------------------------------------------------
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // port 465 requires secure:true (465 = implicit TLS, 587 = STARTTLS)
    family: 4,
    // Belt-and-suspenders: force the actual socket's DNS lookup to IPv4,
    // instead of relying on `family` being forwarded correctly.
    lookup: (hostname, options, callback) => dns.lookup(hostname, { family: 4 }, callback),
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
            ? process.env.EMAIL_PASS.replace(/\s+/g, '')
            : ''
    }
});

transporter.verify((error, success) => {
    if (error) {
        console.error('SMTP VERIFY ERROR:', error);
    } else {
        console.log('SMTP SERVER IS READY');
    }
});

app.post('/api/send-email', async (req, res) => {
    const { email, college, applyUrl, website } = req.body;

    if (!email || !college) {
        return res.status(400).json({ success: false, message: 'Missing parameters' });
    }

    const applySection = applyUrl
        ? `<p style="margin: 20px 0;"><a href="${applyUrl}" style="background:#1f56c5;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">Go to Application Portal ↗</a></p>`
        : '';
    const websiteSection = website
        ? `<p>Official website: <a href="${website}">${website}</a></p>`
        : '';

    const mailOptions = {
        from: `"COMPASS Support" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Application Link - ${college}`,
        html: `
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
        `
    };

    try {
        await transporter.sendMail(mailOptions);
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
