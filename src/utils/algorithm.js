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
	calculatePetrolTax,
	calculateElectricTax,
};
