var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var ChatRoom = require('./ChatRoom.js');
var crypto = require('crypto');


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



//Reduce number of io debug messages
io.set('log level', 2);

var rooms = {};

//The default room
rooms.lobby = new ChatRoom('lobby');

//io connections
io.sockets.on('connection', function(socket) {

	var clientID = generateClientID();
	console.log('New client connected: ' + clientID);

	socket.emit('info', { msg: 'Welcome!' });

	socket.on('message', function (data) {
		console.log(data);

		data.clientID = clientID;
		socket.broadcast.emit('message', data);

	});

});


function generateClientID() {
	return new Date().getTime() + '' + Math.ceil(Math.random() * 1000);
}

//Send a message every 30 seconds just for testing
setInterval(function(){

	io.sockets.emit('message', {
		clientID: 'server',
		time: new Date(),
		text: 'Hello, I\'m the server. The time is ' + new Date().toUTCString()
	});

}, 30000);
