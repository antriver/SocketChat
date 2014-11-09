// Load modules
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var cookie = require("cookie");
var io = require('socket.io').listen(server);
var request = require('request');

app.use(express.cookieParser());

var CFG = require('./config.js');
var ChatRoom = require('./classes/ChatRoom.js');
var ChatUser = require('./classes/ChatUser.js');
var DatabaseLogger = require('./classes/DatabaseLogger.js');

//Start server on port 3000
server.listen(3000);

/**
 * Routes
 */
app.configure(function(){
	app.use(express.static(__dirname + '/public'));
});

app.get('/status.json', function (req, res) {
	var status = {
		rooms: rooms,
		users: users
	};
	res.json(status);
});

//Reduce number of io debug messages
io.set('log level', 2);


/**
 * TSL Cookie Authorization
 */
io.set('authorization', function (handshakeData, accept) {

	if (!handshakeData.headers.cookie) {
		accept("No session cookie", false);
		return;
	}

	handshakeData.cookie = cookie.parse(handshakeData.headers.cookie);

	if (handshakeData.cookie.sessionKey) {

		request({
			url: 'http://www.top-site-list.com/api/user.php',
			qs: {
				key: handshakeData.cookie.sessionKey,
			}
		}, function(error, response, body) {
			if (!error && response.statusCode == 200) {

				try {
					console.log(body);
					res = JSON.parse(body);
				} catch(e) {
					accept("TSL API error' " + e, false);
				}
				console.log(res);

				if (res.user) {

					handshakeData.user = res.user;
				}

				//We always allow them to authentixate, but store in the handshakeData
				//if they are logged in or not
				acceptHandshakeIfNotBanned(handshakeData, accept);

				/*} else {
					accept("User not logged in", false);
				}*/

			} else {
				accept("Unable to authenticate with TSL server", false);
			}
		});
	} else {
		acceptHandshakeIfNotBanned(handshakeData, accept);
		//accept("No session cookie", false);
	}
});

function acceptHandshakeIfNotBanned(handshakeData, accept) {

	var IP = handshakeData.headers['x-forwarded-for'];

	var qs = {
		IP: IP
	};

	if (handshakeData.user) {
		qs.userID = handshakeData.user.id;
	}

	request({
		url: 'http://www.top-site-list.com/api/banned.php',
		qs: qs
	}, function(error, response, body) {

		if (!error && response.statusCode == 200) {

			try {
				console.log(body);
				res = JSON.parse(body);
			} catch(e) {
				accept("TSL API error' " + e, false);
			}
			console.log(res);

			if (res.banned) {
				accept(res.message, false);
			} else {
				accept(null, true);
			}

		} else {
			accept(res.message, false);
		}
	});

}



/**
 * Chat
 */

// List of available rooms
var rooms = {
	lobby: new ChatRoom('lobby', 'Top Site List Chat', new DatabaseLogger(CFG)),
	//otherroom: new ChatRoom('otherroom', new DatabaseLogger(CFG))
};

// List of connected clients
var users = {};

// Map of current user IDs to socket IDs
var userIDs = {};

//io connections
io.sockets.on('connection', function(socket) {

	// Begin connect procedure
	//
	console.log('[Connect]', socket.id);

	if (socket.handshake.user) {
		// Create a new ChatUser for the connection
		users[socket.id] = new ChatUser(
			socket.id,
			socket.handshake.user.id,
			socket.handshake.user.username,
			socket.handshake.user.avatar
		);

		// Add to the userID map
		if (userIDs[socket.handshake.user.id]) {
			// Add to array if it already exists for this user
			userIDs[socket.handshake.user.id].push(socket.id);
		} else {
			// Create new array if one doesn't already exist
			userIDs[socket.handshake.user.id] = [socket.id];
		}

		// Make user a chat admin if they're a TSL admin
		if (socket.handshake.user.admin == 1) {
			users[socket.id].makeAdmin();
		}

		// Send the client their user details
		socket.emit('changedUsername', {
			user: users[socket.id]
		});

	} else {
		// Send the client their user details
		socket.emit('changedUsername', {
			user: null,
			anon: true
		});
	}

	// Put them in lobby by default
	changeRoom(socket, {room: 'lobby'});

	// End connect procedure

	/**
	 * Socket Events
	 */

	// User changed room
	socket.on('changeRoom', function(data){
		changeRoom(socket, data);
	});

	// New message sent from client
	socket.on('message', function(data) {
		sendMessage(socket, data);
	});

	// New private message sent from client
	socket.on('privateMessage', function(data) {
		sendPrivateMessage(socket, data);
	});

	// User leaves
	socket.on('disconnect', function() {
		userLeft(socket);
	});

	// Kick a user
	socket.on('kick', function(data) {
		if (isAdmin(socket)) {
			kickUser(data.userID, data.reason, 'kicked');
		}
	});

	// Ban a user
	socket.on('ban', function(data) {
		if (isAdmin(socket)) {
			banUser(socket, data);
		}
	});

	// TODO: Should users be able to delete their own messages?
	socket.on('deleteMessage', function(data) {
		if (isAdmin(socket)) {
			deleteMessage(socket, data);
		}
	});

});

function changeRoom(socket, data) {

	try {
		var roomName = data.room;
		if (!roomName) {
			console.log('[Empty Room Name Changing Room]', data);
			return false;
		}

		if (socket.handshake.user) {

			//Leave the old room if set
			if (users[socket.id].room !== null && users[socket.id].room != roomName) {
				rooms[users[socket.id].room].leave(socket);
			}

			users[socket.id].setRoom(roomName);

			rooms[roomName].join(socket, users[socket.id]);

		} else {
			rooms[roomName].join(socket, null);
		}


		socket.emit('changedRoom', {
			room: rooms[roomName]
		});

	} catch(e) {
		console.log('[Exception Changing Room]', e);
	}
}

