const REMINDER_DAYS_BEFORE_EXPIRY = 15;

const calculateDaysUntilExpiry = (taxExpireDate, referenceDate = new Date()) => {
	const expire = new Date(taxExpireDate);
	const now = new Date(referenceDate);
	const diffInMs = expire.getTime() - now.getTime();
	return Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
};

const startOfDay = (date = new Date()) => {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	return d;
};

const endOfDay = (date = new Date()) => {
	const d = new Date(date);
	d.setHours(23, 59, 59, 999);
	return d;
};

/**
 * Returns whether a bluebook is eligible for the 15-day expiry reminder email.
 */
const evaluateExpiryReminderEligibility = (bluebook, options = {}) => {
	const reminderDays = options.reminderDays || REMINDER_DAYS_BEFORE_EXPIRY;

	if (!bluebook?.sendExpiryReminder) {
		return { eligible: false, reason: 'reminder_disabled' };
	}

	if (bluebook.status !== 'verified') {
		return { eligible: false, reason: 'not_verified' };
	}

	if (!bluebook.taxExpireDate) {
		return { eligible: false, reason: 'no_expiry_date' };
	}

	const daysLeft = calculateDaysUntilExpiry(bluebook.taxExpireDate);

	if (daysLeft <= 0) {
		return { eligible: false, reason: 'already_expired', daysLeft };
	}

	if (daysLeft > reminderDays) {
		return { eligible: false, reason: 'outside_reminder_window', daysLeft };
	}

	const currentExpiry = new Date(bluebook.taxExpireDate).getTime();
	const lastReminderExpiry = bluebook.lastReminderSentForExpiry
		? new Date(bluebook.lastReminderSentForExpiry).getTime()
		: null;

	if (lastReminderExpiry !== null && lastReminderExpiry === currentExpiry) {
		return { eligible: false, reason: 'already_sent_for_cycle', daysLeft };
	}

	return { eligible: true, daysLeft, reason: 'eligible' };
};

/**
 * MongoDB filter for bluebooks that may need a reminder (refined in application code).
 */
const buildExpiryReminderCandidateFilter = (options = {}) => {
	const reminderDays = options.reminderDays || REMINDER_DAYS_BEFORE_EXPIRY;
	const now = startOfDay();
	const windowEnd = endOfDay(new Date(now));
	windowEnd.setDate(windowEnd.getDate() + reminderDays);

	return {
		status: 'verified',
		sendExpiryReminder: true,
		taxExpireDate: {
			$gte: now,
			$lte: windowEnd,
		},
	};
};

/**
 * Validates whether the associated user can receive reminder emails.
 */
const canUserReceiveReminderEmail = (user) => {
	if (!user?.email) {
		return { canSend: false, reason: 'missing_email' };
	}

	if (!user.emailVerified) {
		return { canSend: false, reason: 'email_not_verified' };
	}

	if (user.status !== 'active') {
		return { canSend: false, reason: 'user_not_active' };
	}

	return { canSend: true, reason: 'ok' };
};

/**
 * Resolves cron schedule for daily expiry reminder emails from .env.
 *
 * Standard cron syntax (5 fields):
 *   minute hour day-of-month month day-of-week
 *
 * Examples:
 *   0 10 * * *   -> every day at 10:00 AM
 *   30 9 * * *   -> every day at 9:30 AM
 *
 * Note: Linux crontab also adds a 6th field for command path
 * (e.g. 0 10 * * * /path/to/command). In this app the job is
 * built-in, so only the 5-field schedule goes in .env.
 */
const resolveExpiryReminderCronSchedule = () => {
	const timezone = process.env.CRON_TIMEZONE || 'Asia/Kathmandu';
	const schedule = (process.env.CRON_REMINDER_SCHEDULE || '0 10 * * *').trim();

	if (!schedule) {
		throw new Error('CRON_REMINDER_SCHEDULE is empty');
	}

	const fields = schedule.split(/\s+/);
	if (fields.length !== 5) {
		throw new Error(
			'CRON_REMINDER_SCHEDULE must use 5 fields: minute hour day-of-month month day-of-week'
		);
	}

	return { schedule, timezone };
};

