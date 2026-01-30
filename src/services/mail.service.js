require('dotenv').config();
const nodemailer = require('nodemailer');

class MailService {
    constructor() {
        this.transport = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT, 10),
            secure: process.env.SMTP_SECURE === 'true', // usually false for port 587 (TLS), true for 465 (SSL)
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD
            }
        });

        // Verify SMTP connection on startup
        this.transport.verify((err, success) => {
            if (err) {
                console.error('Email transport error:', err);
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
