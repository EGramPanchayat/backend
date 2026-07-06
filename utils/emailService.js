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
    from: `"Grampanchayat Gomevadi" <${user}>`,
    to: email,
    subject: "Gomevadi Citizen Portal Login - OTP Code",
    html: `
      <div style="background-color: #f8fafc; padding: 40px 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;">
          <!-- Brand Header -->
          <div style="background-color: #15803d; padding: 32px 24px; text-align: center;">
            <img src="${process.env.FRONTEND_URL || 'https://www.gpgomevadi.in'}/images/satyamev.jpg" alt="Logo" style="width: 64px; height: 64px; border-radius: 50%; border: 3px solid #ffffff; object-fit: cover; margin-bottom: 12px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);" />
            <h2 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
              Grampanchayat Gomevadi
            </h2>
            <p style="color: #bbf7d0; margin: 4px 0 0; font-size: 13px; font-weight: 600;">
              Citizen Portal Authentication
            </p>
          </div>
          
          <!-- Content Body -->
          <div style="padding: 32px 24px;">
            <p style="font-size: 15px; color: #334155; line-height: 22px; margin: 0 0 16px;">
              Hello Citizen,
            </p>
            <p style="font-size: 15px; color: #475569; line-height: 22px; margin: 0 0 24px;">
              Use the following 6-digit One-Time Password (OTP) to securely log in to your citizen profile:
            </p>
            
            <!-- OTP Box -->
            <div style="text-align: center; margin: 28px 0; background-color: #f1f5f9; padding: 16px; border-radius: 12px; border: 1px dashed #cbd5e1;">
              <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 6px; color: #0f172a;">
                ${otpCode}
              </span>
            </div>
            
            <p style="font-size: 13px; color: #64748b; line-height: 20px; margin: 24px 0 0; text-align: center;">
              This code is valid for <strong>5 minutes</strong>. For security reasons, please do not share this password with anyone.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 20px; text-align: center;">
            <p style="margin: 0; font-size: 11px; color: #94a3b8; font-weight: 500;">
              © Grampanchayat Gomevadi, Tal. Atpadi, Dist. Sangli
            </p>
            <p style="margin: 4px 0 0; font-size: 10px; color: #cbd5e1;">
              If you did not request this code, you can safely ignore this email.
            </p>
          </div>
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
