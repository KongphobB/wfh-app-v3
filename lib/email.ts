import nodemailer from 'nodemailer';

export interface EmailParams {
  to: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
}

const isStubLog = process.env.EMAIL_STUB_LOG === 'true' || !process.env.SMTP_USER;

/**
 * Transporter setup for SMTP
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || 587),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

/**
 * Send email notification or log to dev console if STUB_LOG=true
 */
export async function sendEmailAlert({ to, subject, bodyHtml, bodyText }: EmailParams): Promise<boolean> {
  if (isStubLog) {
    console.log('\n================ [EMAIL NOTIFICATION STUB LOG] ================');
    console.log(`TO: ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`BODY:\n${bodyText || bodyHtml.replace(/<[^>]+>/g, '')}`);
    console.log('=================================================================\n');
    return true;
  }

  try {
    await transporter.sendMail({
      from: `"WFH System Alert" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text: bodyText || bodyHtml.replace(/<[^>]+>/g, ''),
      html: bodyHtml,
    });
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

/**
 * Helper to construct WFH Suspension Alert Email
 */
export async function sendSuspensionAlertEmail(employeeName: string, employeeId: string, email?: string | null) {
  const targetEmail = email || 'admin@company.com';
  const subject = `[แจ้งเตือนด่วน] ระงับสิทธิ์ WFH พนักงาน ${employeeName} (${employeeId})`;
  const bodyHtml = `
    <div style="font-family: sans-serif; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 8px;">
      <h2 style="color: #ef4444;">⚠️ แจ้งเตือนการระงับสิทธิ์ปฏิบัติงานนอกสถานที่ (WFH)</h2>
      <p>เรียน ท่านที่เกี่ยวข้อง,</p>
      <p>ระบบขอแจ้งให้ทราบว่า <strong>${employeeName}</strong> (รหัสพนักงาน: <strong>${employeeId}</strong>) ถูกสะสมคะแนนประเมินผลงาน 1 ดาว ครบกำหนด</p>
      <div style="background: #1e293b; padding: 15px; border-left: 4px solid #ef4444; border-radius: 4px; margin: 15px 0;">
        <p style="margin:0;"><strong>สถานะใหม่:</strong> <span style="color: #ef4444; font-weight: bold;">ระงับสิทธิ์ WFH</span></p>
        <p style="margin:5px 0 0 0;"><strong>ผลกระทบ:</strong> พนักงานต้องกลับมาปฏิบัติงาน ณ ออฟฟิศ จนกว่าจะได้รับการอนุมัติปลดระงับจากผู้ดูแลระบบ</p>
      </div>
      <p>ระบบได้สร้าง Ticket แจ้งปัญหาให้ผู้ดูแลระบบตรวจสอบและดำเนินการต่อเรียบร้อยแล้ว</p>
      <hr style="border-color: #334155;" />
      <p style="font-size: 12px; color: #94a3b8;">ข้อความนี้เป็นระบบอัตโนมัติจาก WFH App v3</p>
    </div>
  `;

  await sendEmailAlert({ to: targetEmail, subject, bodyHtml });
}
