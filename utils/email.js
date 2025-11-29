import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, 
    auth: {
        user: "nishadmp2512@gmail.com",
        pass: "sfpi rapc loma upen"
    }
});

const sendOTPEmail = async (recipientEmail, otpCode) => {
    const mailOptions = {
        from: `"SmartFloor Support" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject: 'SmartFloor: Your Account Verification Code',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ccc; max-width: 600px; margin: auto;">
                <h2 style="color: #333;">Verify Your SmartFloor Account</h2>
                <p>Thank you for registering. Please use the following code to complete your verification:</p>
                <div style="background: #f8f8f8; padding: 15px; text-align: center; border-radius: 5px;">
                    <strong style="font-size: 24px; color: #136dec;">${otpCode}</strong>
                </div>
                <p style="font-size: 12px; color: #999;">This code will expire in 5 minutes.</p>
            </div>
        `,
    };

    try {
        console.log(process.env.EMAIL_USER)
        console.log(process.env.EMAIL_PASSWORD)
        const info = await transporter.sendMail(mailOptions);
        console.log('OTP Email Sent: %s', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending OTP email:', error);
        return false;
    }
}

export default sendOTPEmail