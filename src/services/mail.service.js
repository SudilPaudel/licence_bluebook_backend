require('dotenv').config();
const nodemailer = require('nodemailer');

class MailService {
    constructor() {
        // Build transport options using environment values.  
        // `secure` should normally be `false` for port 587 (STARTTLS) and `true` for port 465 (SSL).
        const smtpPort = parseInt(process.env.SMTP_PORT, 10) || 587;
        const smtpSecure = String(process.env.SMTP_SECURE).toLowerCase() === 'true';

        this.transport = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: smtpPort,
            secure: smtpSecure, // use explicit env flag rather than hard‑coded true
            requireTLS: smtpSecure ? true : false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD
            }
        });

        // Log configuration (mask password) so developers can see what settings are being used
        console.log('Initializing mail transport with host=%s port=%s secure=%s user=%s',
            process.env.SMTP_HOST,
            smtpPort,
            smtpSecure,
            process.env.SMTP_USER
        );

        // Verify SMTP connection on startup
        this.transport.verify((err, success) => {
            if (err) {
                console.error('Email transport error (verify):', err);
            } else {
                console.log('Mail service is ready to send messages.');
            }
        });
    }

    sendEmail = async (to, subject, htmlMessage, attachments = []) => {
        try {
            const mailOptions = {
                from: process.env.SMTP_FROM,
                to,
                subject,
                html: htmlMessage,
                attachments
            };

            const info = await this.transport.sendMail(mailOptions);
            console.log('Email sent:', info.messageId);
            return info;
        } catch (error) {
            console.error('Error sending email:', error);
            throw error; // Re-throw so calling code can handle it
        }
    };
}

const mailSvc = new MailService();
module.exports = mailSvc;
