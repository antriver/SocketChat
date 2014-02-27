var mysql = require('mysql2');

var DatabaseLogger = function(CFG) {
	this.CFG = CFG;
};

DatabaseLogger.prototype.connect = function() {

	this.DB = DB = mysql.createConnection({
		host: this.CFG.DB_SERVER,
		user: this.CFG.DB_USER,
		password: this.CFG.DB_PASS,
		database: this.CFG.DB_NAME
	});
};

DatabaseLogger.prototype.disconnect = function() {

	this.DB.end();
};

DatabaseLogger.prototype.logMessages = function(roomName, messages, callback) {
	console.log('DatabaseLogger.prototype.logMessages', messages);
	var messageCount = messages.length;
	if (messageCount < 1) {
		return;
	}
	var i = 0;

	this.connect();
	var self = this;

	function logNextMessage() {

		if (i >= messageCount) {
			self.disconnect();
			if (callback) {
				callback();
			}
			return;
		}

		self.logMessage(roomName, messages[i], function(){
			++i;
			logNextMessage();
		});

	}

	logNextMessage();
};



DatabaseLogger.prototype.logMessage = function(roomName, message, callback) {

	var query = 'INSERT INTO chat_messages (room, userID, date, message) VALUES(?, ?, ?, ?)';

	var datetime = message.date.getUTCFullYear() + '-' +
		('00' + (message.date.getUTCMonth()+1)).slice(-2) + '-' +
		('00' + message.date.getUTCDate()).slice(-2) + ' ' +
		('00' + message.date.getUTCHours()).slice(-2) + ':' +
		('00' + message.date.getUTCMinutes()).slice(-2) + ':' +
		('00' + message.date.getUTCSeconds()).slice(-2);

	var values = [
		roomName,
		message.from.userID,
		datetime,
		message.text
	];

	this.DB.execute(query, values, function(err, rows) {
		console.log(err, rows);

		if (callback) {
			callback();
		}
	});

};

module.exports = DatabaseLogger;
