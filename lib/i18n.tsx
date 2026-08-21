'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'th' | 'en';

export interface Translations {
  // Navigation
  nav: {
    dashboard: string;
    checkin: string;
    spotcheck: string;
    tasks: string;
    supervisor: string;
    admin: string;
    manual: string;
    changePin: string;
    logout: string;
    userManuals: string;
    systemTag: string;
  };
  // Roles
  roles: Record<string, string>;
  // Common & Buttons
  common: {
    confirm: string;
    cancel: string;
    save: string;
    saving: string;
    submit: string;
    submitting: string;
    close: string;
    refresh: string;
    viewMap: string;
    search: string;
    all: string;
    today: string;
    unrated: string;
    rated: string;
    status: string;
    actions: string;
    date: string;
    time: string;
    details: string;
    note: string;
    reason: string;
    loading: string;
    success: string;
    error: string;
    noData: string;
    optional: string;
    required: string;
    itHelpdesk: string;
    itHelpdeskDesc: string;
  };
  // Auth
  auth: {
    loginTitle: string;
    loginSubtitle: string;
    empIdLabel: string;
    empIdPlaceholder: string;
    pinLabel: string;
    pinPlaceholder: string;
    loginButton: string;
    loggingIn: string;
    forgotPinHelp: string;
    changePinTitle: string;
    oldPinLabel: string;
    newPinLabel: string;
    confirmPinLabel: string;
    changePinButton: string;
    changePinSuccess: string;
  };
  // Dashboard
  dashboard: {
    title: string;
    subtitle: string;
    wfhActive: string;
    wfhSuspended: string;
    suspendedBannerTitle: string;
    suspendedBannerDesc: string;
    checkinTimeToday: string;
    checkoutTimeToday: string;
    dailyTaskToday: string;
    ratingToday: string;
    notRecorded: string;
    notSubmitted: string;
    noRatingYet: string;
    quickActions: string;
    checkinBtn: string;
    spotcheckBtn: string;
    tasksBtn: string;
    supervisorBtn: string;
    adminBtn: string;
    verifyWindowBannerTitle: string;
    verifyWindowBannerBadge: string;
    verifyWindowBannerDesc: string;
    verifyWindowBannerBtn: string;
    overdueBannerTitle: string;
    overdueBannerBadge: string;
    overdueBannerDesc: string;
    overdueBannerBtn: string;
    spotcheckPendingBannerTitle: string;
    spotcheckPendingBannerDesc: string;
    spotcheckPendingBannerBtn: string;
  };
  // Checkin
  checkin: {
    pageTitle: string;
    pageSubtitle: string;
    morningCheckin: string;
    afternoonVerify: string;
    eveningCheckout: string;
    morningTimeHint: string;
    afternoonTimeHint: string;
    eveningTimeHint: string;
    modalTitle: string;
    typeLabel: string;
    selfieLabel: string;
    selfieRequired: string;
    selfieExemptBadge: string;
    selfieExemptNotice: string;
    takeSelfieBtn: string;
    retakeBtn: string;
    capturePhoto: string;
    retakePhoto: string;
    noteLabel: string;
    notePlaceholder: string;
    reasonLateTitle: string;
    reasonLateNotice: string;
    reasonEarlyTitle: string;
    reasonEarlyNotice: string;
    movementAlertTitle: string;
    movementAlertNotice: string;
    movementReasonPlaceholder: string;
    submitCheckin: string;
    submittingCheckin: string;
    successMessage: string;
    historyTitle: string;
    gpsLocation: string;
    gpsAcquiring: string;
  };
  // Spot Check
  spotcheck: {
    title: string;
    subtitle: string;
    modalTitle: string;
    activePrompt: string;
    scanButton: string;
    statusScheduled: string;
    statusPending: string;
    statusPass: string;
    statusFail: string;
    statusExpired: string;
    countdownLabel: string;
    timeRemaining: string;
    expiredNotice: string;
    selfieLabel: string;
    gpsLabel: string;
    verifyBtn: string;
    verifying: string;
    exemptBadge: string;
    exemptNotice: string;
    historyTitle: string;
  };
  // Tasks
  tasks: {
    pageTitle: string;
    modalTitle: string;
    title: string;
    subtitle: string;
    reportBtn: string;
    submitButton: string;
    editTodayReport: string;
    pendingRating: string;
    tasksAssigned: string;
    tasksCompleted: string;
    detailsLabel: string;
    linkAttachment: string;
    assignedLabel: string;
    completedLabel: string;
    linkLabel: string;
    detailsPlaceholder: string;
    submitTaskBtn: string;
    historyTitle: string;
    starRatingLabel: string;
    supervisorFeedback: string;
  };
  // Supervisor
  supervisor: {
    pageTitle: string;
    title: string;
    subtitle: string;
    checkedInToday: string;
    missingCheckin: string;
    pendingRating: string;
    avgTeamRating: string;
    tabTasks: string;
    tabCheckins: string;
    tabSpotchecks: string;
    tabAttendance: string;
    tabTeam: string;
    rateBtn: string;
    ratedBadge: string;
    viewSelfieBtn: string;
    noPhoto: string;
    triggerSpotcheckBtn: string;
    triggerSpotcheckConfirm: string;
  };
  // Admin
  admin: {
    pageTitle: string;
    title: string;
    subtitle: string;
    tabEmployees: string;
    tabLogs: string;
    tabTickets: string;
    tabConfig: string;
    employeeListTitle: string;
    addEmployeeBtn: string;
    thEmpId: string;
    thName: string;
    thPosition: string;
    thSupervisor: string;
    thEmail: string;
    thRole: string;
    thStars: string;
    thWfhStatus: string;
    thActions: string;
    addEmpBtn: string;
    editEmpBtn: string;
    resolveTicketBtn: string;
    saveConfigBtn: string;
    wfhStatusToggle: string;
    resetPinBtn: string;
  };
}

