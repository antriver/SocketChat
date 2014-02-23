var ChatRoom = function(name) {

	this.name = name;

	//List of users in the room
	this.users = {};

	this.status = "available";

	this.messages = [];

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
	var message = {
		room: this.name,
		from: user,
		text: data.text,
		date: new Date()
	};
	++user.messagesSent;
	socket.broadcast.to(this.name).emit('message', message);
	this.messages.push(message);
};

module.exports = ChatRoom;