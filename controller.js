const Dao = require('./dao');
const request = require('request-promise-native');
const xsenv = require('@sap/xsenv');
const querystring = require('querystring');
const DBPromisified = require('./DBPromisified');
const hdbext = require('@sap/hdbext');
const logger = require('./components');
const {
	name,
	version,
} = require('./package.json');

const {
	clientid,
	clientsecret,
	url,
} = xsenv.getServices({
	uaa: {
		tag: 'xsuaa',
	},
}).uaa;

const credentials = `${clientid}:${clientsecret}`;
const auth = `Basic ${Buffer.from(credentials).toString('base64')}`;

module.exports = {

	info() {
		return {
			clientid,
			clientsecret,
			url,
			credentials,
			auth,
		};
	},

	async signIn(username, password) {
		// TODO: add i18n module translate without middleware
		if (!username) throw new Error(`Invalid username: ${username}`);
		if (!password) throw new Error(`invalid password: ${password}`);
		if (!clientid) throw new Error(`invalid clientid: ${clientid}`);
		if (!clientsecret) throw new Error(`invalid clientsecret: ${clientsecret}`);
		if (!url) throw new Error(`invalid url: ${url}`);

		const headers = {
			'Authorization': auth,
			'Content-Type': 'application/x-www-form-urlencoded',
			'Cache-Control': 'max-age=0',
		};
		const body = {
			grant_type: 'password',
			username,
			password,
			client_id: clientid,
			client_secret: clientsecret,
		};
		const options = {
			method: 'POST',
			url: `${url}/oauth/token`,
			headers,
			json: true,
			body: querystring.stringify(body),
		};

		return await request(options);
	},

	async refreshToken(refreshToken) {
		if (!refreshToken) throw new Error(`invalid token: ${refreshToken}`);

		const headers = {
			'Authorization': auth,
			'Content-Type': 'application/x-www-form-urlencoded',
			'Cache-Control': 'max-age=0',
		};
		const body = {
			grant_type: 'refresh_token',
			refresh_token: refreshToken,
		};
		const options = {
			method: 'POST',
			url: `${url}/oauth/token`,
			headers,
			json: true,
			body: querystring.stringify(body),
		};

		return request(options);
	},

	// sync
	async add(db, scriptRunId, stepDesc) {
		const dbConnection = new DBPromisified(db);
		const loadProcedure = await dbConnection.loadProcedurePromisified(hdbext, null, 'etl::sp_etl_sql_script_step_add');
		const results = await dbConnection.callProcedurePromisified(loadProcedure, [scriptRunId, stepDesc]);
		return results.variables.SCRIPT_STEP_RUN_ID;
	},

	// async
	async releaseCube(db, assetId, stepRunId, assetName) {
		try {
			const dbConnection = new DBPromisified(db);
			const loadProcedure = await dbConnection.loadProcedurePromisified(hdbext, null, 'etl::sp_release_cube');
			const result = await dbConnection.callProcedurePromisified(loadProcedure, [assetId, stepRunId, assetName]);
			return result.variables;
		} catch (err) {
			await this.addLog(db, stepRunId, err);
			throw err;
		}
	},

	async addLog(db, stepRunId, message) {
		message = JSON.stringify(message);
		logger.error(message);
		const dbConnection = new DBPromisified(db);
		const loadProcedure = await dbConnection.loadProcedurePromisified(hdbext, null, 'etl::sp_etl_step_update');
		await dbConnection.callProcedurePromisified(loadProcedure, [stepRunId, 0, message]);
	},

	getVersion: () => ({
		name,
		version,
	}),

	async query(context) {
		const secondDAO = new Dao(context.oHdbConnection);
		// const statement = await secondDAO.preparePromisified(`select top 10 * from "dqt.db::repo.pt_query"`);
		// const data = await secondDAO.statementExecPromisified(statement);
		const data = await secondDAO.query();
		return data;
	},

};