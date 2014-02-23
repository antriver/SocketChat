
// Current user info
var user = {};

// Name of the chat room the user is currently in
var currentRoom = false;

// socket.io
var socket = io.connect('http://' + document.location.hostname);

// Play sounds?
var soundOn = true;

/**
 * Setup
 */

// On page load set the username and room
$(document).ready(function(){
	setupSounds();
	var username = prompt('Please pick a username:');
	changeUsername(username);
	changeRoom('lobby');
});

// Called when connecting the first time, or reconnecting
socket.on('connect', function(e) {

	// Recconnecting...
	if (user && user.username) {
		changeUsername(user.username);
	}

	if (currentRoom) {
		changeRoom(currentRoom);
	}

});

// Change room
function changeRoom(roomName) {
	socket.emit('changeRoom', {room:roomName});
}

// Room changed callback
socket.on('changedRoom', function(res){
	console.log('changedRoom', res);
	addNewRoom(res.room.name);

	// Display messages already in the room
	for (var i in res.room.messages) {
		showMessage(res.room.messages[i]);
	}

	// Display users already in the room
	setUsers(res.room.name, res.room.users);

	// Show the room to the user
	showRoom(res.room.name);

	$('#newMessage textarea').focus();
	showInfoMessage('Welcome, ' + user.username + '!');
});

function addNewRoom(roomName) {

	// HTML for the new room
	if ($('.messages[data-room=' + roomName + ']').length < 1) {
		var messageList = '<ul class="messages" data-room="' + roomName + '"></ul>';
		$('#main').append(messageList);
	}

	// HTML for the new room user list
	if ($('.users[data-room=' + roomName + ']').length < 1) {
		var userList = '<ul class="users" data-room="' + roomName + '"></ul>';
		$('#side').append(userList);
	}
}

function showRoom(roomName) {

	if (roomName == currentRoom) {
		return;
	}

	//Hide other rooms
	$('.messages').hide();
	$('.users').hide();

	// Show the new room
	$('.messages[data-room=' + roomName + ']').show();
	$('.users[data-room=' + roomName + ']').show();

	currentRoom = roomName;
}

// Change username
function changeUsername(username) {
	socket.emit('changeUsername', {username:username});
}

// Username changed callback
socket.on('changedUsername', function(res){
	console.log('changedUsername', res);
	user = res.user;
});


/**
 * Online User List
 */

function setUsers(room, users) {
	$('.users[data-room=' + room + ']').html('');
	for (var i in users) {
		var user = users[i];
		addUser(room, user);
	}
}

function addUser(room, user) {
	var html = makeUserHTML(user);
	$('.users[data-room=' + room + ']').append(html);
}

function removeUser(room, user) {
	$('.users[data-room=' + room + '] li[data-id=' + user.id + ']').remove();
}

function makeUserHTML(user) {
	var u = '<li data-id="' + user.id + '">';
		u += user.username;
	u += '</li>';
	return u;
}


/**
 * Displaying Messages
 */

function makeMessageHTML(message) {
	//Newlines to line breaks
	message.text = nl2br(message.text);
	var m = '<li>';
		m += '<h4 class="author"><span class="name">' + message.from.username + '</span></h4>';
		m += '<time>' + formatTime(message.date) + '</time>';
		m += '<p>' + message.text + '</p>';
	m += '</li>';
	return m;
}

function showMessage(message, sound) {
	console.log('Message received: ', message);
	if (!(message.date instanceof Date)) {
		//Convert date string back into a date object
		message.date = new Date(message.date);
	}
	var html = makeMessageHTML(message);
	$('.messages[data-room=' + message.room + ']').append(html);

	// Play a sound
	if (sound === true) {
		playSound('message');
	}

	// Scroll to message
	scrollToNewestMessage();
}


/**
 * Displaying Info Messages
 */

// Show an info message in the current room
function showInfoMessage(text, classes, id) {

	var html = '<li class="info ' + (classes ? classes : '') + '" id="' + (id ? id : '') + '">';
		html += '<time>' + formatTime() + '</time>';
		html += '<p>' + text + '</p>';
	html += '</li>';

	$('.messages[data-room=' + currentRoom + ']').append(html);

	scrollToNewestMessage();
}



