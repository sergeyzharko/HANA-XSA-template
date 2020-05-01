const util = require('util');
const dbUtil = require('./utils/dbUtil');

class HDBAbstractDAO {
	constructor(oDBClient) {
		this.client = oDBClient;
		this.client.promisePrepare = util.promisify(this.client.prepare);
	}

	preparePromisified(query) {
		return this.client.promisePrepare(query);
	}

	statementExecPromisified(statement, parameters) {
		statement.promiseExec = util.promisify(statement.exec);
		return statement.promiseExec(parameters);
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
						tables: aTables,
						variables: oVariables,
					});
				}
			});
		});
	}

	async update(inputData, params = {}) {
		const {
			timeStamp,
			userName,
		} = params;

		if (timeStamp) {
			for (const entity of Array.isArray(inputData) ? inputData : [inputData]) {
				entity[this.schema.modifiedTime] = timeStamp;
				if (this.schema.deployedTime) {
					entity[this.schema.deployedTime] = timeStamp;
				}
			}
		}

		if (userName) {
			for (const entity of Array.isArray(inputData) ? inputData : [inputData]) {
				entity[this.schema.modifiedBy] = userName;
				if (this.schema.deployedBy) {
					entity[this.schema.deployedBy] = userName;
				}
			}
		}

		const statementInfo = dbUtil.prepareUpdateStatement(this.entityName, inputData);
		const prepareStatement = await this.preparePromisified(statementInfo.statement);
		return await this.statementExecPromisified(prepareStatement, statementInfo.parameters);
	}

	async updateById(entity, keys, params = {}) {
		const {
			timeStamp,
			userName,
		} = params;

		if (timeStamp) {
			entity[this.schema.modifiedTime] = timeStamp;
			if (this.schema.deployedTime) {
				entity[this.schema.deployedTime] = timeStamp;
			}
		}

		if (userName) {
			entity[this.schema.modifiedBy] = userName;
			if (this.schema.deployedBy) {
				entity[this.schema.deployedBy] = userName;
			}
		}

		const statementInfo = dbUtil.prepareUpdateCurrentStatement(this.entityName, entity, keys);
		const prepareStatement = await this.preparePromisified(statementInfo.statement);
		return await this.statementExecPromisified(prepareStatement, statementInfo.parameters);
	}

	async create(inputData, params = {}) {
		const {
			timeStamp,
			userName,
		} = params;

		if (timeStamp) {
			for (const entity of Array.isArray(inputData) ? inputData : [inputData]) {
				entity[this.schema.createdTime] = timeStamp;
				entity[this.schema.modifiedTime] = timeStamp;
				if (this.schema.deployedTime) {
					entity[this.schema.deployedTime] = timeStamp;
				}
			}
		}

		if (userName) {
			for (const entity of Array.isArray(inputData) ? inputData : [inputData]) {
				entity[this.schema.createdBy] = userName;
				entity[this.schema.modifiedBy] = userName;
				if (this.schema.deployedBy) {
					entity[this.schema.deployedBy] = userName;
				}
			}
		}

		const statementInfo = dbUtil.prepareInsertStatement(this.entityName, inputData);
		const prepareStatement = await this.preparePromisified(statementInfo.statement);
		return await this.statementExecPromisified(prepareStatement, statementInfo.parameters);
	}

	async delete(oEntity) {
		const oStatementInfo = dbUtil.prepareDeleteStatement(this.entityName, oEntity);
		const oPrepareStatement = await this.preparePromisified(oStatementInfo.statement);
		return await this.statementExecPromisified(oPrepareStatement, oStatementInfo.parameters);
	}

	async find(oEntity) {
		const oStatementInfo = dbUtil.prepareSelectStatement(this.entityName, oEntity);
		const oPrepareStatement = await this.preparePromisified(oStatementInfo.statement);
		return await this.statementExecPromisified(oPrepareStatement, oStatementInfo.parameters);
	}

	async disconnectDB() {
		await new Promise((resolve, reject) => {
			this.client.disconnect(err => err && reject(err));
		});
	}

	async getSessionData() {
		const query =
			`SELECT
				CURRENT_SCHEMA,
				SESSION_USER,
				SESSION_CONTEXT('APPLICATIONUSER'),
				SESSION_CONTEXT('XS_APPLICATIONUSER')
			FROM DUMMY`;

		const prepareStatement = await this.preparePromisified(query);
		return await this.statementExecPromisified(prepareStatement);
	}
}

// HDBAbstractDAO.prototype.update = async(oEntity) => {
// 	var oStatementInfo = dbUtil.prepareUpdateStatement(this.entityName, oEntity);
// 	const oPrepareStatement = await this.preparePromisified(oStatementInfo.statement);
// 	return await this.statementExecPromisified(oPrepareStatement, oStatementInfo.parameters);
// };

// HDBAbstractDAO.prototype.create = async(oEntity) => {
// 	var oStatementInfo = dbUtil.prepareInsertStatement(this.entityName, oEntity);
// 	const oPrepareStatement = await this.preparePromisified(oStatementInfo.statement);
// 	return await this.statementExecPromisified(oPrepareStatement, oStatementInfo.parameters);
// };

module.exports = HDBAbstractDAO;