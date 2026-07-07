// Resend HTTP-based email service — bypasses SMTP entirely (uses HTTPS port 443)
// Works on all cloud hosts including Render free tier

const RESEND_API_KEY = process.env.RESEND_API_KEY;

async function sendViaResend(to, subject, html) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Grampanchayat Gomevadi <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || JSON.stringify(data));
  }

  return data;
}

export const sendOtpEmail = async (email, otpCode) => {
  console.log(`[EMAIL SERVICE] Initializing OTP email to: ${email}`);

  if (!RESEND_API_KEY) {
    console.log(`\n✉️ [MOCK EMAIL SERVICE] To: ${email}\n🔑 OTP Code: ${otpCode}\n(Note: Set RESEND_API_KEY in your .env for real email delivery)\n`);
    return { mock: true, code: otpCode };
  }

  const html = `
    <div style="background-color: #f8fafc; padding: 40px 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;">
        <!-- Brand Header -->
        <div style="background-color: #ea580c; padding: 32px 24px; text-align: center;">
          <h2 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
            Grampanchayat Gomevadi
          </h2>
          <p style="color: #ffedd5; margin: 4px 0 0; font-size: 13px; font-weight: 600;">
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
  `;

  try {
    const result = await sendViaResend(email, "Gomevadi Citizen Portal Login - OTP Code", html);
    console.log(`[EMAIL SERVICE] OTP successfully sent to ${email}. Id: ${result.id}`);
    return { success: true, messageId: result.id };
  } catch (error) {
    console.error(`[EMAIL SERVICE ERROR] Failed to send email to ${email}:`, error.message);
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
    return { success: false, error: error.message };
  }
};

// Send Tax Assignment details
export const sendTaxAssignmentEmail = async (email, familyName, year, billsList) => {
  console.log(`[EMAIL SERVICE] Initializing Tax Assignment Email to: ${email}`);

  if (!RESEND_API_KEY) {
    console.log(`\n✉️ [MOCK EMAIL SERVICE] Tax Assignment Email to: ${email} (Family: ${familyName}, Year: ${year})\nBills:\n${JSON.stringify(billsList, null, 2)}\n`);
    return { mock: true };
  }

  const fyLabel = `${year}-${Number(year) + 1}`;
  const totalAmount = billsList.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

  const rowsHtml = billsList.map((b) => {
    const taxNameEn = {
      house: "House Tax",
      samanya_water: "General Water Tax",
      vishesh_water: "Special Water Tax",
      health: "Health Tax",
      electricity: "Electricity Tax",
      fine: "Fine / Penalty",
    }[b.taxType] || b.taxType;

    const taxNameMr = {
      house: "घरपट्टी",
      samanya_water: "सामान्य पाणीपट्टी",
      vishesh_water: "विशेष पाणीपट्टी",
      health: "आरोग्य कर",
      electricity: "वीज कर",
      fine: "दंड",
    }[b.taxType] || b.taxType;

    return `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 12px; font-size: 14px; color: #334155; font-weight: 600;">${taxNameEn} (${taxNameMr})</td>
        <td style="padding: 12px; font-size: 14px; color: #0f172a; font-weight: 700; text-align: right;">₹${b.amount}</td>
      </tr>
    `;
  }).join("");

  const html = `
    <div style="background-color: #f8fafc; padding: 40px 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;">
        <!-- Brand Header -->
        <div style="background-color: #ea580c; padding: 32px 24px; text-align: center;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">
            Grampanchayat Gomevadi
          </h2>
          <p style="color: #ffedd5; margin: 4px 0 0; font-size: 13px; font-weight: 600;">
            Tax Assessment Details (FY ${fyLabel})
          </p>
        </div>
        
        <!-- Content Body -->
        <div style="padding: 32px 24px;">
          <p style="font-size: 15px; color: #334155; line-height: 22px; margin: 0 0 16px;">
            Hello <strong>${familyName}</strong>,
          </p>
          <p style="font-size: 14px; color: #475569; line-height: 22px; margin: 0 0 24px;">
            New tax components have been assessed and assigned to your household for the Financial Year <strong>${fyLabel}</strong>:
          </p>
          
          <!-- Tax breakdown table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <thead>
              <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                <th style="padding: 10px 12px; font-size: 12px; font-weight: 700; color: #64748b; text-align: left; text-transform: uppercase;">Tax Component</th>
                <th style="padding: 10px 12px; font-size: 12px; font-weight: 700; color: #64748b; text-align: right; text-transform: uppercase;">Assigned Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              <tr style="background-color: #f8fafc; border-top: 2px solid #e2e8f0;">
                <td style="padding: 12px; font-size: 14px; color: #0f172a; font-weight: 800;">Total Assessment</td>
                <td style="padding: 12px; font-size: 16px; color: #16a34a; font-weight: 800; text-align: right;">₹${totalAmount}</td>
              </tr>
            </tbody>
          </table>
          
          <p style="font-size: 13px; color: #64748b; line-height: 20px; margin: 24px 0 0; text-align: center;">
            Please log in to your Grampanchayat citizen profile to view the outstanding bills ledger and complete payments online.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 20px; text-align: center;">
          <p style="margin: 0; font-size: 11px; color: #94a3b8; font-weight: 500;">
            © Grampanchayat Gomevadi, Tal. Atpadi, Dist. Sangli
          </p>
        </div>
      </div>
    </div>
  `;

  try {
    const result = await sendViaResend(email, `Grampanchayat Gomevadi - Tax Assessment Details (FY ${fyLabel})`, html);
    console.log(`[EMAIL SERVICE] Tax Assessment Email sent successfully to ${email}. Id: ${result.id}`);
    return { success: true, messageId: result.id };
  } catch (error) {
    console.error(`[EMAIL SERVICE ERROR] Failed to send tax assignment email to ${email}:`, error.message);
    return { success: false, error: error.message };
  }
};
