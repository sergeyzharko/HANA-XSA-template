const { promisify } = require('util');
const hdbext = require('@sap/hdbext');
const xsenv = require('@sap/xsenv');
const createConnection = promisify(hdbext.createConnection);
const hanaOptions = xsenv.getServices({
	hana: {
		tag: 'hana',
	},
});

module.exports = (
	hanaOpts = {},
	useDefaultConfig = true,
) => createConnection(useDefaultConfig ? { ...hanaOptions.hana, ...hanaOpts } : hanaOpts);