import nodemailer from 'nodemailer';

// Create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

interface EmailOptions {
    to: string | string[];
    subject: string;
    text: string;
    html?: string;
}

export const sendReminderEmail = async ({ to, subject, text, html }: EmailOptions) => {
    // If no credentials, log to console (Dev mode / No SMTP setup)
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log('---------------------------------------------------');
        console.log('📧 [MOCK EMAIL] SMTP Credentials missing. Logging email:');
        console.log(`To: ${Array.isArray(to) ? to.join(', ') : to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body: ${text}`);
        console.log('---------------------------------------------------');
        return { success: true, mock: true };
    }

    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || '"Loud Baby Ops" <noreply@loudbaby.com>',
            to: Array.isArray(to) ? to.join(', ') : to,
            subject,
            text,
            html,
        });

        console.log('Message sent: %s', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error };
    }
};
