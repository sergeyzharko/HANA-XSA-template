const RuleBuilderErrorCodes = Object.freeze({
	EmptyAdvancedWizard: 'EmptyAdvancedWizard',
	EmptyColumn: 'EmptyColumn',
	EmptyCondition: 'EmptyCondition',
	EmptyOutput: 'EmptyOutput',
	EmptyValue: 'EmptyValue',
	MultipleComplexWizards: 'MultipleComplexWizards',
	UnknownComplexWizard: 'UnknownComplexWizard',
	UnknownCaptureGroup: 'UnknownCaptureGroup',
	UnconfiguredColumn: 'UnconfiguredColumn',
});

class RequestError extends Error {
	constructor(message, statusCode, description) {
		super();
		Error.captureStackTrace(this, RequestError);

		this.name = 'RequestError';
		this.message = message;
		this.status = statusCode;
		this.description = description;
	}
}

class RuleBuilderError extends Error {
	constructor(errorCode, additionalMessage, ...params) {
		super(...params);
		Error.captureStackTrace(this, RuleBuilderError);
		this.name = 'RuleBuilderError';
		this.errorCode = errorCode;
		this.additionalMessage = additionalMessage;
	}
}

RuleBuilderError.ErrorCodes = RuleBuilderErrorCodes;

module.exports = {
	RequestError,
	RuleBuilderError,
};