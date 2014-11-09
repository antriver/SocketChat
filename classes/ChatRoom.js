var Entities = require('html-entities').AllHtmlEntities;

entities = new Entities();

var ChatRoom = function(name, displayName, logger) {

	// Name of the room
	this.name = name;
	this.displayName = displayName;

	// Users in the room
	this.users = {};

	// Is the room open? (This currently doesn't have any effect)
	this.status = "available";

	// Messages that have been sent
	this.messages = [];

	// Logging messages to database
	this.logger = logger;

	// Overrid ethe toJSON method, because when serialising this object
	// to send to the client, we don't want to send the logging stuff etc.
	this.toJSON = function() {
        return {
		name: this.name,
		displayName: this.displayName,
		users: this.users,
		status: this.status,
		messages: this.messages
        };
    };
};

//User joins a room
ChatRoom.prototype.join = function(socket, user) {

	//Subscribe this socket to this room
	socket.join(this.name);

	if (user) {
		//Add user to the list
		this.users[socket.id] = user;
		socket.broadcast.to(this.name).emit('userJoin', user);
	}
};

//User leaves a room
ChatRoom.prototype.leave = function(socket) {
	var user = this.users[socket.id];
	socket.broadcast.to(this.name).emit('userLeave', user);

	delete this.users[socket.id];
	socket.leave(this.name);
};

/**
 * New message in a room
 */
ChatRoom.prototype.sendMessage = function(socket, user, data) {

	data.text = entities.encode(data.text);

	var messageID = this.generateMessageID();

	var message = {
		messageID: messageID,
		room: this.name,
		from: user,
		text: data.text,
		date: new Date()
	};
	++user.messagesSent;
	socket.broadcast.to(this.name).emit('message', message);

	this.addMessage(message);

	this.logger.log({
		messageID: messageID,
		room: message.room,
		userID: message.from.userID,
		date: message.date,
		message: message.text
	});

	return message;
};

ChatRoom.prototype.generateMessageID = function() {
	return (new Date().getTime()).toString(16);
};

ChatRoom.prototype.addMessage = function(message) {

	this.messages.push(message);

	// Only keep the latest 20 messages
	this.messages = this.messages.slice(-20);
};

// Remove a message from the array by ID
ChatRoom.prototype.deleteMessage = function(messageID) {

	for (var i = 0; i < this.messages.length; i++) {
		if (this.messages[i].messageID && this.messages[i].messageID == messageID) {
			this.messages.splice(i, 1);

			this.logger.update({room:this.name, messageID:messageID}, {deleted:1});

			return true;
		}
	}

  };

module.exports = ChatRoom;
