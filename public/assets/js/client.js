
function uniqid() {
	return (new Date().getTime()).toString(16);
}

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

var $_GET = {};

document.location.search.replace(/\??(?:([^=]+)=([^&]*)&?)/g, function () {
    function decode(s) {
        return decodeURIComponent(s.split("+").join(" "));
    }

    $_GET[decode(arguments[1])] = decode(arguments[2]);
});

$(function(){

	if ($_GET['embed'] == 1) {
		$('#controls').append('<a class="btn btn-mini" href="/chat" target="_top"><i class="fa fa-external-link-square"></i> Maximize</a>');
	}

});

// socket.io connection

var subDirectory = document.location.pathname.replace(/^\/|\/$/g, '');
if (subDirectory.length > 0) {
	var socket = io.connect(
		document.location.origin,
		{resource: subDirectory + '/socket.io'}
	);
} else {
	var socket = io.connect(document.location.origin);
}

socket.on('error', function(data) {
	console.log(data);
	if (data == 'handshake error') {
		//Not logged in
		window.location = '/path/to/login';
	}
});

// Current user info
var user = null;

// Name of the chat room the user is currently in
var currentRoom = false;
var currentPrivateMessagesUserID = null;


// Play sounds?
var soundOn = true;
if ($.cookie('chatSounds') === 'false') {
	soundOn = false;
}

function setSoundButton() {
	if (soundOn) {
		$('#soundToggle').addClass('active').html('<i class="fa fa-volume-up"></i> Sounds are on');
	} else {
		$('#soundToggle').removeClass('active').html('<i class="fa fa-volume-off"></i> Sounds are off');
	}
}

$(document).on('click', '#soundToggle', function(){
	soundOn = soundOn ? false : true;
	$.cookie('chatSounds', soundOn ,{ expires: 365});
	setSoundButton();
	return false;
});

setSoundButton();

/**
 * Setup
 */

