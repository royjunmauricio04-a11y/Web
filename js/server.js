const path = require('path');
const fs = require('fs');
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const multer = require('multer');
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
// File uploads (TOR / Enrollment Form / TCR)
// Saved to disk under uploads/, served back out at /uploads/<filename>.
// This is what js/documents.js on profile.html actually calls — it used
// to point at an endpoint that didn't exist.
// ---------------------------------------------------------------------
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOAD_DIR));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const safeDocType = (req.body.docType || 'file').replace(/[^a-z0-9]/gi, '');
        const safeUid = (req.body.uid || 'unknown').replace(/[^a-zA-Z0-9]/g, '');
        const ext = path.extname(file.originalname) || '';
        cb(null, `${safeUid}_${safeDocType}_${Date.now()}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB, matches documents.js's own check
    fileFilter: (req, file, cb) => {
        const ok = file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';
        cb(ok ? null : new Error('Only PDF or image files are allowed'), ok);
    }
});

app.post('/api/upload-document', (req, res) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file received' });
        }
        res.status(200).json({
            success: true,
            fileName: req.file.originalname,
            url: `/uploads/${req.file.filename}`
        });
    });
});

// ---------------------------------------------------------------------
// Email — application link
// ---------------------------------------------------------------------
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        // Gmail App Passwords are often copy-pasted with spaces
        // ("abcd efgh ijkl mnop") — strip them so auth doesn't fail.
        pass: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, '') : ''
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
