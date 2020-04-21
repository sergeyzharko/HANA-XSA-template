const hdbext = require('@sap/hdbext');
const xsenv = require('@sap/xsenv');
const hanaOptions = xsenv.getServices({
	hana: {
		tag: 'hana',
	},
});

module.exports = hdbext.middleware(hanaOptions.hana);