// On page load set the username and room
$(document).ready(function(){
	setupSounds();
	//var username = prompt('Please pick a username:');
	//changeUsername(username);
	//changeRoom('lobby');
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

socket.on('banned', function (e) {
	alert("You have been banned from the chat:\n" + e.reason);
	socket.disconnect();
	socket = null;
	window.location = '/';
});

socket.on('kicked', function (e) {
	alert("You have been kicked from the chat:\n" + e.reason);
	socket.disconnect();
	socket = null;
	window.location = '/';
});

socket.on('disconnect', function() {
	showInfoMessage("You've been disconnected from the chat!", 'exclamation-triangle', 'red');
});

// Change room
function changeRoom(roomName) {
	socket.emit('changeRoom', {room:roomName});
}

// Room changed callback
socket.on('changedRoom', function(res){
	console.log('changedRoom', res);
	addNewRoom(res.room.name, res.room.displayName);

	// Display messages already in the room
	for (var i in res.room.messages) {
		showMessage(res.room.messages[i]);
	}

	// Display users already in the room
	setUsers(res.room.name, res.room.users);

	// Show the room to the user
	showRoom(res.room.name);

	$('#newMessage textarea').focus();

	if (Object.size(res.room.users) == 1) {
		str = "There is 1 person chatting.";
	} else {
		str = "There are " + Object.size(res.room.users) + " people chatting.";
	}
	showInfoMessage("Welcome to the chat! " + str, 'check');

	if (!user) {
		showInfoMessage('Without logging in you can only view the chat. Please <a href="/login">login</a> or <a href="/signup">signup</a> to talk in the chat.', 'user', 'red');
	}
});

$(document).on('click', '#roomList li', function(){
	var roomName = $(this).attr('data-room');
	if (roomName) {
		showRoom(roomName);
	}
	return false;
});
$(document).on('click', '#roomList li .close', function(){
	var roomName = $(this).closest('li').attr('data-room');
	removeRoom(roomName);
	return false;
});

function removeRoom(roomName) {

	console.log('removeRoom', roomName);
	// Switch to a new room first
	$('#roomList li:not([data-roomName='+ roomName + '])').first().click();

	$('.messages[data-room=' + roomName + ']').remove();
	$('#roomList li[data-room=' + roomName + ']').remove();
	$('.users[data-room=' + roomName + ']').remove();
}

function roomExists(roomName) {
	if ($('.messages[data-room=' + roomName + ']').length > 0) {
		return true;
	}
	return false;
}

function addNewRoom(roomName, displayedRoomName, closable) {

	console.log('addNewRoom', roomName, displayedRoomName);

	if (roomExists(roomName)) {
		//Room already exists
		console.log('Room already exists');
		return false;
	}

	// HTML for the new room
	var messageList = '<ul class="messages hide" data-room="' + roomName + '"></ul>';
	$('#main').append(messageList);

	if (!displayedRoomName) {
		displayedRoomName = roomName;
	}
	var roomLi = '<li class="room" data-room="' + roomName + '">';
	if (closable) {
		roomLi += '<a class="btn btn-mini btn-danger close"><i class="fa fa-times"></i></a>';
	}
	roomLi += displayedRoomName + '</li>';
	$('#roomList').append(roomLi);

	// HTML for the new room user list
	var userList = '<ul class="users hide" data-room="' + roomName + '"></ul>';
	$('#userLists').append(userList);

	return true;
}

/**
 * Hide existing message lists and show the list with the given name
 * Sets the currentRoom to this one
 * If privateMessagesUserID is given it sets currentPrivateMessagesUserID
 */
function showRoom(roomName, privateMessagesUserID, privateMessagesUsername) {

console.log('showRoom', roomName, privateMessagesUserID, privateMessagesUsername);

	stopGlowingRoom(roomName);

	if (roomName == currentRoom) {
		scrollToNewestMessage(true);
		return;
	}

	//Hide other rooms
	$('.messages').addClass('hide');
	$('.users').addClass('hide');
	$('#roomList li').removeClass('selected');
	$('.users li').removeClass('selected');

	//Add room element if it doesn't already exist
	if (privateMessagesUserID) {
		addPrivateMessagesRoom(privateMessagesUserID, privateMessagesUsername);
	} else {
		addNewRoom(roomName);
	}

	// Show the new room
	$('.messages[data-room=' + roomName + ']').removeClass('hide');
	$('.users[data-room=' + roomName + ']').removeClass('hide');

	if (!privateMessagesUserID && $('.messages[data-room=' + roomName + ']').attr('data-privateMessagesUserID')) {
		privateMessagesUserID = $('.messages[data-room=' + roomName + ']').attr('data-privateMessagesUserID');
	}

	if (privateMessagesUserID) {
		currentPrivateMessagesUserID = privateMessagesUserID;
		//$('.users li[data-userid=' + privateMessagesUserID +']').addClass('selected');
	} else {
		currentPrivateMessagesUserID = null;
	}

	$('#roomList li[data-room='+ roomName +']').addClass('selected');

	currentRoom = roomName;
	scrollToNewestMessage(true);
}

function glowRoom(roomName) {
	$('#roomList li[data-room=' + roomName + ']').addClass('glow');
}

function stopGlowingRoom(roomName) {
	$('#roomList li[data-room=' + roomName + ']').removeClass('glow');
}




// Change username
function changeUsername(username) {
	socket.emit('changeUsername', {username:username});
}

// Username changed callback
socket.on('changedUsername', function(res){
	console.log('changedUsername', res);
	if (res.user) {
		user = res.user;
		$('#newMessage').show();
		$('#newMessage textarea').show();
		$('#newMessageUnregistered').hide();
	} else {
		user = null;
		$('#newMessage').show();
		$('#newMessage textarea').hide();
		$('#newMessageUnregistered').show();
	}

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

	sortUsers($('.users[data-room=' + room + ']'));
}

function addUser(room, user) {

	if ($('.users[data-room=' + room + '] li[data-userid=' + user.userID + ']').length > 0) {
		//Only show each userID once
		return false;
	}

	var html = makeUserHTML(user);
	$('.users[data-room=' + room + ']').append(html);

	sortUsers($('.users[data-room=' + room + ']'));
}

function removeUser(room, user) {
	$('.users[data-room=' + room + '] li[data-socketid=' + user.id + ']').remove();

	sortUsers($('.users[data-room=' + room + ']'));
}

function removeUserEverywhere(user) {
	$('.users li[data-socketid=' + user.id + ']').remove();
}

function makeUserHTML(thisUser) {
	var u = '<li data-socketid="' + thisUser.id + '" data-userid="' + thisUser.userID + '">';

		//If this user is not the current logged in user
		if (user && thisUser.userID != user.userID) {

			if (user.admin) {
				u += '<a class="ban btn btn-mini btn-danger" title="Ban User"><i class="fa fa-ban"></i></a> ';
				u += '<a class="kick btn btn-mini btn-warning" title="Kick User"><i class="fa fa-times"></i></a> ';
			}

			u += '<a class="privateChat btn btn-mini btn-primary" title="Private Chat"><i class="fa fa-comment"></i></a> ';
		}

		u += '<img class="avatar" src="' + thisUser.avatar + '" />';
		u += thisUser.username;

	u += '</li>';
	return u;
}

$(document).on('click', '.users li', function(e) {
	var userID = $(this).closest('li').attr('data-userid');
	if (userID != user.userID) {
		var username = $(this).closest('li').text();
		showPrivateMessages(userID, username);
		return false;
	}
});

$(document).on('click', '.privateChat', function(e){
	var userID = $(this).closest('li').attr('data-userid');
	var username = $(this).closest('li').text();
	showPrivateMessages(userID, username);
	return false;
});

$(document).on('click', '.kick', function(e){
	var userID = $(this).closest('li').attr('data-userid');
	var reason = prompt("Enter a reason for kicking this user:");
	if (reason === null) {
		return false;
	}
	socket.emit('kick', {userID:userID, reason:reason});
	return false;
});

$(document).on('click', '.ban', function(e){
	var userID = $(this).closest('li').attr('data-userid');
	var reason = prompt("Enter a reason for banning this user:");
	if (reason === null) {
		return false;
	}
	socket.emit('ban', {userID:userID, reason:reason});
	return false;
});

function sortUsers(list) {
	var listItems = list.children('li').get();
	listItems.sort(function(a, b) {
		return $(a).text().trim().toUpperCase().localeCompare($(b).text().trim().toUpperCase());
	});
	$.each(listItems, function(idx, itm) {
		list.append(itm);
	});
}



/**
 * Displaying Messages
 */

function makeMessageHTML(message, privateMessage) {
	//Newlines to line breaks
	message.text = nl2br(message.text);
	var m = '<li';
		if (message.messageID) {
			m += ' data-messageID="' + message.messageID + '" ';
		}

		if (message.tempMessageID) {
			m += ' data-tempMessageID="' + message.tempMessageID + '" ';
		}

	m += '>';
		m += '<h4 class="author">';
			m += '<img class="avatar" src="' + message.from.avatar + '" />';
			m += '<span class="name">' + message.from.username + '</span>';
		m += '</h4>';
		m += '<time>' + formatTime(message.date) + '</time>';
		m += '<p>';
		if (!privateMessage && user.admin) {
			m += '<a class="btn btn-mini btn-danger deleteMessage"><i class="fa fa-trash-o"></i></a>';
		}
		m += message.text + '</p>';
	m += '</li>';
	return m;
}

function showMessage(message, sound, privateMessage) {
	console.log('Message received: ', message);
	if (!(message.date instanceof Date)) {
		//Convert date string back into a date object
		message.date = new Date(message.date);
	}

	var html = makeMessageHTML(message, privateMessage);
	$('.messages[data-room=' + message.room + ']').append(html);

	// Play a sound
	if (sound === true) {
		if (privateMessage) {
			playSound('privateMessage');
		} else {
			playSound('message');
		}
	}

	// Scroll to message
	scrollToNewestMessage();

	// Flash room name if the message isn't in the current room
	if (message.room != currentRoom) {
		glowRoom(message.room);
	}
}

$(document).on('click', '.deleteMessage', function()
{
	var msg = $(this).closest('li');
	var messageID = $(msg).attr('data-messageid');
	if (messageID) {
		socket.emit('deleteMessage', {room: currentRoom, messageID:messageID});
		$(msg).remove();
	}
	return false;
});


/**
 * Displaying Info Messages
 */

// Show an info message in the current room
function showInfoMessage(text, icon, classes, id, room, prepend) {

	if (icon) {
		text = '<i class="fa fa-' + icon + '"></i> ' + text;
	}

	var html = '<li class="info ' + (classes ? classes : '') + '" id="' + (id ? id : '') + '">';
		html += '<time>' + formatTime() + '</time>';
		html += '<p>' + text + '</p>';
	html += '</li>';

	if (!room) {
		room = currentRoom;
	}

	if (prepend) {
		$('.messages[data-room=' + room + ']').prepend(html);
	} else {
		$('.messages[data-room=' + room + ']').append(html);
	}

	scrollToNewestMessage();
}



/**
 * Events
 */

// Message Received
socket.on('message', function(message) {
	showMessage(message, true);
});

socket.on('messageDeleted', function(messageID) {
	try {
		$('.messages li[data-messageid=' + messageID +']').remove();
	} catch(e) {
		console.log(e);
	}
});

// User joins
socket.on('userJoin', function(user){
	console.log('userJoin', user);
	addUser(user.room, user);
	showInfoMessage(user.username + ' joined', 'plus', 'green', '', user.room);
});

// User leaves
socket.on('userLeave', function(user){
	console.log('userLeave', user);
	removeUser(user.room, user);
	showInfoMessage(user.username + ' left', 'minus', 'red');
});

//Sending a message
$(document).on('submit', '#newMessage', function() {

	if (!user) {
		return false;
	}

	var tempMessageID = uniqid();

	var newMessageText = $(this).children('#newMessage textarea');
	var text = newMessageText.val();
	if (!text) {
		return false;
	}

	var message;
	var privateMessage = false;

	if (currentPrivateMessagesUserID) {

		message = {
			tempMessageID: tempMessageID,
			to: currentPrivateMessagesUserID,
			text:text,
		};

		//Send private message
		socket.emit('privateMessage', message);
		message.room = 'privateMessages' + currentPrivateMessagesUserID;

	} else {

		message = {
			tempMessageID: tempMessageID,
			room: currentRoom,
			text: text,
		};

		//Send message
		socket.emit('message', message);

	}


	//Add the things we need to display the message but didn't need to send to the server
	message.date = new Date();
	message.from = user;

	//Show message to ourself

	// Escape the text
	message.text = $('<div/>').text(message.text).html();
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

socket.on('messageSent', function(res){
	// Add the real messageID in place of the temp message ID
	$('.messages li[data-tempmessageid=' + res.data.tempMessageID +']').attr('data-messageid', res.message.messageID);
});


/**
 * Private Messaging
 */

function showPrivateMessages(userID, username) {

	console.log('showPrivateMessages', userID, username);
	showRoom('privateMessages' + userID, userID, username);

}

function addPrivateMessagesRoom(userID, username) {

	var roomName = 'privateMessages' + userID;
	var displayedRoomName = '<i class="fa fa-lock"></i> ' + username;

	if (addNewRoom(roomName, displayedRoomName, true)) {

		$('.messages[data-room=' + roomName + ']').attr('data-privateMessagesUserID', userID);

		showInfoMessage('Private chat with ' + username + '.', 'lock', 'blue', '', roomName, true);

		//Add the users

		// Add current user
		$('.users[data-room=' + roomName + ']').append(
			$('.users li[data-userid=' + user.userID +']').first().clone()
		);

		// Add user chatting with
		$('.users[data-room=' + roomName + ']').append(
			$('.users li[data-userid=' + userID +']').first().clone()
		);

		sortUsers($('.users[data-room=' + roomName + ']'));

		return true;
	}

	return false;
}

// Private message received
socket.on('privateMessage', function(privateMessage) {

	console.log('privateMessage', privateMessage);

	var roomName ='privateMessages' + privateMessage.from.userID;

	if (!roomExists(roomName)) {
		addPrivateMessagesRoom(privateMessage.from.userID, privateMessage.from.username);
	}

	// Add the message to the room
	privateMessage.room = roomName;
	showMessage(privateMessage, true, true);
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

function scrollToNewestMessage(always) {

	// If we weren't at the bottom before, don't try and scroll down
	// (that's the annoying part)
	if (!always && !atBottom) {
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
