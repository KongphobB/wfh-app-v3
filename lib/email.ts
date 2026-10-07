import nodemailer from 'nodemailer';

export interface EmailParams {
  to: string | string[];
  cc?: string | string[];
  subject: string;
  bodyHtml: string;
  bodyText?: string;
}

const SMTP_USER = process.env.SMTP_USER || 'kongphopb38@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS || 'wjbmtpmruwnjlecx';
const isStubLog = process.env.EMAIL_STUB_LOG === 'true' || process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);

/**
 * Transporter setup for SMTP
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || 587),
  secure: false, // true for 465, false for other ports
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

/**
 * Send email notification or log to dev console if STUB_LOG=true
 */
export async function sendEmailAlert({ to, cc, subject, bodyHtml, bodyText }: EmailParams): Promise<boolean> {
  const toList = Array.isArray(to) ? to.filter((e) => e && e.includes('@')).join(', ') : to;
  const ccList = cc ? (Array.isArray(cc) ? cc.filter((e) => e && e.includes('@')).join(', ') : cc) : undefined;

  if (!toList || toList.length === 0) {
    console.warn('sendEmailAlert skipped: No valid recipients');
    return false;
  }

  if (isStubLog) {
    console.log('\n================ [EMAIL NOTIFICATION STUB LOG] ================');
    console.log(`TO: ${toList}`);
    if (ccList) console.log(`CC: ${ccList}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`BODY:\n${bodyText || bodyHtml.replace(/<[^>]+>/g, '')}`);
    console.log('=================================================================\n');
    return true;
  }

  try {
    await transporter.sendMail({
      from: `"WFH System Alert" <${process.env.SMTP_USER}>`,
      to: toList,
      cc: ccList,
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

/**
 * Send email when an employee checks in late (หลัง 08:00 น.) with their reason
 * Sends to BOTH supervisor and admin (and CCs employee if available)
 */
export async function sendLateCheckinNotificationEmail(params: {
  employeeName: string;
  employeeId: string;
  department?: string | null;
  position?: string | null;
  checkinTime: string;
  reason: string;
  supervisorEmail?: string | null;
  adminEmail?: string | null;
  employeeEmail?: string | null;
}) {
  const recipients: string[] = [];
  if (params.supervisorEmail && params.supervisorEmail.includes('@')) {
    recipients.push(params.supervisorEmail.trim());
  }
  if (params.adminEmail && params.adminEmail.includes('@') && !recipients.includes(params.adminEmail.trim())) {
    recipients.push(params.adminEmail.trim());
  }

  // Fallback if no supervisor or admin email configured
  if (recipients.length === 0) {
    recipients.push('admin@company.com');
  }

  const subject = `[แจ้งเตือนเข้างานสาย] พนักงาน ${params.employeeName} (${params.employeeId}) ลงเวลา ${params.checkinTime} น.`;
  const bodyHtml = `
    <div style="font-family: sans-serif; padding: 20px; background-color: #f8fafc; color: #1e293b; border-radius: 8px; border: 1px solid #e2e8f0;">
      <h3 style="color: #ea580c; margin-top: 0;">⏰ แจ้งเตือนการลงเวลาเข้างานสาย (Late Check-in)</h3>
      <p>เรียน ท่านหัวหน้างาน และ ผู้ดูแลระบบ,</p>
      <p>ระบบขอแจ้งให้ทราบว่า มีพนักงานลงเวลาเข้างานหลังเวลาที่กำหนด โดยมีรายละเอียดดังนี้:</p>
      
      <div style="background: #ffffff; padding: 15px; border-left: 4px solid #ea580c; border-radius: 4px; margin: 15px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <p style="margin: 0 0 8px 0;"><strong>ชื่อ-สกุล:</strong> ${params.employeeName} (รหัส: ${params.employeeId})</p>
        <p style="margin: 0 0 8px 0;"><strong>แผนก / ตำแหน่ง:</strong> ${params.department || '-'} / ${params.position || '-'}</p>
        <p style="margin: 0 0 8px 0;"><strong>เวลาที่ลงเวลา:</strong> <span style="color: #dc2626; font-weight: bold;">${params.checkinTime} น.</span></p>
        <p style="margin: 0 0 4px 0;"><strong>เหตุผลความจำเป็นที่ระบุ:</strong></p>
        <div style="background: #fff7ed; padding: 10px; border-radius: 4px; color: #9a3412; font-style: italic;">
          "${params.reason || 'ไม่ได้ระบุเหตุผล'}"
        </div>
      </div>
      
      <p style="font-size: 13px; color: #475569;">
        ท่านสามารถตรวจสอบและติดตามผลการปฏิบัติงานได้ที่ระบบ <a href="https://wfh-system-v3.vercel.app/supervisor" style="color: #ea580c; font-weight: bold;">SNU WFH Portal</a>
      </p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 15px 0;" />
      <p style="font-size: 11px; color: #94a3b8; margin: 0;">อีเมลฉบับนี้ส่งถึงทั้งหัวหน้างานและผู้ดูแลระบบโดยอัตโนมัติจากระบบ SNU WFH</p>
    </div>
  `;

  const cc = params.employeeEmail && params.employeeEmail.includes('@') ? params.employeeEmail.trim() : undefined;

  await sendEmailAlert({
    to: recipients,
    cc,
    subject,
    bodyHtml,
  });
}

/**
 * Send email when an employee has NOT checked in past the deadline (หลัง 08:00 น.)
 * Sends to BOTH supervisor and admin (and CCs the employee)
 */
export async function sendMissingCheckinAlertEmail(params: {
  employeeName: string;
  employeeId: string;
  department?: string | null;
  supervisorEmail?: string | null;
  adminEmail?: string | null;
  employeeEmail?: string | null;
}) {
  const recipients: string[] = [];
  if (params.supervisorEmail && params.supervisorEmail.includes('@')) {
    recipients.push(params.supervisorEmail.trim());
  }
  if (params.adminEmail && params.adminEmail.includes('@') && !recipients.includes(params.adminEmail.trim())) {
    recipients.push(params.adminEmail.trim());
  }

  const subject = `[แจ้งเตือนด่วน] พนักงานยังไม่ได้ลงเวลาเข้างาน (หลัง 08:00 น.) - ${params.employeeName} (${params.employeeId})`;
  const bodyHtml = `
    <div style="font-family: sans-serif; padding: 20px; background-color: #f8fafc; color: #1e293b; border-radius: 8px; border: 1px solid #e2e8f0;">
      <h3 style="color: #dc2626; margin-top: 0;">⚠️ แจ้งเตือน: ยังไม่พบการลงเวลาเข้างานช่วงเช้า</h3>
      <p>เรียน ท่านหัวหน้างาน และ ผู้ดูแลระบบ,</p>
      <p>ระบบตรวจพบว่า พนักงาน <strong>${params.employeeName}</strong> (รหัสพนักงาน: <strong>${params.employeeId}</strong>) แผนก ${params.department || '-'} <strong>ยังไม่ได้ลงเวลาเข้างานช่วงเช้า (เกินเวลา 08:00 น.)</strong></p>
      
      <div style="background: #fef2f2; padding: 12px 16px; border-left: 4px solid #dc2626; border-radius: 4px; margin: 15px 0;">
        <p style="margin: 0; color: #991b1b; font-weight: bold;">สถานะ: ยังไม่ลงเวลาเข้างาน (เสี่ยงขาดการติดต่อ/เข้างานสาย)</p>
      </div>

      <p style="font-size: 13px; color: #475569;">
        ระบบได้ส่งการแจ้งเตือนไปยังพนักงานแล้ว กรุณาตรวจสอบหรือติดตามผ่านระบบ <a href="https://wfh-system-v3.vercel.app" style="color: #dc2626; font-weight: bold;">SNU WFH Portal</a>
      </p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 15px 0;" />
      <p style="font-size: 11px; color: #94a3b8; margin: 0;">อีเมลฉบับนี้ส่งถึงทั้งหัวหน้างานและผู้ดูแลระบบโดยอัตโนมัติจากระบบ SNU WFH</p>
    </div>
  `;

  const cc = params.employeeEmail && params.employeeEmail.includes('@') ? params.employeeEmail.trim() : undefined;
  const finalTo = recipients.length > 0 ? recipients : (cc ? [cc] : ['admin@company.com']);

  await sendEmailAlert({
    to: finalTo,
    cc: recipients.length > 0 ? cc : undefined,
    subject,
    bodyHtml,
  });
}

/**
 * Send email when an employee is absent (ขาดงาน) past 12:00 PM without approved leave
 * Sends to BOTH supervisor and admin (and CCs the employee)
 */
export async function sendAbsentAlertEmail(params: {
  employeeName: string;
  employeeId: string;
  department?: string | null;
  supervisorEmail?: string | null;
  adminEmail?: string | null;
  employeeEmail?: string | null;
}) {
  const recipients: string[] = [];
  if (params.supervisorEmail && params.supervisorEmail.includes('@')) {
    recipients.push(params.supervisorEmail.trim());
  }
  if (params.adminEmail && params.adminEmail.includes('@') && !recipients.includes(params.adminEmail.trim())) {
    recipients.push(params.adminEmail.trim());
  }

  const subject = `[แจ้งเตือนด่วน: ขาดงาน] พนักงาน ${params.employeeName} (${params.employeeId}) ยังไม่ลงเวลาเข้างาน (เกินเวลา 12:00 น.)`;
  const bodyHtml = `
    <div style="font-family: sans-serif; padding: 20px; background-color: #f8fafc; color: #1e293b; border-radius: 8px; border: 1px solid #e2e8f0;">
      <h3 style="color: #b91c1c; margin-top: 0;">🚫 แจ้งเตือนสถานะขาดงาน (Absent Alert)</h3>
      <p>เรียน ท่านหัวหน้างาน และ ผู้ดูแลระบบ,</p>
      <p>ระบบตรวจพบว่า พนักงาน <strong>${params.employeeName}</strong> (รหัสพนักงาน: <strong>${params.employeeId}</strong>) แผนก ${params.department || '-'} <strong>ไม่มีการลงเวลาปฏิบัติงานตลอดช่วงเช้า (เลยเวลา 12:00 น. ช่วงพักเที่ยง)</strong> และไม่มีประวัติการยื่นลางานที่ได้รับการอนุมัติ</p>
      
      <div style="background: #fef2f2; padding: 15px; border-left: 4px solid #b91c1c; border-radius: 4px; margin: 15px 0;">
        <p style="margin: 0; color: #991b1b; font-weight: bold; font-size: 15px;">สถานะ: ขาดงานช่วงเช้า / ขาดการติดต่อ</p>
        <p style="margin: 6px 0 0 0; color: #4b5563; font-size: 13px;">หากพนักงานมีเหตุฉุกเฉินหรือลาป่วยกะทันหัน กรุณาให้พนักงานยื่นใบลาย้อนหลัง หรือติดต่อผู้ดูแลระบบเพื่อแก้ไขสถานะ</p>
      </div>

      <p style="font-size: 13px; color: #475569;">
        ท่านสามารถตรวจสอบและจัดการได้ที่ระบบ <a href="https://wfh-system-v3.vercel.app/supervisor" style="color: #b91c1c; font-weight: bold;">SNU WFH Portal</a>
      </p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 15px 0;" />
      <p style="font-size: 11px; color: #94a3b8; margin: 0;">อีเมลฉบับนี้ส่งถึงทั้งหัวหน้างานและผู้ดูแลระบบโดยอัตโนมัติจากระบบ SNU WFH</p>
    </div>
  `;

  const cc = params.employeeEmail && params.employeeEmail.includes('@') ? params.employeeEmail.trim() : undefined;
  const finalTo = recipients.length > 0 ? recipients : (cc ? [cc] : ['admin@company.com']);

  await sendEmailAlert({
    to: finalTo,
    cc: recipients.length > 0 ? cc : undefined,
    subject,
    bodyHtml,
  });
}

/**
 * Send email immediately when a spot check is initiated (รอบ 10 นาที)
 * Notifies the employee directly so they receive mobile/Outlook alert while away from browser
 */
export async function sendSpotCheckTriggeredEmail(params: {
  employeeName: string;
  employeeId: string;
  employeeEmail?: string | null;
  round: string;
  scheduledTime: string;
  deadlineTime: string;
  note?: string;
}): Promise<boolean> {
  if (!params.employeeEmail || !params.employeeEmail.includes('@')) {
    return false;
  }

  const subject = `[ด่วน: สุ่มตรวจ WFH] มีคำสั่งสุ่มตรวจยืนยันตัวตน กรุณาถ่ายภาพ Selfie ภายใน 10 นาที (รอบ ${params.round})`;
  const bodyHtml = `
    <div style="font-family: sans-serif; padding: 24px; background-color: #f8fafc; color: #1e293b; border-radius: 8px; border: 1px solid #e2e8f0; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="font-size: 36px;">🔔</span>
        <h2 style="color: #dc2626; margin: 8px 0 4px 0;">คำสั่งสุ่มตรวจยืนยันตัวตน (Spot Check)</h2>
        <p style="color: #64748b; font-size: 14px; margin: 0;">ระบบบันทึกเวลาและติดตามการทำงานนอกสถานที่ SNU WFH</p>
      </div>

      <div style="background: #ffffff; padding: 20px; border-left: 4px solid #dc2626; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 20px;">
        <p style="margin: 0 0 10px 0; font-size: 15px;">เรียนคุณ <strong>${params.employeeName}</strong> (รหัส: ${params.employeeId}),</p>
        <p style="margin: 0 0 12px 0; color: #334155; line-height: 1.5;">
          ขณะนี้มี <strong>คำสั่งสุ่มตรวจยืนยันตัวตน</strong> เข้ามายังบัญชีของคุณ กรุณาเปิดกล้องถ่ายภาพ Selfie สดเพื่อยืนยันการปฏิบัติงานนอกสถานที่
        </p>

        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 14px; margin: 14px 0;">
          <p style="margin: 3px 0; font-size: 14px;"><strong>รอบการตรวจ:</strong> ${params.round}</p>
          <p style="margin: 3px 0; font-size: 14px;"><strong>เวลาที่เริ่มส่งคำสั่ง:</strong> ${params.scheduledTime} น.</p>
          <p style="margin: 3px 0; font-size: 14px; color: #b91c1c;"><strong>⏰ กำหนดเวลาสิ้นสุด (10 นาที):</strong> <strong>${params.deadlineTime} น.</strong></p>
          ${params.note ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #7f1d1d;"><strong>ข้อความจากหัวหน้างาน:</strong> "${params.note}"</p>` : ''}
        </div>

        <div style="text-align: center; margin: 24px 0 10px 0;">
          <a href="https://wfh-system-v3.vercel.app/spotcheck" 
             style="display: inline-block; background-color: #dc2626; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; box-shadow: 0 2px 4px rgba(220,38,38,0.3);">
            📸 เปิดหน้าระบบเพื่อถ่ายภาพ Selfie ยืนยันตัวตน
          </a>
        </div>
      </div>

      <p style="font-size: 12px; color: #64748b; text-align: center; margin: 0; line-height: 1.5;">
        💡 หากท่านเปิดหน้าจอมือถือหรืออยู่ระหว่างติดต่อลูกค้า สามารถแตะที่ลิงก์ด้านบนเพื่อถ่ายภาพยืนยันตัวตนได้ทันที
      </p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 15px 0;" />
      <p style="font-size: 11px; color: #94a3b8; margin: 0; text-align: center;">อีเมลแจ้งเตือนอัตโนมัติจากระบบ SNU WFH</p>
    </div>
  `;

  const bodyText = `
🔔 คำสั่งสุ่มตรวจยืนยันตัวตน (Spot Check) - SNU WFH
เรียนคุณ ${params.employeeName} (รหัส: ${params.employeeId}),
ขณะนี้มีคำสั่งสุ่มตรวจยืนยันตัวตนเข้ามายังบัญชีของคุณ กรุณาเปิดกล้องถ่ายภาพ Selfie สดเพื่อยืนยันการปฏิบัติงานนอกสถานที่
- รอบการตรวจ: ${params.round}
- เวลาที่เริ่มส่งคำสั่ง: ${params.scheduledTime} น.
- ⏰ กำหนดเวลาสิ้นสุด (10 นาที): ${params.deadlineTime} น.
${params.note ? `- ข้อความจากหัวหน้างาน: "${params.note}"` : ''}

คลิกเปิดหน้าระบบเพื่อถ่ายภาพ Selfie:
https://wfh-system-v3.vercel.app/spotcheck
  `.trim();

  return sendEmailAlert({
    to: params.employeeEmail.trim(),
    subject,
    bodyHtml,
    bodyText,
  });
}

/**
 * Send email when an employee misses spot check (เกิน 10 นาที / ขาดการติดต่อ)
 * Sends to BOTH supervisor and admin (and CCs the employee)
 */
export async function sendMissedSpotCheckAlertEmail(params: {
  employeeName: string;
  employeeId: string;
  department?: string | null;
  round: string;
  scheduledTime: string;
  supervisorEmail?: string | null;
  adminEmail?: string | null;
  employeeEmail?: string | null;
}) {
  const recipients: string[] = [];
  if (params.supervisorEmail && params.supervisorEmail.includes('@')) {
    recipients.push(params.supervisorEmail.trim());
  }
  if (params.adminEmail && params.adminEmail.includes('@') && !recipients.includes(params.adminEmail.trim())) {
    recipients.push(params.adminEmail.trim());
  }

  const subject = `[แจ้งเตือนด่วน: พลาดการสุ่มตรวจ] พนักงาน ${params.employeeName} (${params.employeeId}) ไม่ยืนยันตัวตนใน 10 นาที (รอบ ${params.round})`;
  const bodyHtml = `
    <div style="font-family: sans-serif; padding: 20px; background-color: #f8fafc; color: #1e293b; border-radius: 8px; border: 1px solid #e2e8f0;">
      <h3 style="color: #dc2626; margin-top: 0;">⚠️ แจ้งเตือน: พนักงานไม่ผ่านการสุ่มตรวจยืนยันตัวตน</h3>
      <p>เรียน ท่านหัวหน้างาน และ ผู้ดูแลระบบ,</p>
      <p>ระบบตรวจพบว่า พนักงาน <strong>${params.employeeName}</strong> (รหัสพนักงาน: <strong>${params.employeeId}</strong>) แผนก ${params.department || '-'} <strong>ไม่ทำการเปิดกล้องถ่ายภาพ Selfie ยืนยันตัวตนภายในเวลา 10 นาทีที่กำหนด</strong></p>
      
      <div style="background: #fff1f2; padding: 15px; border-left: 4px solid #e11d48; border-radius: 4px; margin: 15px 0;">
        <p style="margin: 0 0 6px 0;"><strong>รอบการสุ่มตรวจ:</strong> รอบ ${params.round}</p>
        <p style="margin: 0 0 6px 0;"><strong>เวลาที่เริ่มส่งสัญญาณ:</strong> ${params.scheduledTime} น.</p>
        <p style="margin: 0; color: #be123c; font-weight: bold;">ผลการสุ่มตรวจ: ไม่ผ่าน (ขาดการติดต่อเกิน 10 นาที)</p>
      </div>

      <p style="font-size: 13px; color: #475569;">
        ท่านสามารถตรวจสอบประวัติหรือสั่งสุ่มตรวจซ้ำได้ที่ระบบ <a href="https://wfh-system-v3.vercel.app/supervisor" style="color: #e11d48; font-weight: bold;">SNU WFH Supervisor Portal</a>
      </p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 15px 0;" />
      <p style="font-size: 11px; color: #94a3b8; margin: 0;">อีเมลฉบับนี้ส่งถึงทั้งหัวหน้างานและผู้ดูแลระบบโดยอัตโนมัติจากระบบ SNU WFH</p>
    </div>
  `;

  const cc = params.employeeEmail && params.employeeEmail.includes('@') ? params.employeeEmail.trim() : undefined;
  const finalTo = recipients.length > 0 ? recipients : (cc ? [cc] : ['admin@company.com']);

  await sendEmailAlert({
    to: finalTo,
    cc: recipients.length > 0 ? cc : undefined,
    subject,
    bodyHtml,
  });
}
