/* eslint no-console: 0, no-unused-vars: 0, no-shadow: 0, new-cap: 0*/
/* eslint-env node, es6 */

// https://github.com/SAP-samples/hana-hdbext-promisfied-example

const util = require('util');
module.exports = class {
	constructor(client) {
		this.client = client;
		this.client.promisePrepare = util.promisify(this.client.prepare);
	}

	preparePromisified(query) {
		return this.client.promisePrepare(query);
	}

	statementExecPromisified(statement, parameters) {
		statement.promiseExec = util.promisify(statement.exec);
		return statement.promiseExec(parameters);
	}

	execSQL(sql) {
		return new Promise((resolve, reject) => {
			this.preparePromisified(sql)
				.then(statement => {
					this.statementExecPromisified(statement, [])
						.then(results => {
							resolve(results);
						})
						.catch(err => {
							reject(err);
						});
				})
				.catch(err => {
					reject(err);
				});
		});
	}

	loadProcedurePromisified(hdbext, schema, procedure) {
		hdbext.promiseLoadProcedure = util.promisify(hdbext.loadProcedure);
		return hdbext.promiseLoadProcedure(this.client, schema, procedure);
	}

	callProcedurePromisified(storedProc, inputParams) {
		return new Promise((resolve, reject) => {
			storedProc(inputParams, (error, oVariables, ...aTables) => {
				if (error) {
					reject(error);
				} else {
					resolve({
						variables: oVariables,
						tables: aTables,
					});
				}
			});
		});
	}
};