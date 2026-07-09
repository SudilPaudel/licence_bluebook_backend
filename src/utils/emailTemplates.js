const { formatAdDateForDisplay } = require('./dateUtils');

const GOVT = {
  country: 'Government of Nepal',
  ministry: 'Ministry of Physical Infrastructure and Transport',
  department: 'Department of Transport Management',
  address: 'Ekantakuna, Lalitpur, Nepal',
  website: 'www.dotm.gov.np',
};

function wrapOfficialEmail({
  eyebrow = 'Official Notice',
  title,
  intro,
  body,
  badgeText,
  footerNote = 'This is a system-generated official email. Please do not reply to this message.',
}) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;width:100%;background:#ffffff;border:2px solid #b8860b;border-radius:4px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#003893 0%,#0c2340 100%);padding:24px 28px;text-align:center;">
              <div style="font-size:12px;letter-spacing:2px;color:#fbbf24;text-transform:uppercase;margin-bottom:8px;">${eyebrow}</div>
              <div style="font-size:22px;font-weight:bold;color:#ffffff;line-height:1.4;">${GOVT.country}</div>
              <div style="font-size:13px;color:#dbeafe;margin-top:6px;">${GOVT.ministry}</div>
              <div style="font-size:13px;color:#dbeafe;">${GOVT.department}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 12px 32px;">
              ${badgeText ? `
              <div style="display:inline-block;padding:6px 12px;background:#fef3c7;color:#92400e;border:1px solid #f59e0b;border-radius:999px;font-size:12px;font-weight:bold;letter-spacing:0.5px;">
                ${badgeText}
              </div>` : ''}
              <h1 style="margin:16px 0 8px 0;font-size:24px;color:#0c2340;">${title}</h1>
              <p style="margin:0;font-size:14px;line-height:1.8;color:#475569;">${intro}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px 32px;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:#64748b;text-align:center;">
                ${GOVT.department} | ${GOVT.address} | ${GOVT.website}
              </p>
              <p style="margin:0;font-size:11px;line-height:1.6;color:#94a3b8;text-align:center;">
                ${footerNote}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function buildOtpPanel({ code, validMinutes, heading = 'Verification Code' }) {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #cbd5e1;border-radius:6px;overflow:hidden;margin:16px 0;">
      <tr>
        <td style="background:#eff6ff;padding:12px 16px;font-size:13px;font-weight:bold;color:#1e40af;border-bottom:1px solid #cbd5e1;">
          ${heading}
        </td>
      </tr>
      <tr>
        <td style="padding:20px 16px;text-align:center;">
          <div style="font-size:30px;font-weight:700;letter-spacing:6px;color:#003893;">${code}</div>
          <p style="margin:12px 0 0 0;font-size:13px;color:#64748b;">This code is valid for ${validMinutes} minute(s).</p>
        </td>
      </tr>
    </table>
  `;
}

function buildAccountVerificationEmail({ userName, otp, validMinutes = 10, isAdmin = false, isResend = false }) {
  const safeName = userName || 'User';
  const accountType = isAdmin ? 'administrator' : 'user';

  return wrapOfficialEmail({
    badgeText: isAdmin ? 'ADMIN ACCOUNT VERIFICATION' : 'ACCOUNT VERIFICATION',
    title: isResend ? 'New Email Verification Code' : 'Email Verification Required',
    intro: `Dear <strong>${safeName}</strong>,`,
    body: `
      <p style="margin:0 0 14px 0;font-size:14px;line-height:1.8;color:#475569;">
        ${isResend
          ? `A new verification code has been issued for your ${accountType} account on the Bluebook Renewal System.`
          : `Thank you for registering on the Bluebook Renewal System. Please verify your email address to activate your ${accountType} account.`}
      </p>
      ${buildOtpPanel({ code: otp, validMinutes, heading: 'Email Verification OTP' })}
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff7ed;border:1px solid #fdba74;border-radius:6px;">
        <tr>
          <td style="padding:16px 18px;font-size:13px;line-height:1.7;color:#9a3412;">
            Enter this OTP in the application to complete verification. If you did not request this registration, you may safely ignore this email.
          </td>
        </tr>
      </table>
    `,
  });
}

function buildPaymentOtpEmail({ userName, otp, validMinutes = 5, vehicleCategory = 'petrol' }) {
  const safeName = userName || 'User';
  const categoryLabel = vehicleCategory === 'electric' ? 'Electric Vehicle' : 'Motor Vehicle';

  return wrapOfficialEmail({
    badgeText: 'PAYMENT AUTHORIZATION',
    title: 'Payment Confirmation OTP',
    intro: `Dear <strong>${safeName}</strong>,`,
    body: `
      <p style="margin:0 0 14px 0;font-size:14px;line-height:1.8;color:#475569;">
        An OTP has been generated to authorize your ${categoryLabel.toLowerCase()} bluebook payment on the official Bluebook Renewal System.
      </p>
      ${buildOtpPanel({ code: otp, validMinutes, heading: 'Payment OTP' })}
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;">
        <tr>
          <td style="padding:16px 18px;font-size:13px;line-height:1.7;color:#1e3a8a;">
            Use this OTP to confirm your payment request. Do not share this code with anyone. If you did not initiate this payment, please secure your account immediately.
          </td>
        </tr>
      </table>
    `,
  });
}

function buildBluebookExpiryReminderEmail({
  userName,
  vehicleRegNo,
  vehicleOwnerName,
  vehicleType,
  vehicleModel,
  taxExpireDate,
  daysLeft,
  vehicleCategory = 'petrol',
  renewalUrl,
}) {
  const categoryLabel = vehicleCategory === 'electric' ? 'Electric Vehicle' : 'Motor Vehicle';
  const formattedExpiry = formatAdDateForDisplay(taxExpireDate, 'DD MMMM YYYY');
  const safeName = userName || vehicleOwnerName || 'Vehicle Owner';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bluebook Tax Renewal Reminder</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Georgia,'Times New Roman',serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;width:100%;background:#ffffff;border:2px solid #b8860b;border-radius:4px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#003893 0%,#0c2340 100%);padding:24px 28px;text-align:center;">
              <div style="font-size:12px;letter-spacing:2px;color:#fbbf24;text-transform:uppercase;margin-bottom:8px;">Official Notice</div>
              <div style="font-size:22px;font-weight:bold;color:#ffffff;line-height:1.4;">${GOVT.country}</div>
              <div style="font-size:13px;color:#dbeafe;margin-top:6px;">${GOVT.ministry}</div>
              <div style="font-size:13px;color:#dbeafe;">${GOVT.department}</div>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 32px 8px 32px;">
              <div style="display:inline-block;padding:6px 12px;background:#fef3c7;color:#92400e;border:1px solid #f59e0b;border-radius:999px;font-size:12px;font-weight:bold;letter-spacing:0.5px;">
                TAX RENEWAL REMINDER
              </div>
              <h1 style="margin:16px 0 8px 0;font-size:24px;color:#0c2340;">Vehicle Road Tax Expiry Notice</h1>
              <p style="margin:0;font-size:14px;line-height:1.7;color:#475569;">
                Dear <strong>${safeName}</strong>,
              </p>
              <p style="margin:14px 0 0 0;font-size:14px;line-height:1.7;color:#475569;">
                This is an official reminder from the <strong>Bluebook Renewal System</strong> operated under the
                Department of Transport Management. Your registered ${categoryLabel.toLowerCase()} bluebook tax validity
                is approaching expiry. Please renew before the due date to avoid penalties and service interruption.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 32px 20px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #cbd5e1;border-radius:6px;overflow:hidden;">
                <tr>
                  <td colspan="2" style="background:#eff6ff;padding:12px 16px;font-size:13px;font-weight:bold;color:#1e40af;border-bottom:1px solid #cbd5e1;">
                    Vehicle &amp; Tax Details
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;font-size:13px;color:#64748b;width:42%;border-bottom:1px solid #e2e8f0;">Registration No.</td>
                  <td style="padding:12px 16px;font-size:13px;font-weight:bold;color:#0f172a;border-bottom:1px solid #e2e8f0;">${vehicleRegNo || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #e2e8f0;">Registered Owner</td>
                  <td style="padding:12px 16px;font-size:13px;font-weight:bold;color:#0f172a;border-bottom:1px solid #e2e8f0;">${vehicleOwnerName || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #e2e8f0;">Vehicle Type / Model</td>
                  <td style="padding:12px 16px;font-size:13px;font-weight:bold;color:#0f172a;border-bottom:1px solid #e2e8f0;">${vehicleType || 'N/A'} / ${vehicleModel || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #e2e8f0;">Tax Valid Until (BS)</td>
                  <td style="padding:12px 16px;font-size:13px;font-weight:bold;color:#b91c1c;border-bottom:1px solid #e2e8f0;">${formattedExpiry}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;font-size:13px;color:#64748b;">Days Remaining</td>
                  <td style="padding:12px 16px;font-size:13px;font-weight:bold;color:#b45309;">${daysLeft} day(s)</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 24px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff7ed;border:1px solid #fdba74;border-radius:6px;">
                <tr>
                  <td style="padding:16px 18px;font-size:13px;line-height:1.7;color:#9a3412;">
                    <strong>Action Required:</strong> Renew your vehicle road tax through the official Bluebook Renewal portal
                    before expiry to remain compliant with transport regulations. Late renewal may attract fines as per applicable law.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 28px 32px;text-align:center;">
              <a href="${renewalUrl}" style="display:inline-block;background:#003893;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:4px;font-size:14px;font-weight:bold;letter-spacing:0.3px;">
                Renew Bluebook Tax Now
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:#64748b;text-align:center;">
                ${GOVT.department} | ${GOVT.address} | ${GOVT.website}
              </p>
              <p style="margin:0;font-size:11px;line-height:1.6;color:#94a3b8;text-align:center;">
                This is a system-generated official reminder. Please do not reply to this email.
                For assistance, contact your nearest Transport Management Office.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

module.exports = {
  buildAccountVerificationEmail,
  buildBluebookExpiryReminderEmail,
  buildPaymentOtpEmail,
};
