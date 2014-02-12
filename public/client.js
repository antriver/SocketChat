function makeMessageHTML(message) {
	var h = '<li>';
		h += '<h5>Message from: ' + message.from.username + ' at ' + message.date.toUTCString() + '</h5>';
		h += '<p>' + message.text + '</p>';
	h += '</li>';
	return h;
}

function showMessage(message) {
	if (!(message.date instanceof Date)) {
		//Convert date string back into a date object
		message.date = new Date(message.date);
	}
	$('#messages').append(makeMessageHTML(message));
}

//Events

//Sending a message
$(document).on('submit', '#newMessage', function() {
	var newMessageText = $(this).children('[name=text]');
	var text = newMessageText.val();
	if (!text) {
		return false;
	}

	var message = {
		text: text,
	};

	//Send message
	socket.emit('message', message);

	//Add the things we need to display the message but didn't need to send to the server
	message.date = new Date();
	message.from = user;

	//Show message to ourself
	showMessage(message);

	//Clear input
	newMessageText.val('');

	return false;
});


//socket.io
var socket = io.connect('http://' + document.location.hostname);


//Current room
function changeRoom(roomName) {
	socket.emit('changeRoom', {room:roomName});
}
//Room changed callback
socket.on('changedRoom', function(res){
	console.log('changedRoom', res);
	$('#roomName').text(res.room.name);
	$('#messages').html('');
	for (var i in res.room.messages) {
		showMessage(res.room.messages[i]);
	}
});

//Current user
var user = {};

function changeUsername(username) {
	socket.emit('changeUsername', {username:username});
}
//Username changed callback
socket.on('changedUsername', function(res){
	console.log('changedUsername', res);
	user = res.user;
});


//Message Received
socket.on('message', function(message) {
	showMessage(message);
});


//On load, set the username and room
$(document).ready(function(){
	var username = prompt('Please pick a username:');
	changeUsername(username);
	changeRoom('lobby');
});

