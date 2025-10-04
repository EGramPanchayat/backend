
import mongoose from 'mongoose';

const villageDataSchema = new mongoose.Schema({
	areaHectare: {
		type: Number,
		required: true
	},
	wardNo: {
		type: Number,
		required: true
	},
	totalPopulation: {
		type: Number,
		required: true
	},
	familyNumber: {
		type: Number,
		required: true
	},
	villageInfo: {
		type: String,
		required: true
		// Can be in Marathi or any language
	}
,
	address: {
		type: String,
		required: true
	},
	pincode: {
		type: String,
		required: true
	},
	district: {
		type: String,
		required: true
	},
	taluka: {
		type: String,
		required: true
	},
	contact: {
		type: String,
		required: true
	}
});

const VillageData = mongoose.model('VillageData', villageDataSchema);
export default VillageData;
