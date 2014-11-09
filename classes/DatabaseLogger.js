/**
 * Database Logger
 * Writes arbritrary messages (rows) to a MySQL table.
 * Messages are buffered and only written when the buffer reaches
 * a certain length, or after a certain timeout.
 *
 * @author Anthony Kuske <www.anthonykuske.com>
 * @version 2014-03-04 09:39
 */

// Load the required mysql2 module
var mysql = require('mysql2');

/**
 * New DatabaseLogger instance
 * @param object CFG Object containing MySQL connection settings
 */
var DatabaseLogger = function(CFG) {
	this.CFG = CFG;

	// Store messages here for writing periodically
	this.buffer = [];
	this.updateBuffer = [];
	this.startTimer();
	this.connected = false;
};

/**
 * Public method to add a message to the log
 */
DatabaseLogger.prototype.log = function(message) {

	this.buffer.push(message);

	if (this.buffer.length >= 10) {
		this.writeToDB();
	}

};



/**
 * Connect to the database
 * Sets this.DB
 */
DatabaseLogger.prototype.connect = function() {
	if (this.connected) {
		return true;
	}

	this.DB = DB = mysql.createConnection({
		host: this.CFG.DB_SERVER,
		user: this.CFG.DB_USER,
		password: this.CFG.DB_PASS,
		database: this.CFG.DB_NAME
	});

	this.connected = true;
};

/**
 * Disconnect from the database
 * Unsets this.DB
 */
DatabaseLogger.prototype.disconnect = function() {
	if (this.connected) {
		this.DB.end();
	}
	this.connected = false;
};



/**
 * Timer to delay writes to the database
 */
DatabaseLogger.prototype.startTimer = function() {
	this.stopTimer();
	var self = this;
	this.timer = setTimeout(function(){
		//console.log('[Logger] Timer done');
		self.writeToDB();
	}, 10000);
};

DatabaseLogger.prototype.stopTimer = function() {
	clearTimeout(this.timer);
	this.timer = null;
};



/**
 * Write the buffer to the database if necessary
 */
DatabaseLogger.prototype.writeToDB = function() {

	// Stop the timer
	this.stopTimer();

	var self = this;

	// Check if we have anything to write
	//console.log('[Logger] ' + this.buffer.length + ' messages in log buffer');

	//Nothing to write - done
	if (this.buffer.length < 1) {

		// Write any pending updates
		this.connect();
		self.writeUpdates(function(){
			self.disconnect();
		});

		this.startTimer();
		return;
	}

	console.log('[Logger] Writing to DB');

	//Create a new array with the messages to write
	var messages = this.buffer.slice(0);
	//And empty the buffer
	this.buffer = [];

	this.connect();
	this.writeMessages(messages, function(){

		// Write any pending updates
		self.writeUpdates(function(){

			//When finished writing
			self.disconnect();
			self.startTimer();
		});

	});
};


/**
 * Loops through an array of messages and writes to the database
 * Calls callback when finished
 */
DatabaseLogger.prototype.writeMessages = function(messages, callback) {

	var messageCount = messages.length;
	var currentMessage = 0;

	var self = this;

	function writeNextMessage() {

		// If no more messages
		if (currentMessage >= messageCount) {

			if (callback) {
				callback();
			}
			return;
		}

		//Write the message
		self.writeMessage(messages[currentMessage], function(){
			// and then...
			++currentMessage;
			writeNextMessage();
		});

	}

	writeNextMessage();
};


/**
 * Writes a single message to the database
 * Calls callback when done
 */
DatabaseLogger.prototype.writeMessage = function(message, callback) {

	var cols = [];
	var values = [];
	var queryPlaceholders = [];

	for (var col in message) {
		cols.push(col);

		if (message[col] instanceof Date) {
			values.push(this.convertDate(message[col]));
		} else {
			values.push(message[col]);
		}

		queryPlaceholders.push('?');
	}

	var query = 'INSERT INTO ' +  this.CFG.LOG_TABLE + ' (' + cols.join(',') + ') ';
	query += 'VALUES(' + queryPlaceholders.join(',')+ ')';

	//console.log(query);

	this.DB.execute(query, values, function(err, rows) {
		console.log(err, rows);

		if (callback) {
			callback();
		}
	});

};

DatabaseLogger.prototype.convertDate = function(date) {
	return date.getUTCFullYear() + '-' +
	('00' + (date.getUTCMonth()+1)).slice(-2) + '-' +
	('00' + date.getUTCDate()).slice(-2) + ' ' +
	('00' + date.getUTCHours()).slice(-2) + ':' +
	('00' + date.getUTCMinutes()).slice(-2) + ':' +
	('00' + date.getUTCSeconds()).slice(-2);
};

// Queue an update to happen the next time data is written
DatabaseLogger.prototype.update = function(where, set) {
	this.updateBuffer.push({where:where, set:set});
};

DatabaseLogger.prototype.writeUpdates = function(callback) {

	var updateCount = this.updateBuffer.length;
	if (updateCount < 1) {
		if (callback) {
			callback();
		}
		return;
	}

	//Create a new array with the updates to write
	var updates = this.updateBuffer.slice(0);

	//And empty the buffer
	this.updateBuffer = [];

	var currentUpdate = 0;

	var self = this;

	function writeNextUpdate() {

		// If no more messages
		if (currentUpdate >= updateCount) {
			if (callback) {
				callback();
			}
			return;
		}

		var update = updates[currentUpdate];

		//Write the message
		self.updateEntry(update.where, update.set, function(){
			// and then...
			++currentUpdate;
			writeNextUpdate();
		});

	}

	writeNextUpdate();
};

// Update a row previously written to the database
DatabaseLogger.prototype.updateEntry = function(where, set, callback) {

	// Build the query
	var query = 'UPDATE ' +  this.CFG.LOG_TABLE + ' SET ';
	var values = [];

	var setQuery = [];
	for (var setKey in set) {
		setQuery.push(setKey + ' = ?');
		values.push(set[setKey]);
	}

	query += setQuery.join(', ') + ' WHERE ';

	var whereQuery = [];
	for (var whereKey in where) {
		whereQuery.push(whereKey + ' = ?');
		values.push(where[whereKey]);
	}

	query += whereQuery.join(' AND ');

	console.log(query, values);

	this.DB.query(query, values, function(err, rows) {
		if (callback) {
			callback();
		}
	});

};

module.exports = DatabaseLogger;