function sendMessage(socket, data) {

	if (!socket.handshake.user) {
		return false;
	}

	// Which room is this client in?
	var roomName = users[socket.id].room;
	console.log('[Message]', roomName, socket.id, data);
	try {
		var message = rooms[roomName].sendMessage(
			socket,
			users[socket.id],
			data
		);

		socket.emit('messageSent', {
			message: message,
			data:data
		});

	} catch (e) {
		console.log(e);
	}
}

function sendPrivateMessage(socket, data) {

	if (!socket.handshake.user) {
		return false;
	}

	console.log('[Info] Private message from socket ID ' + socket.id + ' to user ID ' + data.to);

	var userID = data.to;
	if (!userID) {
		return false;
	}
	var usersSockets = userIDs[userID];
	if (!usersSockets || usersSockets.length < 1) {
		console.log('[Error] User ID ' + userID + ' has no sockets');
		return false;
	}

	var privateMessage = createPrivateMessage(socket, data);
	if (!privateMessage) {
		return false;
	}
	console.log(privateMessage);
	console.log(usersSockets);
	// Get all the user's sockets and emit to them
	for (var i in usersSockets) {
		var socketID = usersSockets[i];
		console.log('[Info] Emit private message to ' + socketID);
		io.sockets.sockets[socketID].emit('privateMessage', privateMessage);
	}
}

function createPrivateMessage(socket, data) {
	if (!data.text || !data.to) {
		return false;
	}
	data.text = entities.encode(data.text);
	return {
		to: data.to, //PMs have to to property instead of 'room'
		from: users[socket.id],
		text: data.text,
		date: new Date()
	};
}

function userLeft(socket) {

	if (!socket.handshake.user) {
		return false;
	}

	try {
		var userID = users[socket.id].userID;

		// Remove socket from the userID map

		// Find and remove item from an array
		var index = userIDs[userID].indexOf(socket.id);
		if (index != -1) {
			userIDs[userID].splice(index, 1);
		}

		// Remove if empty
		if (userIDs[userID].length < 1) {
			delete userIDs[userID];
		}

		rooms[users[socket.id].room].leave(socket);
		delete users[socket.id];

	} catch (e) {
		console.log("Can't remove user from room", e);
	}

}

/**
 * Returns true or false if the socket is a TSL admin user
 */
function isAdmin(socket) {
	console.log('[Debug] Admin?', socket.id, users[socket.id].admin);
	return users[socket.id].admin === true;
}

/**
 * Force disconnect a specific socket from the server
 * and emit the given action name with the given
 * reason as the 'reason' parameter.
 */
function kickSocket(socketID, reason, action) {
	try {
		console.log('Kick ' + socketID);
		io.sockets.sockets[socketID].emit(action, {reason: reason});
		io.sockets.sockets[socketID].disconnect();
	} catch(e) {
		console.log('[Exception]', e);
	}
}

/**
 * Force disconnect all of a user's sockets from the server
 * and emit the given action name with the given
 * reason as the 'reason' parameter.
 */
function kickUser(userID, reason, action) {

	// Clone the list of sockets, because it'll get modified
	// as they disconnect, so the loop will break
	sockets = userIDs[userID].slice(0);

	for (var i in sockets) {
		console.log(i);
		kickSocket(sockets[i], reason, action);
	}
}

/**
 * Tell the TSL API to ban a user,
 * then kicks the user
 */
function banUser(socket, data) {

	var userID = users[data.userID];
	console.log('userToBan', userID);
	if (!userID) {
		return false;
	}

	// Send API request to ban the user on TSL
	var params = {
		sessionKey: socket.handshake.cookie.sessionKey,
		userID: userID,
		reason: data.reason
	};
	api(
		'ban.php',
		params,
		function(){
			// I don't think we care about the response here
		},
		function() {
			// uh-oh, error
		}
	);

	// Kick the user
	kickUser(userID, data.reason, 'banned');
}


function deleteMessage(socket, data) {
	try {
		var messageID = data.messageID;
		var roomName = data.room;

		console.log('Delete message', roomName, messageID);
		if (rooms[roomName].deleteMessage(messageID)) {
			socket.broadcast.to(roomName).emit('messageDeleted', messageID);
		}

	} catch (e) {
		console.log(e);
	}
}

function api(endpoint, params, success, error) {
	request(
	{
		url: 'http://www.top-site-list.com/api/' + endpoint,
		qs: params
	}, function(responseError, response, responseBody) {

		console.log(responseError, response, responseBody);

		if (!responseError && response.statusCode == 200) {

			try {
				res = JSON.parse(responseBody);

				if (res.error) {
					error(res.error);
				} else {
					success(res);
				}

			} catch(e) {
				console.log('[TSL API error] ' + e);
				error();
			}

		} else {
			console.log('[TSL API error] ' + responseError);
			error();
		}

	});
}

/**
 * For demo purposes
 */
/*
//Create a "server" user
var serverUser = new ChatUser(0, 0, 'Quote Bot', 'http://www.top-site-list.com/assets/img/default-avatar.jpg');
users[0] = serverUser;

//Put serverUser in the lobby
//
rooms.lobby.users[0] = serverUser;
//Send a message every 30 seconds just for testing
setInterval(function(){

	io.sockets.emit('message', {
		room: 'lobby',
		from: serverUser,
		date: new Date(),
		text: 'Hello, I\'m the server. Sending you a message so you can see this is still alive. The time is ' + new Date().toUTCString()
	});

}, 60000);*/