export const translations: Record<Language, Translations> = {
  th: {
    nav: {
      dashboard: 'แผงควบคุม',
      checkin: 'ลงเวลาปฏิบัติงาน',
      spotcheck: 'สุ่มตรวจยืนยันตัวตน',
      tasks: 'ส่งงานประจำวัน',
      supervisor: 'แผงหัวหน้างาน',
      admin: 'ผู้ดูแลระบบ (Admin)',
      manual: 'คู่มือการใช้งาน',
      changePin: 'เปลี่ยนรหัส PIN',
      logout: 'ออกจากระบบ',
      userManuals: 'คู่มือการใช้งานระบบ',
      systemTag: 'ระบบติดตามการทำงาน WFH',
    },
    roles: {
      employee: 'พนักงาน',
      supervisor: 'หัวหน้างาน',
      admin: 'ผู้ดูแลระบบ',
    },
    common: {
      confirm: 'ตกลง / เข้าใจแล้ว',
      cancel: 'ยกเลิก',
      save: 'บันทึก',
      saving: 'กำลังบันทึก...',
      submit: 'ส่งข้อมูล',
      submitting: 'กำลังส่ง...',
      close: 'ปิด',
      refresh: 'รีเฟรช',
      viewMap: 'ดูแผนที่',
      search: 'ค้นหา',
      all: 'ทั้งหมด',
      today: 'วันนี้',
      unrated: 'รอประเมินดาว',
      rated: 'ประเมินแล้ว',
      status: 'สถานะ',
      actions: 'การจัดการ',
      date: 'วันที่',
      time: 'เวลา',
      details: 'รายละเอียด',
      note: 'หมายเหตุ',
      reason: 'เหตุผล',
      loading: 'กำลังโหลด...',
      success: 'สำเร็จ',
      error: 'เกิดข้อผิดพลาด',
      noData: 'ไม่มีข้อมูลในระบบ',
      optional: 'ถ้ามี',
      required: 'จำเป็นต้องระบุ',
      itHelpdesk: 'แจ้งปัญหา IT',
      itHelpdeskDesc: 'แจ้งปัญหาการใช้งาน หรือขอความช่วยเหลือจากแอดมิน',
    },
    auth: {
      loginTitle: 'เข้าสู่ระบบ',
      loginSubtitle: 'ระบบบันทึกเวลาและติดตามผลการทำงานนอกสถานที่',
      empIdLabel: 'รหัสพนักงาน (4 หลัก)',
      empIdPlaceholder: 'เช่น 1001',
      pinLabel: 'รหัส PIN (4 หลัก)',
      pinPlaceholder: 'กรุณากรอกรหัส PIN ให้ครบ 4 หลัก',
      loginButton: 'เข้าสู่ระบบ',
      loggingIn: 'กำลังเข้าสู่ระบบ...',
      forgotPinHelp: 'ลืมรหัส PIN หรือถูกระงับสิทธิ์? ติดต่อแอดมินหรือคลิกแจ้งปัญหา',
      changePinTitle: 'เปลี่ยนรหัส PIN ใหม่',
      oldPinLabel: 'PIN เดิม',
      newPinLabel: 'PIN ใหม่ (4 หลัก)',
      confirmPinLabel: 'ยืนยัน PIN ใหม่',
      changePinButton: 'บันทึก PIN ใหม่',
      changePinSuccess: 'เปลี่ยนรหัส PIN สำเร็จ!',
    },
    dashboard: {
      title: 'ภาพรวมการทำงาน WFH',
      subtitle: 'สรุปการลงเวลาเข้า-ออกงาน กิจกรรมสุ่มตรวจ และสถานะส่งงานประจำวัน',
      wfhActive: 'เปิดสิทธิ์ WFH',
      wfhSuspended: 'ระงับสิทธิ์ WFH',
      suspendedBannerTitle: 'บัญชีของคุณถูกระงับสิทธิ์ WFH ชั่วคราว',
      suspendedBannerDesc: 'กรุณาปฏิบัติงานที่ออฟฟิศ หรือกดปุ่ม "แจ้งปัญหา IT" ด้านบนเพื่อขอตรวจสอบและเปิดสิทธิ์กับแอดมิน',
      checkinTimeToday: 'เวลาเข้างานวันนี้',
      checkoutTimeToday: 'เวลาออกงานวันนี้',
      dailyTaskToday: 'รายงานส่งงานวันนี้',
      ratingToday: 'คะแนนดาววันนี้',
      notRecorded: 'ยังไม่ลงเวลา',
      notSubmitted: 'ยังไม่ส่งงาน',
      noRatingYet: 'รอประเมิน',
      quickActions: 'เมนูลัดการทำงาน',
      checkinBtn: 'ลงเวลาปฏิบัติงาน',
      spotcheckBtn: 'สุ่มตรวจยืนยันตัวตน',
      tasksBtn: 'ส่งงานประจำวัน',
      supervisorBtn: 'แผงประเมินงาน',
      adminBtn: 'แผงผู้ดูแลระบบ',
      verifyWindowBannerTitle: '📍 ถึงเวลายืนยันตัวตนช่วงบ่าย (13:00 - 13:20 น.)',
      verifyWindowBannerBadge: 'เปิดรอบแล้ว',
      verifyWindowBannerDesc: 'กรุณาบันทึกพิกัดตำแหน่ง GPS และถ่ายภาพ Selfie ยืนยันการปฏิบัติงานช่วงบ่าย',
      verifyWindowBannerBtn: 'ไปที่หน้าลงเวลา',
      overdueBannerTitle: '⚠️ ยังไม่ได้ยืนยันตัวตนช่วงบ่าย (รอบ 13:00 - 13:20 น.)',
      overdueBannerBadge: 'เกินเวลา 13:20 น.',
      overdueBannerDesc: 'คุณยังไม่ได้บันทึกพิกัด GPS ช่วงบ่าย กรุณากดลงเวลาพร้อมระบุเหตุผลความจำเป็น',
      overdueBannerBtn: 'บันทึกยืนยันตัวตนทันที',
      spotcheckPendingBannerTitle: 'มีรายการสุ่มตรวจยืนยันตัวตน (Spot Check)',
      spotcheckPendingBannerDesc: 'กรุณาสแกนถ่ายรูปยืนยันตัวตนก่อนหมดเวลา',
      spotcheckPendingBannerBtn: 'เข้าสู่หน้าสุ่มตรวจ',
    },
    checkin: {
      pageTitle: 'บันทึกเวลาปฏิบัติงาน (Check-in & GPS)',
      pageSubtitle: 'ลงเวลาเข้างาน/ออกงาน ตรวจสอบพิกัด GPS ออฟฟิศ และถ่ายภาพ Selfie ยืนยันตัวตน',
      morningCheckin: 'ลงเวลาเข้างาน',
      afternoonVerify: 'ยืนยันพิกัดตำแหน่ง',
      eveningCheckout: 'ลงเวลาออกงาน',
      morningTimeHint: 'บันทึกเวลาปฏิบัติงานช่วงเช้าพร้อมพิกัด GPS',
      afternoonTimeHint: 'บันทึกตำแหน่ง GPS ระหว่างวัน',
      eveningTimeHint: 'บันทึกเวลาเลิกงานประจำวัน',
      modalTitle: 'บันทึกเวลาปฏิบัติงาน',
      typeLabel: 'ประเภทการลงเวลา',
      selfieLabel: 'รูปถ่ายยืนยันตัวตน (SELFIE)',
      selfieRequired: 'บังคับถ่ายภาพ Selfie สดจากกล้อง',
      selfieExemptBadge: '🛡️ ยกเว้นการถ่ายภาพ',
      selfieExemptNotice: 'ตำแหน่งของคุณได้รับการยกเว้นไม่ต้องถ่ายภาพ Selfie สด',
      takeSelfieBtn: 'ถ่ายภาพ Selfie สด (Live Camera)',
      retakeBtn: 'ถ่ายใหม่',
      capturePhoto: 'ถ่ายภาพ Selfie สด (Live Camera)',
      retakePhoto: 'ถ่ายใหม่',
      noteLabel: 'หมายเหตุเพิ่มเติม',
      notePlaceholder: 'เช่น ปฏิบัติงาน WFH / นัดลูกค้า',
      reasonLateTitle: 'ระบุเหตุผลเข้าสาย',
      reasonLateNotice: 'เข้างานหลัง 08:00 น. กรุณาระบุเหตุผลความจำเป็น',
      reasonEarlyTitle: 'ระบุเหตุผลออกก่อนเวลา',
      reasonEarlyNotice: 'ออกงานก่อน 17:00 น. กรุณาระบุเหตุผลความจำเป็น',
      movementAlertTitle: 'แจ้งเตือนพิกัดเปลี่ยนเกิน 20 กม.',
      movementAlertNotice: 'ตำแหน่งพิกัดของคุณอยู่ห่างจากจุดเช็คอินแรกเกิน 20 กม. กรุณาระบุเหตุผลการเคลื่อนย้าย',
      movementReasonPlaceholder: 'เช่น เดินทางไปพบลูกค้านอกสถานที่',
      submitCheckin: 'ยืนยันการลงเวลา',
      submittingCheckin: 'กำลังบันทึกเวลา...',
      successMessage: 'บันทึกเวลาปฏิบัติงานสำเร็จ!',
      historyTitle: 'ประวัติการลงเวลาวันนี้',
      gpsLocation: 'พิกัด GPS',
      gpsAcquiring: 'กำลังดึงพิกัด...',
    },
    spotcheck: {
      title: 'สุ่มตรวจยืนยันตัวตน (Spot Check)',
      subtitle: 'กรุณาสแกนยืนยันตัวตนเมื่อได้รับการแจ้งเตือนจากระบบ',
      modalTitle: 'แจ้งเตือนสุ่มตรวจยืนยันตัวตน',
      activePrompt: 'มีรายการสุ่มตรวจที่ต้องตอบกลับ!',
      scanButton: 'เปิดกล้องสแกนตัวตน',
      statusScheduled: 'รอการสุ่มตรวจ',
      statusPending: 'รอการยืนยันตัวตน',
      statusPass: 'ผ่านการสุ่มตรวจ',
      statusFail: 'ไม่ผ่าน (ขาดการติดต่อ)',
      statusExpired: 'หมดเวลา (เกิน 10 นาที)',
      countdownLabel: 'เวลานับถอยหลัง:',
      timeRemaining: 'นาที',
      expiredNotice: 'หมดเวลาการสุ่มตรวจรอบนี้แล้ว',
      selfieLabel: 'ถ่ายภาพยืนยันตัวตนสด',
      gpsLabel: 'พิกัด GPS ปัจจุบัน',
      verifyBtn: 'ส่งผลการสุ่มตรวจ',
      verifying: 'กำลังส่งข้อมูล...',
      exemptBadge: '🛡️ ยกเว้นการถ่ายภาพ',
      exemptNotice: 'ตำแหน่งของคุณได้รับการยกเว้นไม่ต้องถ่ายภาพ Selfie สด',
      historyTitle: 'ประวัติการสุ่มตรวจทั้งหมด',
    },
    tasks: {
      pageTitle: 'รายงานส่งงานประจำวัน (Daily Tasks)',
      modalTitle: 'ส่งรายงานผลงานประจำวัน',
      title: 'ส่งงานประจำวัน',
      subtitle: 'บันทึกผลงานประจำวันเพื่อส่งให้หัวหน้างานประเมินผลคะแนนดาว',
      reportBtn: 'ส่งรายงานประจำวัน',
      submitButton: 'ส่งรายงานประจำวัน',
      editTodayReport: 'แก้ไขรายงานวันนี้',
      pendingRating: 'รอหัวหน้าประเมิน',
      tasksAssigned: 'งานที่ได้รับมอบหมาย (ชิ้น)',
      tasksCompleted: 'งานที่ทำสำเร็จแล้ว (ชิ้น)',
      detailsLabel: 'รายละเอียดผลงานประจำวัน',
      linkAttachment: 'แนบลิงก์ผลงาน (ถ้ามี)',
      assignedLabel: 'จำนวนงานที่ได้รับมอบหมาย (ชิ้น)',
      completedLabel: 'จำนวนงานที่ทำสำเร็จ (ชิ้น)',
      linkLabel: 'แนบลิงก์ผลงาน (เช่น Google Drive, GitHub)',
      detailsPlaceholder: 'ระบุรายละเอียดงานที่ทำในวันนี้ ปัญหาที่พบ หรือความคืบหน้าของโครงการ...',
      submitTaskBtn: 'ส่งรายงานประจำวัน',
      historyTitle: 'ประวัติการส่งรายงานและคะแนนดาว',
      starRatingLabel: 'คะแนนประเมิน',
      supervisorFeedback: 'ความเห็นหัวหน้างาน',
    },
    supervisor: {
      pageTitle: 'แผงประเมินงานหัวหน้า (Supervisor Panel)',
      title: 'แผงประเมินงานหัวหน้า',
      subtitle: 'สรุปสถานะทีมวันนี้ ประเมินดาวผลงาน ติดตามเวลาเข้า-ออกงาน และสั่งสุ่มตรวจเฉพาะกิจ',
      checkedInToday: 'เข้างานแล้ววันนี้',
      missingCheckin: 'ยังไม่ลงเวลาวันนี้',
      pendingRating: 'รายงานรอประเมินดาว',
      avgTeamRating: 'คะแนนดาวเฉลี่ยลูกทีม',
      tabTasks: 'ประเมินรายงานส่งงาน',
      tabCheckins: 'Log เวลาเข้า-ออกงาน & สุ่มตรวจลูกทีม',
      tabSpotchecks: 'จัดการลูกทีม & สั่งสุ่มตรวจเฉพาะกิจ',
      tabAttendance: 'Log เวลาเข้า-ออกงาน & สุ่มตรวจลูกทีม',
      tabTeam: 'จัดการลูกทีม & สั่งสุ่มตรวจเฉพาะกิจ',
      rateBtn: 'ประเมินดาว',
      ratedBadge: 'ประเมินแล้ว',
      viewSelfieBtn: 'ดูรูป Selfie',
      noPhoto: 'ไม่มีไฟล์รูป',
      triggerSpotcheckBtn: 'สั่งสุ่มตรวจเฉพาะกิจ',
      triggerSpotcheckConfirm: 'ยืนยันสั่งสุ่มตรวจพนักงานคนนี้ทันที?',
    },
    admin: {
      pageTitle: 'แผงผู้ดูแลระบบ (Admin Dashboard)',
      title: 'แผงผู้ดูแลระบบ (Admin Desk)',
      subtitle: 'จัดการผู้ใช้งาน ตรวจดู Log การลงเวลา Ticket ปัญหา และตั้งค่าระบบ',
      tabEmployees: 'จัดการพนักงาน',
      tabLogs: 'Log การลงเวลาทั้งหมด',
      tabTickets: 'Ticket แจ้งปัญหา',
      tabConfig: 'การตั้งค่าระบบ',
      employeeListTitle: 'รายชื่อพนักงานและสิทธิ์ WFH',
      addEmployeeBtn: 'เพิ่มพนักงานใหม่',
      thEmpId: 'รหัส',
      thName: 'ชื่อ-นามสกุล',
      thPosition: 'ตำแหน่ง / แผนก',
      thSupervisor: 'หัวหน้างาน',
      thEmail: 'อีเมล',
      thRole: 'บทบาท',
      thStars: 'สะสม 1-ดาว',
      thWfhStatus: 'สถานะ WFH',
      thActions: 'การจัดการ',
      addEmpBtn: 'เพิ่มพนักงานใหม่',
      editEmpBtn: 'แก้ไขข้อมูล',
      resolveTicketBtn: 'ตอบกลับ & ปิดงาน Ticket',
      saveConfigBtn: 'บันทึกการตั้งค่า',
      wfhStatusToggle: 'เปลี่ยนสถานะสิทธิ์ WFH',
      resetPinBtn: 'รีเซ็ตรหัส PIN',
    },
  },
  en: {
    nav: {
      dashboard: 'Dashboard',
      checkin: 'Attendance',
      spotcheck: 'Spot Check',
      tasks: 'Daily Tasks',
      supervisor: 'Supervisor Panel',
      admin: 'Admin Desk',
      manual: 'User Manual',
      changePin: 'Change PIN',
      logout: 'Log Out',
      userManuals: 'User Guide & Documentation',
      systemTag: 'WFH Monitoring System',
    },
    roles: {
      employee: 'Employee',
      supervisor: 'Supervisor',
      admin: 'Administrator',
    },
    common: {
      confirm: 'Confirm / Understood',
      cancel: 'Cancel',
      save: 'Save',
      saving: 'Saving...',
      submit: 'Submit',
      submitting: 'Submitting...',
      close: 'Close',
      refresh: 'Refresh',
      viewMap: 'View Map',
      search: 'Search',
      all: 'All',
      today: 'Today',
      unrated: 'Pending Review',
      rated: 'Reviewed',
      status: 'Status',
      actions: 'Actions',
      date: 'Date',
      time: 'Time',
      details: 'Details',
      note: 'Note',
      reason: 'Reason',
      loading: 'Loading...',
      success: 'Success',
      error: 'Error',
      noData: 'No data available',
      optional: 'Optional',
      required: 'Required',
      itHelpdesk: 'IT Helpdesk',
      itHelpdeskDesc: 'Report issues or request support from Admin',
    },
    auth: {
      loginTitle: 'Sign In',
      loginSubtitle: 'Remote Work & GPS Attendance Management System',
      empIdLabel: 'Employee ID (4 Digits)',
      empIdPlaceholder: 'e.g. 1001',
      pinLabel: 'PIN Code (4 Digits)',
      pinPlaceholder: 'Please enter your 4-digit PIN',
      loginButton: 'Sign In',
      loggingIn: 'Signing in...',
      forgotPinHelp: 'Forgot PIN or Suspended? Contact admin or create a ticket.',
      changePinTitle: 'Change Security PIN',
      oldPinLabel: 'Current PIN',
      newPinLabel: 'New PIN (4 Digits)',
      confirmPinLabel: 'Confirm New PIN',
      changePinButton: 'Update PIN',
      changePinSuccess: 'PIN updated successfully!',
    },
    dashboard: {
      title: 'WFH Overview',
      subtitle: 'Summary of attendance check-in/out, spot check verifications, and daily task reports',
      wfhActive: 'WFH Active',
      wfhSuspended: 'WFH Suspended',
      suspendedBannerTitle: 'Your WFH Privilege is Temporarily Suspended',
      suspendedBannerDesc: 'Please work at the office or click "IT Helpdesk" above to request review with admin.',
      checkinTimeToday: 'Check-in Time Today',
      checkoutTimeToday: 'Check-out Time Today',
      dailyTaskToday: 'Daily Tasks Report',
      ratingToday: 'Star Rating Today',
      notRecorded: 'Not Recorded',
      notSubmitted: 'Not Submitted',
      noRatingYet: 'Pending',
      quickActions: 'Quick Navigation',
      checkinBtn: 'Attendance Check-in',
      spotcheckBtn: 'Spot Check Verification',
      tasksBtn: 'Daily Tasks',
      supervisorBtn: 'Supervisor Evaluation',
      adminBtn: 'Admin Dashboard',
      verifyWindowBannerTitle: '📍 Afternoon Verification Round Open (13:00 - 13:20 PM)',
      verifyWindowBannerBadge: 'Round Active',
      verifyWindowBannerDesc: 'Please record your GPS coordinates and live selfie to confirm afternoon attendance.',
      verifyWindowBannerBtn: 'Go to Check-in',
      overdueBannerTitle: '⚠️ Afternoon Verification Overdue (Round 13:00 - 13:20 PM)',
      overdueBannerBadge: 'Overdue > 13:20',
      overdueBannerDesc: 'You have not verified your afternoon GPS. Please record your verification and state reason.',
      overdueBannerBtn: 'Verify Attendance Now',
      spotcheckPendingBannerTitle: 'Spot Check Verification Pending',
      spotcheckPendingBannerDesc: 'Please take a live selfie to verify your presence before timer expires.',
      spotcheckPendingBannerBtn: 'Open Spot Check',
    },
    checkin: {
      pageTitle: 'Attendance & GPS Verification',
      pageSubtitle: 'Morning check-in, evening check-out, office GPS geofence checks, and live selfies',
      morningCheckin: 'Morning Check-in',
      afternoonVerify: 'Afternoon Verification',
      eveningCheckout: 'Evening Check-out',
      morningTimeHint: 'Record morning start time with GPS coordinates',
      afternoonTimeHint: 'Record afternoon verification location',
      eveningTimeHint: 'Record end-of-day clock-out',
      modalTitle: 'Record Attendance',
      typeLabel: 'Check-in Type',
      selfieLabel: 'Identity Verification (SELFIE)',
      selfieRequired: 'Live camera selfie required',
      selfieExemptBadge: '🛡️ Photo Exempt',
      selfieExemptNotice: 'Your position is exempt from live selfie requirement',
      takeSelfieBtn: 'Capture Live Selfie',
      retakeBtn: 'Retake Photo',
      capturePhoto: 'Capture Live Selfie',
      retakePhoto: 'Retake Photo',
      noteLabel: 'Additional Note',
      notePlaceholder: 'e.g. Working from home / Meeting client',
      reasonLateTitle: 'State Reason for Late Arrival',
      reasonLateNotice: 'Arrived after 08:00 AM. Please provide a mandatory reason.',
      reasonEarlyTitle: 'State Reason for Early Leave',
      reasonEarlyNotice: 'Departing before 17:00 PM. Please provide a mandatory reason.',
      movementAlertTitle: 'Location Shift Warning (> 20 km)',
      movementAlertNotice: 'Current GPS is over 20 km away from morning check-in. Please provide relocation reason.',
      movementReasonPlaceholder: 'e.g. Travelled for on-site customer meeting',
      submitCheckin: 'Confirm & Submit',
      submittingCheckin: 'Submitting attendance...',
      successMessage: 'Attendance recorded successfully!',
      historyTitle: "Today's Attendance History",
      gpsLocation: 'GPS Coordinates',
      gpsAcquiring: 'Acquiring GPS position...',
    },
    spotcheck: {
      title: 'Spot Check Verification',
      subtitle: 'Please verify your identity and location when prompted by the system',
      modalTitle: 'Spot Check Alert',
      activePrompt: 'Spot Check Action Required!',
      scanButton: 'Open Camera & Scan',
      statusScheduled: 'Scheduled',
      statusPending: 'Pending Verification',
      statusPass: 'Passed Verification',
      statusFail: 'Failed / Unresponsive',
      statusExpired: 'Expired (> 10 mins)',
      countdownLabel: 'Time Remaining:',
      timeRemaining: 'mins',
      expiredNotice: 'Spot check window has expired for this round.',
      selfieLabel: 'Live Camera Selfie',
      gpsLabel: 'Current GPS Coordinates',
      verifyBtn: 'Submit Verification',
      verifying: 'Verifying...',
      exemptBadge: '🛡️ Photo Exempt',
      exemptNotice: 'Your position is exempt from mandatory live selfies',
      historyTitle: 'Spot Check Audit History',
    },
    tasks: {
      pageTitle: 'Daily Work Reports (Tasks)',
      modalTitle: 'Submit Daily Work Report',
      title: 'Daily Tasks',
      subtitle: 'Submit your daily work deliverables for supervisor star rating evaluation',
      reportBtn: 'Submit Daily Report',
      submitButton: 'Submit Daily Report',
      editTodayReport: "Edit Today's Report",
      pendingRating: 'Pending Review',
      tasksAssigned: 'Assigned Tasks',
      tasksCompleted: 'Completed Tasks',
      detailsLabel: 'Daily Work Details',
      linkAttachment: 'Work Link Attachment',
      assignedLabel: 'Assigned Tasks (Count)',
      completedLabel: 'Completed Tasks (Count)',
      linkLabel: 'Work Deliverable Link (e.g. Google Drive, GitHub)',
      detailsPlaceholder: 'Describe your deliverables today, blockers, or project milestones...',
      submitTaskBtn: 'Submit Daily Report',
      historyTitle: 'Submission History & Star Ratings',
      starRatingLabel: 'Star Rating',
      supervisorFeedback: 'Supervisor Feedback',
    },
    supervisor: {
      pageTitle: 'Supervisor Evaluation Panel',
      title: 'Supervisor Panel',
      subtitle: 'Team status overview, star rating evaluations, attendance logs, and on-demand spot checks',
      checkedInToday: 'Checked In Today',
      missingCheckin: 'Not Checked In Today',
      pendingRating: 'Reports Pending Rating',
      avgTeamRating: 'Team Average Star Rating',
      tabTasks: 'Review Task Reports',
      tabCheckins: 'Team Attendance & Spot Checks',
      tabSpotchecks: 'Team & Spot Check Triggers',
      tabAttendance: 'Team Attendance & Spot Checks',
      tabTeam: 'Team & Spot Check Triggers',
      rateBtn: 'Rate Stars',
      ratedBadge: 'Rated',
      viewSelfieBtn: 'View Selfie',
      noPhoto: 'No photo file',
      triggerSpotcheckBtn: 'Trigger Spot Check',
      triggerSpotcheckConfirm: 'Confirm triggering spot check for this employee now?',
    },
    admin: {
      pageTitle: 'Administrator Dashboard',
      title: 'Administrator Desk',
      subtitle: 'Manage user accounts, inspect attendance logs, resolve support tickets, and configure system rules',
      tabEmployees: 'Manage Employees',
      tabLogs: 'All Attendance Logs',
      tabTickets: 'Support Tickets',
      tabConfig: 'System Configuration',
      employeeListTitle: 'Employee Directory & WFH Privileges',
      addEmployeeBtn: 'Add New Employee',
      thEmpId: 'ID',
      thName: 'Name',
      thPosition: 'Position / Dept',
      thSupervisor: 'Supervisor',
      thEmail: 'Email',
      thRole: 'Role',
      thStars: '1-Star Acc.',
      thWfhStatus: 'WFH Status',
      thActions: 'Actions',
      addEmpBtn: 'Add Employee',
      editEmpBtn: 'Edit Info',
      resolveTicketBtn: 'Resolve & Close Ticket',
      saveConfigBtn: 'Save Settings',
      wfhStatusToggle: 'Toggle WFH Privilege',
      resetPinBtn: 'Reset PIN',
    },
  },
};

interface LanguageContextType {
  lang: Language;
  setLang: (l: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'th',
  setLang: () => {},
  t: translations.th,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>('th');

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('wfh_lang') as Language | null;
      if (savedLang === 'th' || savedLang === 'en') {
        setLangState(savedLang);
      }
    } catch {}
  }, []);

  const setLang = (l: Language) => {
    setLangState(l);
    try {
      localStorage.setItem('wfh_lang', l);
      document.cookie = `wfh_lang=${l}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {}
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
