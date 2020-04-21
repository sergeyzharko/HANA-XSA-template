const util = require('util');

class I18n {
	constructor() {
		if (I18n._instance) {
			return I18n._instance;
		}

		this.messages = {
			en: require('./locales/en.json'),
		};

		I18n._instance = this;
	}

	translate(messageId, locale, params = []) {
		if (!this.messages[locale]) {
			throw new Error(`Unknown locale: "${locale}".`);
		}

		if (!this.messages[locale][messageId]) {
			throw new Error(`Unknown message id: "${messageId}".`);
		}

		return util.format(this.messages[locale][messageId], ...params);
	}
}

module.exports = function i18nMiddleware(defaultLocale = 'en') {
	return function(req, _, next) {
		req.i18n = new I18n();
		req.locale = req.locale || defaultLocale;
		next();
	};
};