/**
 * Events
 */

// Message Received
socket.on('message', function(message) {
	showMessage(message, true);
});

// User joins
socket.on('userJoin', function(user){
	console.log('userJoin', user);
	addUser(user.room, user);
	showInfoMessage(user.username + ' joined', 'green');
});

// User leaves
socket.on('userLeave', function(user){
	console.log('userLeave', user);
	removeUser(user.room, user);
	showInfoMessage(user.username + ' left', 'red');
});

//Sending a message
$(document).on('submit', '#newMessage', function() {
	var newMessageText = $(this).children('#newMessage textarea');
	var text = newMessageText.val();
	if (!text) {
		return false;
	}

	var message = {
		room: currentRoom,
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

// Submit new message form on enter
$(document).on('keydown', '#newMessage textarea', function(e) {
	if (e.shiftKey === false && e.which == 13) {
		$('#newMessage').submit();
		return false;
	}
});



/**
 * Sounds
 */

function setupSounds() {
	var sounds = {
		message: 'pop',
		privateMessage: 'pm',
		userJoin: 'join'
	};
	var types = [
		'audio/ogg',
		'audio/mpeg',
		'audio/wav'
	];
	for (var sound in sounds) {
		var fileName = sounds[sound];
		var audio = $('<audio class="sound hide" data-sound="' + sound + '" />');
		audio.append('<source src="assets/sounds/' + fileName + '.ogg" type="audio/ogg" />');
		audio.append('<source src="assets/sounds/' + fileName + '.mp3" type="audio/mpeg" />');
		audio.append('<source src="assets/sounds/' + fileName + '.wav" type="audio/wav" />');
		$('body').append(audio);
	}
}

function playSound(sound) {
	if (!soundOn) {
		return false;
	}
	try {
		$('audio[data-sound=' + sound +']')[0].play();
	} catch (e) {
		console.log(e);
	}
}

/**
 * Time
 */

// Returns a formatted time for the given Date object
// Or uses the curerrent time if no Date given
var today = new Date();
var todaysDate = today.getDate();
var todaysMonth = today.getMonth();
function formatTime(d) {
	if (!d) {
		d = new Date();
	}
	var hours = d.getHours();
	var minutes = d.getMinutes();
	var ampm = hours >= 12 ? 'pm' : 'am';
	hours = hours % 12;
	hours = hours ? hours : 12; // the hour '0' should be '12'
	minutes = minutes < 10 ? '0'+minutes : minutes;

	var timeString = hours + ':' + minutes + ' ' + ampm;

	// If the date is not from today, show the date as well as the time
	var date = d.getDate();
	var month = d.getMonth();
	if (date != todaysDate || month != todaysMonth) {
		var year = d.getFullYear() + '';
		timeString += ' '+date+'/'+(month+1)+'/'+year.substring(2);
	}

	return timeString;
}

/**
 * Scrolling
 *
 * News messages appear at the bottom of the screen, so automatically
 * scroll down to new messages as they appear.
 * But only if the user hasn't scrolled up because it would be annoying for
 * it to keep scrolling down if you're trying to read messags.
 */

// Are we (more or less) scrolled to the bottom of the page?
var atBottom = true;

function scrollToTop() {
	$('html, body').stop().animate({ scrollTop: 0 }, 200);
}

function scrollToNewestMessage() {

	// If we weren't at the bottom before, don't try and scroll down
	// (that's the annoying part)
	if (!atBottom) {
		return false;
	}

	$('html, body').stop().animate({scrollTop: $(document).height()}, 200);
	atBottom = true;
}

$(window).scroll(function() {

	// Determine if we're at (or near enough) the bottom of the page
	// that scrolling when a new message appears would be okay
	if ($(window).scrollTop() + $(window).height() + 40 >= $(document).height()) {
		atBottom = true;
	} else {
		atBottom = false;
	}

});

/**
 * Plugins
 */

function nl2br(str, is_xhtml) {
    var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br />' : '<br>';
    return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2');
}
