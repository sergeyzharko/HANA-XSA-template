const prepareMapping = objectType => require(`../domain/${objectType}`);

class ValidationError extends Error {
	constructor(invalidField, objectType, ...params) {
		super(...params);
		Error.captureStackTrace(this, ValidationError);

		this.name = 'ValidationError';
		this.invalidField = invalidField;
		this.objectType = objectType;
	}
}

const prepareColumnsForUpdate = (mapping, sourceObject, keys) => {
	const columns = [];
	const parameters = [];
	const whereParameters = [];
	const whereColumns = [];
	const allowKeysChanging = Boolean(keys);

	for (const mappingObject of mapping) {
		const propertyName = mappingObject.db;

		const column = `"${propertyName}" = ?`;

		if (!sourceObject.hasOwnProperty(propertyName)) {
			if (mappingObject.isKey && keys[propertyName]) {
				whereColumns.push(column);
				whereParameters.push(keys[propertyName]);
			}
			continue;
		}

		const propertyValue = sourceObject[propertyName];

		if (allowKeysChanging) {
			columns.push(column);
			parameters.push(propertyValue);

			if (mappingObject.isKey && keys[propertyName]) {
				whereColumns.push(column);
				whereParameters.push(keys[propertyName]);
			}
		} else {
			if (mappingObject.isKey) {
				whereColumns.push(column);
				whereParameters.push(propertyValue);
			} else {
				columns.push(column);
				parameters.push(propertyValue);
			}
		}
	}

	return {
		columns: columns.join(', '),
		parameters: parameters.concat(whereParameters),
		whereColumns: whereColumns.join(' AND '),
	};
};

const prepareColumnsForSelect = (mapping, sourceObject) => {
	const whereParameters = [];
	const whereColumns = [];

	for (const mappingObject of mapping) {
		const propertyName = mappingObject.db;

		if (!sourceObject.hasOwnProperty(propertyName)) {
			continue;
		}

		const column = `"${propertyName}" = ?`;
		const propertyValue = sourceObject[propertyName];

		if (mappingObject.isKey) {
			whereColumns.push(column);
			whereParameters.push(propertyValue);
		}
	}

	return {
		whereParameters: whereParameters,
		whereCondition: whereColumns.join(' AND '),
	};
};

const prepareColumnsForInsert = (mapping, sourceObject, sequenceName) => {
	const columns = [];
	const parameters = [];
	const questionMarks = [];

	for (const mappingObject of mapping) {
		const propertyName = mappingObject.db;

		if (!mappingObject.isKey && !mappingObject.isNo && !sourceObject.hasOwnProperty(propertyName)) {
			continue;
		}

		const column = `"${propertyName}"`;
		const propertyValue = sourceObject[propertyName];

		columns.push(column);

		if (mappingObject.isKey && !propertyValue) {
			questionMarks.push(`"${sequenceName}".nextVal`);
			continue;
		}

		if (mappingObject.isNo && !propertyValue) {
			questionMarks.push(`"${mappingObject.sequence}".nextVal`);
			continue;
		}

		parameters.push(propertyValue);
		questionMarks.push('?');
	}

	return {
		columns: columns.join(', '),
		parameters,
		questionMarks: questionMarks.join(', '),
	};
};

const prepareColumnsForInsertBatch = (mapping, sourceObjects, sequenceName) => {
	const columns = [];
	const parameters = [];
	const keySequence = [];

	sourceObjects.forEach((sourceObject, index) => {
		const res = prepareColumnsForInsert(mapping, sourceObject, sequenceName);
		parameters.push(res.parameters);

		if (index === 0) {
			columns.push(res.columns);
			keySequence.push(res.questionMarks);
		}
	});

	return {
		columns: columns.join(', '),
		parameters,
		questionMarks: keySequence,
	};
};

