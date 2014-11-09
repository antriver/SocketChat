$(function(){
	var msg = encodeURIComponent('Come and join me for a chat in the Top Site List Planet chat room!');
	var url = encodeURIComponent('http://www.top-site-list.com/chat/');
	var img = encodeURIComponent('http://www.top-site-list.com/assets/img/logo.png');

	var urls = {
		'facebook' : 'http://www.facebook.com/sharer.php?s=100&amp;p[title]=' + msg + '&amp;p[summary]=&amp;p[url]=' + url + '&amp;p[images][0]=' + img,
		'twitter' : 'https://twitter.com/intent/tweet?original_referer=' + url + '&source=tweetbutton&text=' + msg + '&url=' + url,

		'tumblr' : 'http://www.tumblr.com/share/link?url=' + url + '&name=' + msg,

		'email' : 'mailto:?subject=' + msg + '&body=' + url
	};

	var html = '';

	html += '<a target="_blank" href="' + urls.facebook + '" class="btn btn-mini btn-social-facebook"><i class="fa fa-facebook"></i></a>';
	html += '<a target="_blank" href="' + urls.twitter + '" class="btn btn-mini btn-social-twitter"><i class="fa fa-twitter"></i></a>';
	html += '<a target="_blank" href="' + urls.tumblr + '" class="btn btn-mini btn-social-tumblr"><i class="fa fa-tumblr"></i></a>';
	html += '<a target="_blank" href="' + urls.email + '" class="btn btn-mini btn-social-email"><i class="fa fa-envelope"></i></a>';

	$('#share').append(html);
});
