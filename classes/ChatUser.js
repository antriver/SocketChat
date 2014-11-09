var ChatUser = function(socketid, userID, username, avatar) {

	this.id = socketid;
	this.username = username;
	this.userID = userID;
	this.avatar = avatar;
	this.admin = false;

	this.connected = new Date();

	//Name of the room the user is in
	this.room = null;

	//Number of messages sent
	this.messagesSent = 0;
};

ChatUser.prototype.setUsername = function(username) {
	this.username = username;
};

ChatUser.prototype.setRoom = function(roomName) {
	this.room = roomName;
};

ChatUser.prototype.makeAdmin = function() {
	this.admin = true;
};

module.exports = ChatUser;
