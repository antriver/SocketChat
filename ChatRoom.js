var ChatRoom = function(name) {

	this.name = name;

	//List of users in the room
	this.users = [];

	this.status = "available";

};

//User joins a room
ChatRoom.prototype.addPerson = function(socket, user) {

	//Add user to the list
	this.users.push(user);

	//Send a message saying the user joined
	//socket.emit

};

module.exports = ChatRoom;
