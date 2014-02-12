var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var room = require('./chatRoom.js');


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


//io connections
io.sockets.on('connection', function(socket) {

	socket.emit('info', { msg: 'Welcome!' });

	socket.on('message', function (data) {
		console.log(data);

		socket.broadcast.emit('message', data);
	});

});

//Send a message every 30 seconds just for testing
setInterval(function(){

	socket.broadcast.emit('message', {
		time: new Date(),
		text: 'Time time is ' + new Date().toUTCString()
	});

}, 30000);
