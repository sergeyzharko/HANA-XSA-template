const passport = require('passport');

const secure = passport.authenticate('JWT', {
	session: false,
});

module.exports = secure;