import axios from "axios";

const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY || "y7NvxpjsQVH9AultRBIqPKzFYd0JGMOTnrUD8ohf5XewiSLk4bbjTN6xVydXZ9CcFimYH0uR12M8Pr5o";

export const sendOtpSms = async (mobileNumber, otpCode) => {
  try {
    let phone = mobileNumber.toString().trim();
    if (phone.startsWith("+91")) {
      phone = phone.replace("+91", "");
    }
    phone = phone.replace(/\D/g, ""); // Keep only digits

    const response = await axios.get("https://www.fast2sms.com/dev/bulkV2", {
      params: {
        authorization: FAST2SMS_API_KEY,
        route: "otp",
        variables_values: otpCode,
        numbers: phone
      }
    });

    console.log(`[FAST2SMS] Sent OTP ${otpCode} to ${phone}. Response:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`[FAST2SMS ERROR] Failed to send OTP to ${mobileNumber}:`, error.response?.data || error.message);
    throw error;
  }
};
