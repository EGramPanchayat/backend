import nodemailer from "nodemailer";

export const sendOtpEmail = async (email, otpCode) => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  console.log(`[EMAIL SERVICE] Initializing OTP email to: ${email}`);

  // Fallback / mock mode if not configured
  if (!user || !pass || pass === "mock_pass") {
    console.log(`\n✉️ [MOCK EMAIL SERVICE] To: ${email}\n🔑 OTP Code: ${otpCode}\n(Note: Set EMAIL_USER and EMAIL_PASS in your .env for real SMTP delivery)\n`);
    return { mock: true, code: otpCode };
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });

  const mailOptions = {
    from: `"ग्रामपंचायत गोमेवाडी" <${user}>`,
    to: email,
    subject: "नागरिक पोर्टल लॉगिन - OTP संकेतशब्द",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
        <h2 style="color: #15803d; text-align: center; border-bottom: 2px solid #15803d; padding-bottom: 10px; margin-bottom: 20px;">
          ग्रामपंचायत गोमेवाडी नागरिक लॉगिन
        </h2>
        <p style="font-size: 16px; color: #334155; line-height: 1.6;">
          प्रिय नागरिक, <br /><br />
          आपल्या गोमेवाडी ग्रामपंचायत नागरिक पोर्टलवर लॉगिन करण्यासाठी खालील ६-अंकी वन-टाइम पासवर्ड (OTP) वापर करा:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b; background-color: #f1f5f9; padding: 10px 25px; border-radius: 10px; border: 1px solid #cbd5e1; display: inline-block;">
            ${otpCode}
          </span>
        </div>
        <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
          हा OTP कोड ५ मिनिटांसाठी वैध आहे. हा संकेतशब्द कोणाशीही सामायिक करू नका.
        </p>
        <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center; font-size: 12px; color: #94a3b8;">
          © ग्रामपंचायत गोमेवाडी, ता. आटपाडी, जि. सांगली
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL SERVICE] OTP successfully sent to ${email}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[EMAIL SERVICE ERROR] Failed to send email to ${email}:`, error.message);
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
    return { success: false, error: error.message };
  }
};