const calculatePetrolTax = (bluebookData) => {
	const taxExpireDate = new Date(bluebookData.taxExpireDate);
	const now = new Date();
	const diffInMs = taxExpireDate.getTime() - now.getTime();
	const daysLeft = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

	let baseTax = 0;
	let renewalCharge = 0;
	let fineAmount = 0;
	let oldVehicleTax = 0;

	if (bluebookData.vehicleType === "Motorcycle") {
		renewalCharge = 300;
		if (bluebookData.vehicleEngineCC <= 125) {
			baseTax = 3000;
		} else if (bluebookData.vehicleEngineCC <= 150) {
			baseTax = 5000;
		} else if (bluebookData.vehicleEngineCC <= 225) {
			baseTax = 6500;
		} else if (bluebookData.vehicleEngineCC <= 400) {
			baseTax = 12000;
		} else if (bluebookData.vehicleEngineCC <= 650) {
			baseTax = 25000;
		} else {
			baseTax = 3600;
		}
	} else if (bluebookData.vehicleType === "Car") {
		renewalCharge = 500;
		if (bluebookData.vehicleEngineCC <= 1000) {
			baseTax = 22000;
		} else if (bluebookData.vehicleEngineCC <= 1500) {
			baseTax = 25000;
		} else if (bluebookData.vehicleEngineCC <= 2000) {
			baseTax = 27000;
		} else if (bluebookData.vehicleEngineCC <= 2500) {
			baseTax = 37000;
		} else if (bluebookData.vehicleEngineCC <= 3000) {
			baseTax = 50000;
		} else if (bluebookData.vehicleEngineCC <= 3500) {
			baseTax = 65000;
		} else {
			baseTax = 70000;
		}
	}

	if (daysLeft < 1) {
		if (daysLeft <= -365) {
			fineAmount = 0.2 * baseTax;
		} else if (daysLeft <= -45) {
			fineAmount = 0.1 * baseTax;
		} else if (daysLeft <= -1) {
			fineAmount = 0.05 * baseTax;
		}
	}

	const today = new Date();
	const registrationDate = new Date(bluebookData.VehicleRegistrationDate);
	const vehicleAgeInYears = today.getFullYear() - registrationDate.getFullYear();

	if (vehicleAgeInYears >= 15) {
		oldVehicleTax = 0.1 * (baseTax + renewalCharge + fineAmount);
	}

	const totalTaxAmount = baseTax + renewalCharge + fineAmount + oldVehicleTax;

	return {
		baseTax,
		renewalCharge,
		fineAmount,
		oldVehicleTax,
		totalTaxAmount,
		daysLeft,
	};
};

const calculateElectricTax = (electricBluebookData) => {
	const taxExpireDate = new Date(electricBluebookData.taxExpireDate);
	const now = new Date();
	const diffInMs = taxExpireDate.getTime() - now.getTime();
	const daysLeft = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

	let baseTax = 0;
	let renewalCharge = 0;
	let fineAmount = 0;
	let oldVehicleTax = 0;

	const vehicleType = String(electricBluebookData.vehicleType || "").toLowerCase();
	const batteryCapacity = Number(electricBluebookData.vehicleBatteryCapacity || 0);

	if (vehicleType === "motorcycle" || vehicleType === "mc") {
		renewalCharge = 300;

		if (batteryCapacity <= 50) {
			baseTax = 1000;
		} else if (batteryCapacity <= 350) {
			baseTax = 1500;
		} else if (batteryCapacity <= 1000) {
			baseTax = 2000;
		} else if (batteryCapacity <= 1500) {
			baseTax = 2500;
		} else {
			baseTax = 3000;
		}
	} else if (vehicleType === "car") {
		renewalCharge = 500;

		if (batteryCapacity <= 10) {
			baseTax = 5000;
		} else if (batteryCapacity <= 50) {
			baseTax = 5000;
		} else if (batteryCapacity <= 125) {
			baseTax = 15000;
		} else if (batteryCapacity <= 200) {
			baseTax = 20000;
		} else {
			baseTax = 30000;
		}
	} else {
		renewalCharge = 300;

		if (batteryCapacity <= 50) {
			baseTax = 1000;
		} else if (batteryCapacity <= 350) {
			baseTax = 1500;
		} else if (batteryCapacity <= 1000) {
			baseTax = 2000;
		} else if (batteryCapacity <= 1500) {
			baseTax = 2500;
		} else {
			baseTax = 3000;
		}
	}

	if (daysLeft < 1) {
		if (daysLeft <= -365) {
			fineAmount = 0.2 * baseTax;
		} else if (daysLeft <= -45) {
			fineAmount = 0.1 * baseTax;
		} else if (daysLeft <= -1) {
			fineAmount = 0.05 * baseTax;
		}
	}

	const today = new Date();
	const registrationDate = new Date(electricBluebookData.vehicleRegistrationDate);
	const vehicleAgeInYears = today.getFullYear() - registrationDate.getFullYear();

	if (vehicleAgeInYears >= 15) {
		oldVehicleTax = 0.1 * (baseTax + renewalCharge + fineAmount);
	}

	const totalTaxAmount = baseTax + renewalCharge + fineAmount + oldVehicleTax;

	return {
		baseTax,
		renewalCharge,
		fineAmount,
		oldVehicleTax,
		totalTaxAmount,
		daysLeft,
	};
};

module.exports = {
	REMINDER_DAYS_BEFORE_EXPIRY,
	calculateDaysUntilExpiry,
	startOfDay,
	endOfDay,
	evaluateExpiryReminderEligibility,
	buildExpiryReminderCandidateFilter,
	canUserReceiveReminderEmail,
	resolveExpiryReminderCronSchedule,
	calculatePetrolTax,
	calculateElectricTax,
};
