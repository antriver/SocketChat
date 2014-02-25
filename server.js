var express = require('express');
var app = express();
var server = require('http').createServer(app);
var cookie = require("cookie");
var io = require('socket.io').listen(server);
var request = require('request');

app.use(express.cookieParser());

var ChatRoom = require('./model/ChatRoom.js');
var ChatUser = require('./model/ChatUser.js');

//Start server on port 3000
server.listen(3000);

//Static routes
app.configure(function(){
	app.use(express.static(__dirname + '/public'));
});

//Routes
/*app.get('/', function (req, res) {
	res.sendfile(__dirname + '/public/index.html');
});*/

app.get('/admin', function (req, res) {

	var r = '';

	r += '<h1>Chat Status</h1>';

	r += '<h2>Rooms</h2>';
	r += '<pre>' + JSON.stringify(rooms, undefined, 4) + '</pre>';

	r += '<h2>Users</h2>';
	r += '<pre>' + JSON.stringify(users, undefined, 4) + '</pre>';

	res.end(r);
});


//Reduce number of io debug messages
io.set('log level', 2);

/**
 * TSL Cookie Authorization
 */
io.set('authorization', function (handshakeData, accept) {

	if (handshakeData.headers.cookie.sessionKey) {

		request({
			url: 'http://www.top-site-list.com/api/user.php',
			qs: {
				key: handshakeData.headers.cookie.sessionKey,
			}
		}, function(error, response, body) {
			if (!error && response.statusCode == 200) {
				res = JSON.parse(body);
				console.log(res);
				if (res.user) {
					handshakeData.user = res.user;
					accept(null, true);
				} else {
					accept("Validation with TSL failed " + body, false);
				}

			} else {
				accept("Unable to authenticate with TSL server", false);
			}
		});
	}

	accept("No session cookie", false);
});

/**
 * Chat
 */


//List of available rooms
var rooms = {
	lobby: new ChatRoom('lobby'),
	otherroom: new ChatRoom('otherroom')
};


//List of connected clients
var users = {};

//Create a "server" user
var serverUser = new ChatUser(0, 'Serverus Snape');
users[0] = serverUser;


//io connections
io.sockets.on('connection', function(socket) {

	console.log('New connection: ', socket.id);

	console.log(socket.handshake);

	//Create a new user
	users[socket.id] = new ChatUser(socket.id);

	//User changed room
	//(Client should change room to the lobby upon connection)
	socket.on('changeRoom', function(data){

		console.log('changeRoom', data);

		//Leave the old room if set
		if (users[socket.id].room !== null) {
			rooms[users[socket.id].room].leave(socket);
		}

		users[socket.id].setRoom(data.room);
		rooms[data.room].join(socket, users[socket.id]);

		socket.emit('changedRoom', {
			room: rooms[data.room]
		});

	});


	//User changes username
	socket.on('changeUsername', function(data){
		console.log('changeUsername', data);

		users[socket.id].setUsername(data.username);

		socket.emit('changedUsername', {
			user: users[socket.id]
		});
	});


	//New message sent
	socket.on('message', function(data) {
		console.log('Message from: ' + socket.id, data);
		try {
			rooms[users[socket.id].room].sendMessage(socket, users[socket.id], data);
		} catch (e) {
			console.log(e);
		}
	});


	//User leaves
	socket.on('disconnect', function() {
		try {
			rooms[users[socket.id].room].leave(socket);
			delete users[socket.id];
		} catch (e) {
			console.log("Can't remove user from room", e);
		}
	});

});


//Put serverUser in the lobby
rooms.lobby.users[0] = serverUser;
//Send a message every 30 seconds just for testing
setInterval(function(){

	io.sockets.emit('message', {
		room: 'lobby',
		from: serverUser,
		date: new Date(),
		text: 'Hello, I\'m the server. Sending you a message so you can see this is still alive. The time is ' + new Date().toUTCString()
	});

}, 60000);
