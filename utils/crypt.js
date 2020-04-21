const crypto = require('crypto');
const logger = require('../components/logger');

const ALGORITHM = 'aes-256-ctr';
const IV_LENGTH = 16;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'M5nYCEjml4VMDgNQTrWTFtWGgtX3iCJS'; // Must be 256 bits (32 characters)
if (!process.env.ENCRYPTION_KEY) {
	logger.error(`No ENCRYPTION_KEY in environment variables! Used default ENCRYPTION_KEY`);
}

module.exports = {
	encryptFunc: text => {
		const iv = crypto.randomBytes(IV_LENGTH);
		const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
		const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
		return iv.toString('hex') + ':' + encrypted.toString('hex');
	},
	decryptFunc: text => {
		const textParts = text.split(':');
		const iv = Buffer.from(textParts.shift(), 'hex');
		const encryptedText = Buffer.from(textParts.join(':'), 'hex');
		const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
		let decrypted = decipher.update(encryptedText);

		decrypted = Buffer.concat([decrypted, decipher.final()]);

		return decrypted.toString();
	},
};