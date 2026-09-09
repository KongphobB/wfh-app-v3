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
    leave: string;
    analytics: string;
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
    noEmpIdYet: string;
    registerNewEmp: string;
    registerModalTitle: string;
    registerModalDesc: string;
    idGuidelineTitle: string;
    idGuidelineRegular: string;
    idGuidelineRegularDesc: string;
    idGuidelineIntern: string;
    idGuidelineInternDesc: string;
    nameLabel: string;
    namePlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    positionLabel: string;
    positionPlaceholder: string;
    deptLabel: string;
    deptPlaceholder: string;
    regPinLabel: string;
    regConfirmPinLabel: string;
    registerAndLoginBtn: string;
    registeringBtn: string;
    regIdPlaceholder: string;
    regIdLengthError: string;
    regNameRequiredError: string;
    regPinDigitsError: string;
    regPinMismatchError: string;
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
  // Leave
  leave: {
    title: string;
    subtitle: string;
    requestBtn: string;
    modalTitle: string;
    modalSubtitle: string;
    leaveTypeLabel: string;
    startDateLabel: string;
    endDateLabel: string;
    reasonLabel: string;
    reasonPlaceholder: string;
    sickLeave: string;
    personalLeave: string;
    vacationLeave: string;
    onsiteLeave: string;
    pending: string;
    approved: string;
    rejected: string;
    historyTitle: string;
    historySubtitle: string;
    allHistoryTitle: string;
    allHistorySubtitle: string;
    supervisorTitle: string;
    supervisorSubtitle: string;
    approveBtn: string;
    rejectBtn: string;
    noRequests: string;
    leaveDays: string;
    autoExemptNote: string;
  };
  // Analytics
  analytics: {
    title: string;
    subtitle: string;
    onTimeRate: string;
    onTimeDesc: string;
    avgRating: string;
    avgRatingDesc: string;
    taskCompletion: string;
    taskCompletionDesc: string;
    spotCheckRate: string;
    spotCheckDesc: string;
    starDistribution: string;
    weeklyTrend: string;
    attendanceSummary: string;
    workdays: string;
    leaveDays: string;
    lateDays: string;
    onTimeDays: string;
    excellentScore: string;
    goodScore: string;
    improveScore: string;
  };
  // Onboarding Tour
  onboarding: {
    title: string;
    subtitle: string;
    step1Title: string;
    step1Desc: string;
    step1Point1: string;
    step1Point2: string;
    step2Title: string;
    step2Desc: string;
    step2Point1: string;
    step2Point2: string;
    step3Title: string;
    step3Desc: string;
    step3Point1: string;
    step3Point2: string;
    step4Title: string;
    step4Desc: string;
    step4Point1: string;
    step4Point2: string;
    nextBtn: string;
    prevBtn: string;
    getStartedBtn: string;
    viewManualBtn: string;
    quickGuideBtn: string;
  };
  // Suggestion Box
  suggestion: {
    title: string;
    subtitle: string;
    openBtn: string;
    modalTitle: string;
    modalSubtitle: string;
    topicLabel: string;
    topicPlaceholder: string;
    categoryLabel: string;
    contentLabel: string;
    contentPlaceholder: string;
    anonymousToggle: string;
    anonymousNote: string;
    submitBtn: string;
    statusNew: string;
    statusInProgress: string;
    statusResolved: string;
    adminReplyLabel: string;
    adminReplyPlaceholder: string;
    updateStatusBtn: string;
  };
  // Lunch Break
  lunchBreak: {
    bannerTitle: string;
    bannerDesc: string;
    badge: string;
  };
  // Company Holiday Calendar
  holiday: {
    title: string;
    subtitle: string;
    openBtn: string;
    modalTitle: string;
    modalSubtitle: string;
    upcomingTitle: string;
    upcomingEmpty: string;
    policyDocTitle: string;
    policyDocSubtitle: string;
    viewDocBtn: string;
    downloadDocBtn: string;
    daysLeftText: string;
    todayText: string;
    officialBadge: string;
    companyBadge: string;
    addHolidayBtn: string;
    uploadPolicyBtn: string;
  };
  // Admin Audit Trail
  audit: {
    tabTitle: string;
    pageTitle: string;
    pageSubtitle: string;
    searchPlaceholder: string;
    filterAllActions: string;
    colTimestamp: string;
    colAdmin: string;
    colAction: string;
    colTarget: string;
    colDetails: string;
    emptyText: string;
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
      leave: 'ขอลาหยุด / สลับวัน',
      analytics: 'สถิติการทำงาน',
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
      noEmpIdYet: 'ยังไม่มีรหัสพนักงาน?',
      registerNewEmp: 'ลงทะเบียนพนักงานใหม่',
      registerModalTitle: 'ลงทะเบียนพนักงานใหม่',
      registerModalDesc: 'กรอกข้อมูลเพื่อลงทะเบียนสร้างรหัสผ่านพนักงานสำหรับเข้าใช้งาน',
      idGuidelineTitle: 'คำแนะนำการกรอกรหัสพนักงาน (ID):',
      idGuidelineRegular: 'สำหรับพนักงานประจำ',
      idGuidelineRegularDesc: 'ให้กรอก รหัสพนักงานของตนเอง (เช่น 1001, 1002)',
      idGuidelineIntern: 'สำหรับนักศึกษาฝึกงาน',
      idGuidelineInternDesc: 'ให้ใช้รหัสช่วง 9000 - 9999 (เช่น 9001, 9002)',
      nameLabel: 'ชื่อ-นามสกุล *',
      namePlaceholder: 'นาย สมศักดิ์ ใจดี',
      emailLabel: 'อีเมลพนักงาน',
      emailPlaceholder: 'somsak@company.com',
      positionLabel: 'ตำแหน่งงาน',
      positionPlaceholder: 'เช่น Senior Developer',
      deptLabel: 'แผนก / ฝ่าย',
      deptPlaceholder: 'เช่น Software Engineering',
      regPinLabel: 'รหัส PIN (4 หลัก) *',
      regConfirmPinLabel: 'ยืนยัน PIN (4 หลัก) *',
      registerAndLoginBtn: 'ลงทะเบียน และ ล็อกอิน',
      registeringBtn: 'กำลังบันทึก...',
      regIdPlaceholder: 'เช่น 1002 หรือ 9001',
      regIdLengthError: 'รหัสพนักงานต้องมีอย่างน้อย 4 หลัก',
      regNameRequiredError: 'กรุณากรอกชื่อ-นามสกุล',
      regPinDigitsError: 'รหัส PIN ต้องเป็นตัวเลข 4 หลัก',
      regPinMismatchError: 'รหัส PIN และ ยืนยัน PIN ไม่ตรงกัน',
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
    leave: {
      title: 'ระบบแจ้งขอลาหยุด & สลับวัน',
      subtitle: 'ยื่นคำขอลาป่วย ลากิจ ลาพักร้อน หรือขอสลับเข้าออฟฟิศ เพื่อยกเว้นการแจ้งเตือนขาดงานอัตโนมัติ',
      requestBtn: 'ยื่นคำขอลา / สลับวัน',
      modalTitle: 'แบบฟอร์มขอลาหยุด / สลับวันเข้าออฟฟิศ',
      modalSubtitle: 'กรอกข้อมูลการลา ระบบจะบันทึกสถานะและยกเว้นการแจ้งเตือนขาดงานให้อัตโนมัติ',
      leaveTypeLabel: 'ประเภทการลา *',
      startDateLabel: 'ตั้งแต่วันที่ *',
      endDateLabel: 'ถึงวันที่ *',
      reasonLabel: 'เหตุผลความจำเป็น *',
      reasonPlaceholder: 'ระบุรายละเอียด เช่น มีอาการไข้หวัด, ติดต่อราชการ, หรือมีนัดประชุมออฟฟิศ...',
      sickLeave: 'ลาป่วย (Sick Leave)',
      personalLeave: 'ลากิจ (Personal Leave)',
      vacationLeave: 'ลาพักร้อน (Annual Leave)',
      onsiteLeave: 'ปฏิบัติงานที่ออฟฟิศ (Work Onsite)',
      pending: 'รอพิจารณา',
      approved: 'อนุมัติแล้ว',
      rejected: 'ไม่อนุมัติ',
      historyTitle: 'ประวัติการขอลาหยุดของฉัน',
      historySubtitle: 'รายการคำขอลาหยุดและการอนุมัติทั้งหมด',
      allHistoryTitle: 'ประวัติและบันทึกการลา / เข้าออฟฟิศทั้งหมด',
      allHistorySubtitle: 'รายการประวัติการขอลาและแจ้งเข้าปฏิบัติงานที่ออฟฟิศทั้งหมดในระบบ',
      supervisorTitle: 'รายการคำขอลาของทีมที่ต้องพิจารณา',
      supervisorSubtitle: 'ตรวจสอบและกดอนุมัติคำขอลาของสมาชิกในทีม',
      approveBtn: 'อนุมัติคำขอ',
      rejectBtn: 'ปฏิเสธคำขอ',
      noRequests: 'ยังไม่มีประวัติการขอลาในระบบ',
      leaveDays: 'วัน',
      autoExemptNote: '✨ ในวันที่ได้รับอนุมัติ ระบบจะยกเว้นการส่งอีเมลแจ้งเตือนขาดงานให้อัตโนมัติ',
    },
    analytics: {
      title: 'สถิติและประสิทธิภาพการทำงาน (Personal Analytics)',
      subtitle: 'ภาพรวมแนวโน้มการเข้างานตรงเวลา คะแนนประเมินดาวสะสม และผลการส่งมอบงาน',
      onTimeRate: 'อัตราเข้างานตรงเวลา',
      onTimeDesc: 'สัดส่วนการลงเวลาก่อน 08:00 น.',
      avgRating: 'คะแนนดาวเฉลี่ย',
      avgRatingDesc: 'คะแนนประเมินคุณภาพงานจากหัวหน้า',
      taskCompletion: 'อัตราส่งมอบงาน',
      taskCompletionDesc: 'งานที่ทำเสร็จเทียบกับที่ได้รับมอบหมาย',
      spotCheckRate: 'อัตราผ่านการสุ่มตรวจ',
      spotCheckDesc: 'ความสม่ำเสมอในการยืนยันตัวตน 10 นาที',
      starDistribution: 'การกระจายคะแนนดาว (Star Rating Distribution)',
      weeklyTrend: 'แนวโน้มการเข้างานและผลงานรอบ 7 วันล่าสุด',
      attendanceSummary: 'สรุปสถานะการปฏิบัติงานในรอบเดือน',
      workdays: 'วันทำงานทั้งหมด',
      leaveDays: 'วันลาที่อนุมัติ',
      lateDays: 'เข้างานสาย',
      onTimeDays: 'เข้างานตรงเวลา',
      excellentScore: 'ยอดเยี่ยม (5 ดาว)',
      goodScore: 'ดีมาก (3-4 ดาว)',
      improveScore: 'ต้องปรับปรุง (1-2 ดาว)',
    },
    onboarding: {
      title: '🎉 ยินดีต้อนรับสู่ระบบ SNU WFH!',
      subtitle: '4 ขั้นตอนง่ายๆ ในการปฏิบัติงาน Work From Home ประจำวันอย่างมีประสิทธิภาพ',
      step1Title: '1. ลงเวลาเข้างานช่วงเช้า (Check-in)',
      step1Desc: 'กดลงเวลาก่อน 08:00 น. เพื่อรักษาสถิติตรงเวลา',
      step1Point1: 'เปิดกล้องถ่ายรูป Selfie สดและตรวจสอบระยะห่างพิกัด GPS',
      step1Point2: 'หากลงเวลาหลัง 08:00 น. ระบบจะบันทึกว่าสาย และให้ระบุเหตุผลความจำเป็น',
      step2Title: '2. สุ่มตรวจยืนยันตัวตน (Spot Check)',
      step2Desc: 'สแกนใบหน้าภายใน 10:00 นาทีเมื่อได้รับสัญญาณแจ้งเตือน',
      step2Point1: 'เมื่อมีเสียงเตือน 🔔 ให้เปิดกล้องและถ่ายรูป Selfie สดยืนยันตัวตน',
      step2Point2: 'หากไม่สแกนภายใน 10 นาทีครบ 3 ครั้ง สิทธิ์ WFH จะถูกระงับอัตโนมัติ',
      step3Title: '3. ส่งรายงานผลงานประจำวัน (Daily Tasks)',
      step3Desc: 'บันทึกงานที่ทำเสร็จและแนบลิงก์ก่อนเลิกงาน',
      step3Point1: 'ระบุจำนวนงานที่ทำเสร็จ แนบลิงก์ชิ้นงาน (Google Drive / GitHub / เอกสาร)',
      step3Point2: 'หัวหน้างานจะตรวจงานและให้คะแนน 1-5 ดาวสะสมในหน้าสถิติ',
      step4Title: '4. ขอลาหยุด / สลับเข้าออฟฟิศ (Leave & Onsite)',
      step4Desc: 'แจ้งล่วงหน้าเพื่อยกเว้นการแจ้งเตือนขาดงานอัตโนมัติ',
      step4Point1: 'ยื่นคำขอลาป่วย ลากิจ ลาพักร้อน เพื่อรอหัวหน้างานอนุมัติ',
      step4Point2: 'แจ้ง "ปฏิบัติงานที่ออฟฟิศ (Onsite)" ระบบจะอนุมัติทันทีและไม่ส่งอีเมลเตือนสาย',
      nextBtn: 'ถัดไป',
      prevBtn: 'ย้อนกลับ',
      getStartedBtn: '🚀 เข้าใจแล้ว เริ่มต้นใช้งาน!',
      viewManualBtn: '📖 ดูคู่มือการใช้งานฉบับเต็ม',
      quickGuideBtn: 'แนะนำการใช้งาน (Quick Guide)',
    },
    suggestion: {
      title: 'กล่องรับฟังข้อเสนอแนะ (Suggestion Box)',
      subtitle: 'ส่งความคิดเห็นและข้อเสนอแนะในการปรับปรุงระบบและการทำงาน (เลือกไม่ระบุตัวตนได้ 100%)',
      openBtn: 'กล่องข้อเสนอแนะ',
      modalTitle: 'แบบฟอร์มส่งข้อเสนอแนะ',
      modalSubtitle: 'ส่งความคิดเห็นโดยตรงถึงผู้บริหารและแอดมิน เพื่อร่วมพัฒนาองค์กรและระบบ WFH',
      topicLabel: 'หัวข้อข้อเสนอแนะ *',
      topicPlaceholder: 'เช่น เสนอปรับปรุงความเร็วระบบ, เสนอเพิ่มเมนู...',
      categoryLabel: 'หมวดหมู่ *',
      contentLabel: 'รายละเอียดข้อคิดเห็น / ข้อเสนอแนะ *',
      contentPlaceholder: 'พิมพ์ข้อเสนอแนะหรือปัญหาที่พบอย่างละเอียด เพื่อให้ทีมงานนำไปปรับปรุง...',
      anonymousToggle: 'ส่งแบบไม่ระบุตัวตน (100% Anonymous)',
      anonymousNote: '🔒 เมื่อเปิดใช้งาน ระบบจะไม่บันทึกชื่อ รหัสพนักงาน หรือข้อมูลระบุตัวตนใดๆ',
      submitBtn: 'ส่งข้อเสนอแนะ',
      statusNew: 'รับเรื่องใหม่',
      statusInProgress: 'กำลังดำเนินการ',
      statusResolved: 'ดำเนินการเรียบร้อย',
      adminReplyLabel: 'ข้อความตอบรับ / บันทึกการดำเนินการจากแอดมิน',
      adminReplyPlaceholder: 'พิมพ์บันทึกการตอบรับหรือแนวทางแก้ไข...',
      updateStatusBtn: 'บันทึกสถานะ',
    },
    lunchBreak: {
      bannerTitle: '🍱 เวลาพักรับประทานอาหารกลางวัน (Lunch Break)',
      bannerDesc: 'ขณะนี้เวลา 12:00 - 13:00 น. เป็นเวลาพักเที่ยง พักผ่อนและทานอาหารได้อย่างสบายใจ ระบบจะยกเว้นการสุ่มตรวจอัตโนมัติในช่วงเวลานี้',
      badge: '12:00 - 13:00 น.',
    },
    holiday: {
      title: 'ปฏิทินวันหยุดประจำปี (Company Holidays)',
      subtitle: 'วันหยุดนักขัตฤกษ์และวันหยุดตามประเพณีของบริษัทประจำปี',
      openBtn: 'ปฏิทินวันหยุด',
      modalTitle: 'ปฏิทินวันหยุดประจำปี 2026',
      modalSubtitle: 'ตรวจสอบวันหยุดนักขัตฤกษ์และประกาศวันหยุดของบริษัท เพื่อวางแผนการทำงานและการลาล่วงหน้า',
      upcomingTitle: 'วันหยุดที่กำลังจะมาถึง (Upcoming Holidays)',
      upcomingEmpty: 'ไม่มีวันหยุดในช่วง 60 วันข้างหน้า',
      policyDocTitle: '📄 เอกสารประกาศวันหยุดทางการของบริษัท',
      policyDocSubtitle: 'แนบและรับรองโดยฝ่ายทรัพยากรบุคคล (HR & Admin)',
      viewDocBtn: 'เปิดดูประกาศ',
      downloadDocBtn: 'ดาวน์โหลดเอกสาร',
      daysLeftText: 'อีก {days} วัน',
      todayText: 'วันนี้วันหยุด! 🎉',
      officialBadge: 'นักขัตฤกษ์',
      companyBadge: 'วันหยุดบริษัท',
      addHolidayBtn: 'เพิ่มวันหยุดพิเศษ',
      uploadPolicyBtn: 'แนบไฟล์ประกาศวันหยุด',
    },
    audit: {
      tabTitle: 'ประวัติการทำงาน (Audit Trail)',
      pageTitle: 'บันทึกประวัติการทำงานของผู้ดูแลระบบ (Admin Audit Trail)',
      pageSubtitle: 'ติดตามและตรวจสอบทุกการกระทำของ Admin และ Supervisor ในระบบอย่างโปร่งใส',
      searchPlaceholder: 'ค้นหาด้วยชื่อแอดมิน, รหัสพนักงาน หรือรายละเอียด...',
      filterAllActions: 'ทุกประเภทกิจกรรม',
      colTimestamp: 'วัน-เวลา',
      colAdmin: 'ผู้ดำเนินการ',
      colAction: 'กิจกรรม / คำสั่ง',
      colTarget: 'เป้าหมาย',
      colDetails: 'รายละเอียดการเปลี่ยนแปลง',
      emptyText: 'ไม่พบบันทึกประวัติการทำงานตามเงื่อนไขที่เลือก',
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
      leave: 'Leave & Schedule',
      analytics: 'Analytics',
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
      noEmpIdYet: "Don't have an Employee ID?",
      registerNewEmp: 'Register New Employee',
      registerModalTitle: 'New Employee Registration',
      registerModalDesc: 'Fill in your details to create an account and security PIN',
      idGuidelineTitle: 'Employee ID Guidelines:',
      idGuidelineRegular: 'For Regular Employees',
      idGuidelineRegularDesc: 'Enter your assigned Employee ID (e.g. 1001, 1002)',
      idGuidelineIntern: 'For Intern Students',
      idGuidelineInternDesc: 'Use an ID in the 9000 - 9999 range (e.g. 9001, 9002)',
      nameLabel: 'Full Name *',
      namePlaceholder: 'e.g. John Doe',
      emailLabel: 'Employee Email',
      emailPlaceholder: 'john.doe@company.com',
      positionLabel: 'Job Position',
      positionPlaceholder: 'e.g. Senior Developer',
      deptLabel: 'Department',
      deptPlaceholder: 'e.g. Software Engineering',
      regPinLabel: 'Security PIN (4 Digits) *',
      regConfirmPinLabel: 'Confirm PIN (4 Digits) *',
      registerAndLoginBtn: 'Register & Sign In',
      registeringBtn: 'Registering...',
      regIdPlaceholder: 'e.g. 1002 or 9001',
      regIdLengthError: 'Employee ID must be at least 4 characters',
      regNameRequiredError: 'Full Name is required',
      regPinDigitsError: 'PIN must be exactly 4 numeric digits',
      regPinMismatchError: 'PIN and Confirm PIN do not match',
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
    leave: {
      title: 'Leave & Schedule Exemption Portal',
      subtitle: 'Submit sick, personal, vacation leave or request onsite office days to automatically suppress missing attendance alerts',
      requestBtn: 'Submit Leave Request',
      modalTitle: 'Leave & Schedule Exemption Form',
      modalSubtitle: 'Submit your leave request. Missing check-in alerts will be automatically suppressed for approved days',
      leaveTypeLabel: 'Leave Type *',
      startDateLabel: 'Start Date *',
      endDateLabel: 'End Date *',
      reasonLabel: 'Reason & Justification *',
      reasonPlaceholder: 'Describe details e.g. sick leave with flu, government appointment, or scheduled onsite meeting...',
      sickLeave: 'Sick Leave',
      personalLeave: 'Personal Leave',
      vacationLeave: 'Annual Vacation Leave',
      onsiteLeave: 'Work Onsite (Office Exemption)',
      pending: 'Pending Review',
      approved: 'Approved',
      rejected: 'Rejected',
      historyTitle: 'My Leave History',
      historySubtitle: 'All past leave and schedule exemption requests',
      allHistoryTitle: 'All Leave & Work Onsite History',
      allHistorySubtitle: 'Comprehensive record of all leave and onsite requests in the system',
      supervisorTitle: 'Team Leave Requests for Approval',
      supervisorSubtitle: 'Review and approve leave submissions from team members',
      approveBtn: 'Approve Request',
      rejectBtn: 'Reject Request',
      noRequests: 'No leave requests recorded in the system',
      leaveDays: 'days',
      autoExemptNote: '✨ Approved days will automatically suppress morning missing check-in email alerts',
    },
    analytics: {
      title: 'Personal Performance & Analytics',
      subtitle: 'Comprehensive breakdown of on-time attendance, star rating distribution, and task completion metrics',
      onTimeRate: 'On-time Rate',
      onTimeDesc: 'Percentage of check-ins before 08:00 AM',
      avgRating: 'Average Star Rating',
      avgRatingDesc: 'Quality rating evaluated by supervisors',
      taskCompletion: 'Task Completion Rate',
      taskCompletionDesc: 'Tasks delivered vs assigned workload',
      spotCheckRate: 'Spot Check Compliance',
      spotCheckDesc: '10-minute spot check verification consistency',
      starDistribution: 'Star Rating Distribution',
      weeklyTrend: 'Recent 7-Day Performance & Attendance Trend',
      attendanceSummary: 'Monthly Attendance Status Breakdown',
      workdays: 'Total Workdays',
      leaveDays: 'Approved Leave',
      lateDays: 'Late Check-ins',
      onTimeDays: 'On-time Check-ins',
      excellentScore: 'Excellent (5 Stars)',
      goodScore: 'Good (3-4 Stars)',
      improveScore: 'Needs Improvement (1-2 Stars)',
    },
    onboarding: {
      title: '🎉 Welcome to SNU WFH System!',
      subtitle: '4 Simple steps to excel in your daily Work From Home routine',
      step1Title: '1. Morning Attendance Check-in',
      step1Desc: 'Check in before 08:00 AM to maintain your on-time score',
      step1Point1: 'Take a live selfie camera photo and verify your office GPS distance',
      step1Point2: 'Check-ins after 08:00 AM are marked as late and require a reason note',
      step2Title: '2. Identity Spot-Check Verification',
      step2Desc: 'Verify your live identity within 10:00 minutes when notified',
      step2Point1: 'When the alert sound pings 🔔, open camera and capture a live selfie',
      step2Point2: 'Missing 3 consecutive 10-minute checks will automatically suspend WFH privileges',
      step3Title: '3. Daily Tasks Submission',
      step3Desc: 'Log your completed workload and links before end of day',
      step3Point1: 'Report completed task counts and attach work links (Drive, GitHub, Docs)',
      step3Point2: 'Supervisors review and award 1-5 star ratings shown in your analytics',
      step4Title: '4. Leave & Work Onsite Exemption',
      step4Desc: 'Request in advance to auto-suppress missing check-in alerts',
      step4Point1: 'Submit Sick, Personal, or Vacation leave for supervisor approval',
      step4Point2: 'Work Onsite is auto-approved instantly and disables morning email alerts',
      nextBtn: 'Next',
      prevBtn: 'Previous',
      getStartedBtn: '🚀 Got it, Get Started!',
      viewManualBtn: '📖 View Complete User Manual',
      quickGuideBtn: 'Quick Start Guide',
    },
    suggestion: {
      title: 'Suggestion Box',
      subtitle: 'Submit feedback, ideas, or improvement requests (100% Anonymous option available)',
      openBtn: 'Suggestion Box',
      modalTitle: 'Submit Suggestion / Feedback',
      modalSubtitle: 'Share ideas directly with management and administrators to improve the WFH workflow',
      topicLabel: 'Suggestion Topic *',
      topicPlaceholder: 'e.g. Speed improvements, dark mode tweaks...',
      categoryLabel: 'Category *',
      contentLabel: 'Details / Feedback Description *',
      contentPlaceholder: 'Provide constructive feedback or issues encountered...',
      anonymousToggle: 'Submit as 100% Anonymous',
      anonymousNote: '🔒 When enabled, your name, ID, and identity are completely excluded',
      submitBtn: 'Submit Feedback',
      statusNew: 'New',
      statusInProgress: 'In Progress',
      statusResolved: 'Resolved',
      adminReplyLabel: 'Admin Response / Action Note',
      adminReplyPlaceholder: 'Enter review response or resolution action...',
      updateStatusBtn: 'Update Status',
    },
    lunchBreak: {
      bannerTitle: '🍱 Lunch Break Time (12:00 - 13:00)',
      bannerDesc: 'It is currently lunch break time (12:00 - 13:00). Enjoy your meal and rest! Spot checks are automatically paused during this hour.',
      badge: '12:00 - 13:00',
    },
    holiday: {
      title: 'Company Holiday Calendar',
      subtitle: 'Official national holidays and annual company holiday schedules',
      openBtn: 'Holidays',
      modalTitle: 'Annual Holiday Calendar 2026',
      modalSubtitle: 'Review national and company holidays to plan work schedules and leave requests in advance',
      upcomingTitle: 'Upcoming Holidays',
      upcomingEmpty: 'No holidays in the next 60 days',
      policyDocTitle: '📄 Official Company Holiday Announcement',
      policyDocSubtitle: 'Attached and certified by Human Resources & Admin',
      viewDocBtn: 'View Announcement',
      downloadDocBtn: 'Download Document',
      daysLeftText: '{days} days away',
      todayText: 'Holiday Today! 🎉',
      officialBadge: 'Official',
      companyBadge: 'Company',
      addHolidayBtn: 'Add Custom Holiday',
      uploadPolicyBtn: 'Attach Holiday Policy',
    },
    audit: {
      tabTitle: 'Audit Trail',
      pageTitle: 'Administrator Audit Trail & Activity Logs',
      pageSubtitle: 'Transparently track and inspect all administrator and supervisor actions across the platform',
      searchPlaceholder: 'Search by admin name, employee ID, or action details...',
      filterAllActions: 'All Activity Types',
      colTimestamp: 'Timestamp',
      colAdmin: 'Actor / Admin',
      colAction: 'Activity / Command',
      colTarget: 'Target',
      colDetails: 'Action Details',
      emptyText: 'No audit records match the selected filters',
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
