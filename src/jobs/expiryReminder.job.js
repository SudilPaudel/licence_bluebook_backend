const cron = require('node-cron');
const BluebookModel = require('../modules/Bluebook/bluebook.model');
const ElectricBluebookModel = require('../modules/ElectricBluebook/electricBluebook.model');
const mailSvc = require('../services/mail.service');
const {
  evaluateExpiryReminderEligibility,
  buildExpiryReminderCandidateFilter,
  canUserReceiveReminderEmail,
  resolveExpiryReminderCronSchedule,
  REMINDER_DAYS_BEFORE_EXPIRY,
} = require('../utils/algorithm');
const { buildBluebookExpiryReminderEmail } = require('../utils/emailTemplates');

function isEmailSendingEnabled() {
  if (process.env.DISABLE_EMAIL === 'true') {
    return false;
  }

  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD
  );
}

function getRenewalUrl(bluebookId, vehicleCategory) {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  if (vehicleCategory === 'electric') {
    return `${frontendUrl}/electric-payment/${bluebookId}`;
  }
  return `${frontendUrl}/payment/${bluebookId}`;
}

async function processBluebookReminders(Model, vehicleCategory) {
  const filter = buildExpiryReminderCandidateFilter();
  const candidates = await Model.find(filter).populate('createdBy', 'name email emailVerified status');

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const bluebook of candidates) {
    const eligibility = evaluateExpiryReminderEligibility(bluebook);
    if (!eligibility.eligible) {
      skipped += 1;
      continue;
    }

    const user = bluebook.createdBy;
    const userCheck = canUserReceiveReminderEmail(user);
    if (!userCheck.canSend) {
      skipped += 1;
      continue;
    }

    const subject = `Official Reminder: Vehicle Tax Expiring in ${eligibility.daysLeft} Day(s) - ${bluebook.vehicleRegNo}`;
    const html = buildBluebookExpiryReminderEmail({
      userName: user.name,
      vehicleRegNo: bluebook.vehicleRegNo,
      vehicleOwnerName: bluebook.vehicleOwnerName,
      vehicleType: bluebook.vehicleType,
      vehicleModel: bluebook.vehicleModel,
      taxExpireDate: bluebook.taxExpireDate,
      daysLeft: eligibility.daysLeft,
      vehicleCategory,
      renewalUrl: getRenewalUrl(bluebook._id, vehicleCategory),
    });

    try {
      await mailSvc.sendEmail(user.email, subject, html);
      await Model.findByIdAndUpdate(bluebook._id, {
        $set: { lastReminderSentForExpiry: bluebook.taxExpireDate },
      });
      sent += 1;
      console.log(`[ExpiryReminder] Sent ${vehicleCategory} reminder to ${user.email} for ${bluebook.vehicleRegNo}`);
    } catch (error) {
      failed += 1;
      console.error(`[ExpiryReminder] Failed for ${bluebook.vehicleRegNo}:`, error.message);
    }
  }

  return { sent, skipped, failed, checked: candidates.length };
}

async function runExpiryReminderJob() {
  if (!isEmailSendingEnabled()) {
    console.log('[ExpiryReminder] Skipped run - email service not configured or DISABLE_EMAIL=true');
    return { petrol: null, electric: null, skipped: true };
  }

  console.log(`[ExpiryReminder] Starting daily reminder job (${REMINDER_DAYS_BEFORE_EXPIRY}-day window)...`);

  const petrolResult = await processBluebookReminders(BluebookModel, 'petrol');
  const electricResult = await processBluebookReminders(ElectricBluebookModel, 'electric');

  console.log('[ExpiryReminder] Completed', { petrol: petrolResult, electric: electricResult });

  return { petrol: petrolResult, electric: electricResult, skipped: false };
}

function startExpiryReminderCron() {
  if (process.env.ENABLE_CRON !== 'true') {
    console.log('[ExpiryReminder] Cron disabled (set ENABLE_CRON=true to enable)');
    return null;
  }

  let cronConfig;
  try {
    cronConfig = resolveExpiryReminderCronSchedule();
  } catch (error) {
    console.error(`[ExpiryReminder] ${error.message}`);
    return null;
  }

  const { schedule, timezone } = cronConfig;

  if (!cron.validate(schedule)) {
    console.error(`[ExpiryReminder] Invalid CRON_REMINDER_SCHEDULE: ${schedule}`);
    return null;
  }

  const task = cron.schedule(
    schedule,
    () => {
      runExpiryReminderJob().catch((error) => {
        console.error('[ExpiryReminder] Cron execution failed:', error);
      });
    },
    { timezone }
  );

  console.log(`[ExpiryReminder] Cron scheduled: "${schedule}" (${timezone}) | ${REMINDER_DAYS_BEFORE_EXPIRY}-day expiry window`);
  return task;
}

module.exports = {
  runExpiryReminderJob,
  startExpiryReminderCron,
};