const prepareColumnsForUpdateBatch = (mapping, sourceObjects) => {
	const columns = [];
	const whereColumns = [];
	const parameters = [];

	sourceObjects.forEach((sourceObject, index) => {
		const result = prepareColumnsForUpdate(mapping, sourceObject);
		parameters.push(result.parameters);

		if (index === 0) {
			columns.push(result.columns);
			whereColumns.push(result.whereColumns);
		}
	});

	return {
		columns,
		parameters,
		whereColumns,
	};
};

const findInvalidField = (sourceObject, mapping, isStrict) => {
	if (Array.isArray(sourceObject)) {
		for (const element of sourceObject) {
			const field = findInvalidField(element, mapping, isStrict);
			if (field) {
				return field;
			}
		}

		return null;
	}

	for (const mappingObject of mapping) {
		if (
			mappingObject.isRequired &&
			(isStrict || sourceObject.hasOwnProperty(mappingObject.db)) &&
			!sourceObject[mappingObject.db]
		) {
			return mappingObject;
		}
	}

	return null;
};

module.exports = {
	prepareSelectStatement: (sObjectType, oSourceObject) => {
		const oMapping = prepareMapping(sObjectType);
		const oData = prepareColumnsForSelect(oMapping.mapping, oSourceObject);
		let sStatement = `SELECT * FROM "${oMapping.table}"`;
		if (oData.whereCondition.length) {
			sStatement += ` WHERE ${oData.whereCondition}`;
		}
		return {
			statement: sStatement,
			parameters: oData.whereParameters,
		};
	},

	prepareUpdateStatement: (sObjectType, oSourceObject) => {
		const oMapping = prepareMapping(sObjectType);

		const oField = findInvalidField(oSourceObject, oMapping.mapping, false);
		if (oField) {
			throw new ValidationError(oField.be, sObjectType);
		}

		const fPrepareFunction = Array.isArray(oSourceObject) ? prepareColumnsForUpdateBatch : prepareColumnsForUpdate;
		const oData = fPrepareFunction(oMapping.mapping, oSourceObject);
		let sStatement = `UPDATE "${oMapping.table}" SET ${oData.columns}`;
		if (oData.whereColumns.length) {
			sStatement += ` WHERE ${oData.whereColumns}`;
		}
		return {
			statement: sStatement,
			parameters: oData.parameters,
		};
	},

	prepareUpdateCurrentStatement: (objectType, sourceObject, keys) => {
		const mapping = prepareMapping(objectType);

		const field = findInvalidField(sourceObject, mapping.mapping, false);
		if (field) {
			throw new ValidationError(field.be, objectType);
		}

		const data = prepareColumnsForUpdate(mapping.mapping, sourceObject, keys);
		return {
			statement: `UPDATE "${mapping.table}" SET ${data.columns} WHERE ${data.whereColumns}`,
			parameters: data.parameters,
		};
	},

	prepareInsertStatement: (objectType, sourceObject) => {
		const mapping = prepareMapping(objectType);

		const field = findInvalidField(sourceObject, mapping.mapping, true);
		if (field) {
			throw new ValidationError(field.be, objectType);
		}

		const prepareFunction = Array.isArray(sourceObject) ? prepareColumnsForInsertBatch : prepareColumnsForInsert;
		const data = prepareFunction(mapping.mapping, sourceObject, mapping.sequence);
		const statement = `INSERT INTO "${mapping.table}" (${data.columns}) VALUES (${data.questionMarks})`;
		return {
			statement: statement,
			parameters: data.parameters,
		};
	},

	prepareDeleteStatement: (sObjectType, oSourceObject) => {
		const oMapping = prepareMapping(sObjectType);
		const oData = prepareColumnsForSelect(oMapping.mapping, oSourceObject);
		let sStatement = `DELETE FROM "${oMapping.table}"`;
		if (oData.whereCondition.length) {
			sStatement += ` WHERE ${oData.whereCondition}`;
		}
		return {
			statement: sStatement,
			parameters: oData.whereParameters,
		};
	},
};