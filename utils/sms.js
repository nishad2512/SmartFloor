import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const sendOtp = async (phone, otp) => {
  await client.messages.create({
    body: `Your verification code from SmartFloor is ${otp}`,
    from: process.env.TWILIO_PHONE,
    to: phone
  });
};
