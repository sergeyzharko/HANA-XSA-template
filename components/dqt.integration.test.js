const { describe } = require('mocha');
const { expect } = require('chai');
const request = require('supertest');
const app = require('../app');

const creds = JSON.parse(process.env.DQT_INTEGRATION_TEST_CRED);
let auth; // authorization HEADER

/**
* retreive query JSON by ID from /dqt/query
* @param {Request} request request(app)
* @param {String} auth authorization HEADER
* @param {String} id query ID
* @return {Object}
*/
const getQueryById = (request, auth, id) => new Promise((resolve, reject) =>
	request
		.get(`/dqt/query/${id}`)
		.query({
			type: 'sql',
		})
		.set('Authorization', auth)
		.expect(200)
		.end((err, res) => {
			if (err) reject(err);
			const { json } = res.body;
			resolve(json);
		}),
);

/**
 * run query in dqt query runner
 * @param {Request} request request(app)
 * @param {String} projectId projectId
 * @param {String} auth authorization HEADER
 * @param {Object} qJson dqt query JSON
 * @return {Object}
 */
const runQuery = (request, projectId, auth, qJson) => new Promise((resolve, reject) =>
	request
		.post('/dqt/query/run')
		.query({
			projectId,
		})
		.send(qJson)
		.set('Authorization', auth)
		.set('Content-Type', 'application/json')
		.expect(200)
		.end((err, res) => {
			if (err) reject(err);
			resolve(res.body);
		}),
);

/**
 * run query export wrapper
 * @param {Request} request request(app)
 * @param {String} projectId projectId
 * @param {String} auth authorization HEADER
 * @param {Object} data query result set
 * @param {String} type query export type ['lowLevels', 'allLevels']. Default > 'lowLevels'
 * @return {Object}
 */
const runExport = (request, projectId, auth, data, type = 'lowLevels') => new Promise((resolve, reject) =>
	request
		.post('/dqt/exporter')
		.query({
			projectId,
			fileFormat: 'xlsx',
			reportType: type,
		})
		.send(data)
		.set('Authorization', auth)
		.set('Content-Type', 'application/json')
		.expect(200)
		.end((err, res) => {
			if (err) reject(err);
			resolve(res);
		}),
);

describe('DQT Monthly integration tests', function() {
	const cvName = 'DQT Monthly';
	const projectId = 'GMDA';
	const entityId = '"SXGMDA"."gmda.monthly.cv::cv_ana_monthly"';
	const searchTag = 'AutomationTest';
	// eslint-disable-next-line no-invalid-this
	this.timeout(60000); // set a 1 min timeout for this suite
	let monthlyQueries = []; // array of queries to extract with query type 'AutomationTest
	let queries = []; // extracted JSON queries
	const results = []; // executed queries results
	const b64xlsResults = []; // Array of base64 exported XLSX files
	const fileBufferArr = []; // Array of XLSX file buffers

	// get JWT authorization token
	before(done => {
		if (!auth) {
			request(app)
				.post('/auth/sign-in')
				.send(creds)
				.end((err, res) => {
					if (err) return done(err);
					const { authorization } = res.header;
					if (!authorization) return done('JWT token not found');
					auth = authorization;
					done();
				});
		} else done();
	});

	it(`should retrive ${cvName} default query`, async() => {
		const queryParameters = {
			projectId,
			entityId,
		};
		const { body: data } = await request(app)
			.get('/query')
			.query(queryParameters)
			.set('Authorization', auth)
			.expect(200);

		// expect(data).to.have.property('results');
		expect(data).to.be.an('array');
	});

	// it(`should retrive ${cvName} attributes`, async() => {
	// 	const queryParameters = {
	// 		projectId,
	// 		entityId,
	// 	};
	// 	const { body: data } = await request(app)
	// 		.get('/dqt/attribute')
	// 		.query(queryParameters)
	// 		.set('Authorization', auth)
	// 		.expect(200);

	// 	expect(data).to.be.an('array').that.is.not.empty;
	// });

	it(`should retreive ${cvName} CV queries with type ${searchTag}`, async() => {
		const payload = {
			projectId,
			entityId,
			search: searchTag,
		};

		const { body: data } = await request(app)
			.get('/user')
			.query(payload)
			.set('Authorization', auth)
			.expect(200);

		expect(data).to.have.property('token');
		// expect(data).to.have.property('metadata');
		// expect(data.results).to.be.an('array');
		// expect(data.results.length).to.be.gte(1);
		// add queries to run
		// monthlyQueries = monthlyQueries.concat(data.results);
	});

	// it('should retrevie dqt queries by ID', done =>
	// 	monthlyQueries.forEach(async({ id, label }, i, arr) => {
	// 		console.log(`====== retreive query ${i+1} label '${label}' with id '${id}'`);
	// 		try {
	// 			const query = await getQueryById(request(app), auth, id);
	// 			queries.push(query);
	// 		} catch (error) {
	// 			done(error);
	// 		}
	// 		if (queries.length === arr.length) done();
	// 	}),
	// );

	// it(`should run queries in ${cvName}`, done => {
	// 	console.log('\nTotal queries to run: ', queries.length);
	// 	// WA
	// 	queries = queries.map(query => {
	// 		delete query.filters;
	// 		return query;
	// 	});
	// 	queries.forEach(async(query, i, arr) => {
	// 		const { label } = monthlyQueries[i];
	// 		console.log(`====== run query ${i+1} with label "${label}"`);
	// 		try {
	// 			const result = await runQuery(request(app), projectId, auth, query);
	// 			results.push(result);
	// 		} catch (error) {
	// 			done(error);
	// 		}
	// 		if (results.length === arr.length) done();
	// 	});
	// });

	// it('should exports all retrived queries as XLSX base64 files to b64xlsResults array', async() =>
	// 	new Promise((resolve, reject) =>
	// 		queries.forEach(async query => {
	// 			try {
	// 				const { text: b64 } = await runExport(request(app), projectId, auth, query, 'lowLevels');
	// 				b64xlsResults.push(b64);
	// 				if (b64xlsResults.length === queries.length) resolve();
	// 			} catch (error) {
	// 				reject(error);
	// 			}
	// 		}),
	// 	),
	// );

	// it('should extract all XLSX files from b64xlsResults array to fileBufferArr', async()=>
	// 	b64xlsResults.forEach( b64 => {
	// 		const buff = new Buffer.from(b64, 'base64');
	// 		fileBufferArr.push(buff);
	// 	}),
	// );

	// // eslint-disable-next-line max-len
	// it('should open XLSX files from fileBufferArr. Each Workbook should has a Worksheet with not empty name and more then 5 not empty rows', async()=>{
	// 	fileBufferArr.forEach( fileBuffer => {
	// 		// load XLSX from fileBuffer
	// 		const workbook = new Excel.Workbook();
	// 		workbook.xlsx.load(fileBuffer)
	// 			.then(() =>
	// 				workbook.eachSheet(worksheet => {
	// 					expect(worksheet.name).not.empty;
	// 					expect(worksheet.rowCount).to.be.gte(5);
	// 					console.log(`Worksheet '${worksheet.name}' has ${worksheet.rowCount} rows`);
	// 				}),
	// 			);
	// 	});
	// });
});