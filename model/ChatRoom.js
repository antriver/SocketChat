var Entities = require('html-entities').AllHtmlEntities;

entities = new Entities();

var ChatRoom = function(name, logger) {

	// Name of the room
	this.name = name;

	// Users in the room
	this.users = {};

	// Is the room open? (This currently does nothing)
	this.status = "available";

	// Messages that have been sent
	this.messages = [];

	// Logging messages
	this.logBuffer = [];
	this.logger = logger;
	this.startLogTimer();

	this.toJSON = function() {
        return {
        	name: this.name,
        	users: this.users,
        	status: this.status,
        	messages: this.messages
        };
    };
};

//User joins a room
ChatRoom.prototype.join = function(socket, user) {

	//Add user to the list
	this.users[socket.id] = user;

	//Subscribe this socket to this room
	socket.join(this.name);

	socket.broadcast.to(this.name).emit('userJoin', user);

};

//User leaves a room
ChatRoom.prototype.leave = function(socket) {

	var user = this.users[socket.id];
	socket.broadcast.to(this.name).emit('userLeave', user);

	delete this.users[socket.id];
	socket.leave(this.name);

};

ChatRoom.prototype.sendMessage = function(socket, user, data) {

	data.text = entities.encode(data.text);

	var message = {
		room: this.name,
		from: user,
		text: data.text,
		date: new Date()
	};
	++user.messagesSent;
	socket.broadcast.to(this.name).emit('message', message);
	this.messages.push(message);
	this.logMessage(message);
};



/**
* Logging
*/

ChatRoom.prototype.logMessage = function(message) {

	this.logBuffer.push(message);
	console.log(this.logBuffer.length + ' messages in log buffer');
	if (this.logBuffer.length >= 10) {
		this.writeMessageLog();
	}
}

ChatRoom.prototype.writeMessageLog = function() {
console.log(this.name + ' writeMessageLog');

	if (this.logBuffer.length < 1) {
		this.startLogTimer();
		return;
	}

	var messages = this.logBuffer.slice(0); //Clone the array
	this.logBuffer = [];

	this.stopLogTimer();
	console.log(this.name + ' writing message log');

	var self = this;
	this.logger.logMessages(this.name, messages, function(){
		self.startLogTimer();
	});

};

ChatRoom.prototype.startLogTimer = function() {
	this.stopLogTimer();
	var self = this;
	this.logTimer = setTimeout(function(){ console.log('logTimer timeout'); self.writeMessageLog(); }, 30000);
}

ChatRoom.prototype.stopLogTimer= function() {
	clearTimeout(this.logTimer);
	this.logTimer = null;
}

module.exports = ChatRoom;
