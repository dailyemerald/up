var request = require('request')
  , jsdom = require('jsdom')
  , email = require('mailer')
  , credentials = require('./credentials');

function checkSite(siteObj) {
	var url = siteObj.url
	  , suite = siteObj.suite
	  , callback = siteObj.callback
	
	var startTime = new Date();
	
	request({ uri: url }, function (error, response, body) {

	  if (error && response.statusCode !== 200) {
	    callback({
			'result': 'failure', 
			'data': error, 
			'time': responseTime
		})
	  } 

	  jsdom.env({ html: body, scripts: ['http://code.jquery.com/jquery-1.5.min.js'] }, function (err, window) {
		
		var responseTime = new Date() - startTime
		
	    var $ = window.jQuery;
		var passing = true;
		var failedTests = [];
		suite.forEach(function(test) {
			if ($(test.selector).length >= test.hasAtLeast) {
				console.log(test.selector, "passes...")
			} else {
				passing = false;
				failedTests.push(test.selector)
				console.log("site:",url,"selector:",test.selector, "failed!")
			}
		});
		
		// tests done, let's see if we're winning...			
		if (passing == true) {
			callback({
			'result': 'success', 
				'data': [], 
				'time': responseTime
			})
		} else {
			callback({
				'result': 'failure', 
				'data': failedTests, 
				'time': responseTime
			})
		}

	  }); //end of jsdom.env callback
	});	//end of request callback	
} //end of checkSite()

function notify(email, reason) {
	console.log('notify wants to email', email, 'about', reason)

	email.send({
	  host : "smtp.sendgrid.net",              // smtp server hostname
	  port : "25",                     // smtp server port
	  domain : "smtp.sendgrid.net",            // domain used by client to identify itself to server
	  to : "ivong@dailyemerald.com",
	  from : "no-reply@dailyemerald.com",
	  subject : "node_mailer test email",
	  body: "Hello! This is a test of the node_mailer.",
	  authentication : "login",        // auth login is supported; anything else is no auth
	  username : (new Buffer(credentials.username)).toString("base64"),       // Base64 encoded username
	  password : (new Buffer(credentials.password)).toString("base64")        // Base64 encoded password
	},
	function(err, result){
	  if(err){ console.log(err); }
	});
	
}

checkSite({
	url: 'http://dailyemerald.com/',
	suite: [
		{selector: 'a',   hasAtLeast: 1000},
		{selector: 'img', hasAtLeast: 100}
	],
	callback: function(res) {
		if (res.result == 'failure') {
			notify('ivar@ivarvong.com', res.data);
			console.log('--- dailyemerald.com fails.',res.responseTime)
		} else {
			console.log('+++ dailyemerald.com passes!',res.responseTime)
		}
	}
});

checkSite({
	url: 'http://dailyemerald.com/wp-login.php',
	suite: [
		{selector: 'form',  hasAtLeast: 1},
		{selector: 'input', hasAtLeast: 3}
	],
	callback: function(res) {
		if (res.result == 'failure') {
			notify('ivar@ivarvong.com', res.data);
			console.log('--- ODE WP login fails',res.responseTime)
		} else {
			console.log('+++ ODE WP login passes!',res.responseTime)
		}
	}
})

checkSite({
	url: 'http://thegarage.dailyemerald.com/',
	suite: [
		{selector: 'h1', hasAtLeast: 5},
		{selector: '#flag', hasAtLeast: 1}
	],
	callback: function(res) {
		if (res.result == 'failure') {
			notify('ivar@ivarvong.com', res.data);
			console.log("--- THEGARAGE", 'fails :(',res.responseTime)
		} else {
			console.log("+++ THE GARAGE", 'passes!',res.responseTime)
		}
	}
})