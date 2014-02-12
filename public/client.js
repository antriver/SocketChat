function makeMessageHTML(data) {
	var h = '<li>';
		h += '<h5>Message from: ' + data.clientID + '</h5>';
		h += '<p>' + data.text + '</p>';
	h += '</li>';
	return h;
}

function showMessage(data) {
	$('#messages').append(makeMessageHTML(data));
}

//Events

//Sending a message
$(document).on('submit', '#newMessage', function() {
	var newMessageText = $(this).children('[name=text]');
	var text = newMessageText.val();
	if (!text) {
		return false;
	}

	var msg = {
		text: text
	};

	//Send message
	socket.emit('message', {
		text: text
	});

	//Clear input
	newMessageText.val('');

	//Show message to ourself
	msg.clientID = 'self';
	showMessage(msg);

	return false;
});


//socket.io
var socket = io.connect('http://' + document.location.hostname);

socket.on('info', function(data) {
	console.log(data);
});

socket.on('message', function(msg) {
	showMessage(msg);
});


