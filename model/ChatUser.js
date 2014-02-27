var ChatUser = function(socketid, userID, username, avatar) {

	this.id = socketid;
	this.username = username;
	this.userID = userID;
	this.avatar = avatar;

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

module.exports = ChatUser;
