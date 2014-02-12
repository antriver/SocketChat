var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

var ChatRoom = require('./ChatRoom.js');
var ChatUser = require('./ChatUser.js');



//Start server on port 3000
server.listen(3000);


//Static routes
app.configure(function(){
	app.use(express.static(__dirname + '/public'));
});

//Routes
app.get('/', function (req, res) {
	res.sendfile(__dirname + '/public/index.html');
});

app.get('/admin', function (req, res) {

	var r = '';

	r += '<h1>Chat Status</h1>';

	r += '<h2>Rooms</h2>';
	r += '<pre>' + JSON.stringify(rooms, undefined, 2) + '</pre>';

	r += '<h2>Users</h2>';
	r += '<pre>' + JSON.stringify(users, undefined, 2) + '</pre>';

	res.end(r);
});


//Reduce number of io debug messages
io.set('log level', 2);


/**
 * Chat
 */


//List of available rooms
var rooms = {
	lobby: new ChatRoom('lobby')
};


//List of connected clients
var users = {};


//io connections
io.sockets.on('connection', function(socket) {

	console.log('New connection: ', socket.id);

	//Create a new uset
	users[socket.id] = new ChatUser();

	//User changed room
	//(Client should change room to the lobby upon connection)
	socket.on('changeRoom', function(data){

		console.log('switchRoom', data);

		//Leave the old room if set
		if (users[socket.id].room !== null) {
			rooms[users[socket.id].room].leave(socket);
		}

		users[socket.id].setRoom(data.room);
		rooms[data.room].join(socket, users[socket.id]);

	});

	//User changes username
	socket.on('changeUsername', function(data){
		users[socket.id].setUsername(data.username);
	});


	//New message received
	socket.on('message', function(data) {

		console.log('Message from: ', socket.id);

		console.log(data);
		data.clientID = socket.id;
		socket.broadcast.emit('message', data);

		++users[socket.id].messagesSent;
	});


	//User leaves
	socket.on('disconnect', function() {
		try {
			rooms[users[socket.id].room].leave(socket);
			delete users[socket.id];
		} catch(e) {
			console.log("Can't remove user from room", e);
		}
	});

});


function generateClientID() {
	return new Date().getTime() + '' + Math.ceil(Math.random() * 1000);
}

//Send a message every 30 seconds just for testing
setInterval(function(){

	io.sockets.emit('message', {
		time: new Date(),
		text: 'Hello, I\'m the server. The time is ' + new Date().toUTCString()
	});

}, 30000);
