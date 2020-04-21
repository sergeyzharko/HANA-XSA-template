const HDBAbstractDAO = require('./HDBAbstractDAO');

module.exports = class extends HDBAbstractDAO {
	constructor(oDBClient) {
		super(oDBClient);
	}

	async execGeneratedQuery(query, params = []) {
		const statement = await this.preparePromisified(query);
		return await this.statementExecPromisified(statement, params);
	}

	async getGrouping(projectId, entity, grouping) {
		const query = `
			SELECT "dqt.grouping::sf_getCondition"(?, ?, ?) as "grouping" FROM DUMMY`;

		const statement = await this.preparePromisified(query);
		const results = await this.statementExecPromisified(statement, [projectId, entity, grouping]);

		return {
			results,
		};
	}

	async query() {
		const query = `select top 10 * from "dqt.db::repo.pt_query"`;
		// const statement = await this.preparePromisified(query);
		// const results = await this.statementExecPromisified(statement, []);
		const results = await this.execGeneratedQuery(query, []);

		return {
			results,
		};
	}
};