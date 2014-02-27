//Include config values
var CFG = require('./config.js');

var DatabaseLogger = require('./DatabaseLogger.js');

var log = new DatabaseLogger(CFG);

var messages = [

{
	from: {
		userID: 123
	},
	date: new Date(),
	text: 'Hello world 1!'
},
{
	from: {
		userID: 123
	},
	date: new Date(),
	text: 'Hello world 2!'
},
{
	from: {
		userID: 123
	},
	date: new Date(),
	text: 'Hello world 3!'
},
{
	from: {
		userID: 123
	},
	date: new Date(),
	text: 'Hello world 4!'
}

]


log.logMessages(messages);
