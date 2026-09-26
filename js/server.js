const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Root route para sa Health Check
app.get('/', (req, res) => {
    res.status(200).send('WebEnroll Email Server is running.');
});

// API Endpoint para sa Email Request
app.post('/api/send-email', async (req, res) => {
    const { email, college, applyUrl, website } = req.body;

    if (!email || !college) {
        return res.status(400).json({ success: false, message: 'Missing parameters' });
    }

    // Nodemailer Transporter
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, '') : ''
        }
    });

    const applySection = applyUrl
        ? `<p style="margin: 20px 0;"><a href="${applyUrl}" style="background:#1f56c5;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">Go to Application Portal ↗</a></p>`
        : '';
    const websiteSection = website
        ? `<p>Official website: <a href="${website}">${website}</a></p>`
        : '';

    const mailOptions = {
        from: `"WebEnroll Support" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Application Link - ${college}`,
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2>WebEnroll Admission Request</h2>
                <p>Hello!</p>
                <p>Narito ang link para sa iyong application sa <strong>${college}</strong>.</p>
                ${applySection}
                ${websiteSection}
                <p>Sundin ang mga tagubilin sa portal para makumpleto ang iyong application.</p>
                <br>
                <p>Salamat,<br><strong>WebEnroll Team</strong></p>
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
