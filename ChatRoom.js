var ChatRoom = function(name) {

	this.name = name;

	//List of users in the room
	this.users = {};

	this.status = "available";

};

//User joins a room
ChatRoom.prototype.join = function(socket, user) {

	//Add user to the list
	this.users[socket.id] = user;

};


//User leaves a room
ChatRoom.prototype.leave = function(socket) {

	delete this.users[socket.id];

};

module.exports = ChatRoom;
