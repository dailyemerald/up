var request = require('request')
  , jsdom = require('jsdom')
  , email = require('mailer')
  , credentials = require('./credentials')
  , fs = require('fs');

function checkSite(siteObj) {
	var url = siteObj.url
	  , suite = siteObj.suite
	  , callback = siteObj.callback
	
	var startTime = new Date();
	
	request({ uri: url }, function (error, response, body) {

   	  var responseTime = new Date() - startTime

	  if (error && response.statusCode !== 200) {
	    callback({
			'url': url,
			'result': 'failure', 
			'data': error, 
			'time': responseTime
		})
	  } 

	  jsdom.env({ html: body, scripts: ['http://code.jquery.com/jquery-1.5.min.js'] }, function (err, window) {
		
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
				'url': url,
				'result': 'success', 
				'data': [], 
				'time': responseTime
			})
		} else {
			callback({
				'url': url,
				'result': 'failure', 
				'data': failedTests, 
				'time': responseTime
			})
		}

	  }); //end of jsdom.env callback
	});	//end of request callback	
} //end of checkSite()

function notify(emailAddr, reason) {
	console.log('notify wants to email', email, 'about', reason)
	
	var lastSent = 0;
	try {
		lastSent = fs.readFileSync(emailAddr);
		lastSent = parseInt(lastSent.toString('ascii')); // this feels weird

		console.log(lastSent)
	} catch (e) {
		// no file, so let's move on. probabaly the first send.
	}
	
	var timeDiff = new Date() - lastSent;
	var thresholdToSendAgain = 1000*60*5 // 1000 ms/secs * 60 secs/min * (x) min
	
	if (timeDiff > thresholdToSendAgain) {
	
		console.log("SENDING EMAIL!");
	
		// http://docs.sendgrid.com/documentation/get-started/integrate/examples/nodejs-example-using-smtp/
		email.send({
		  host : "smtp.sendgrid.net",              
		  port : "25",                     
		  domain : "smtp.sendgrid.net",            
		  to : emailAddr,
		  from : "no-reply@dailyemerald.com",
		  subject : "SERVER DOWN",
		  body: "Hello! This is a test of the node_mailer.",
		  authentication : "login",      
		  username : credentials.username,      
		  password : credentials.password       
		}, function(err, result){
			if(err){ console.log(err); }
		
			var lastEmailSent = '' + Date.now();

			fs.writeFile(emailAddr, lastEmailSent, function (err) {
				if (err) throw err;
				console.log('It\'s saved!');
			});
		});
	} else {
		console.log((thresholdToSendAgain-timeDiff)/1000, "seconds until we can send again.")
	}
	
	
	
}

// --------------------
// now the fun begins
// --------------------

checkSite({
	url: 'http://dailyemerald.com/',
	suite: [
		{selector: 'a',   hasAtLeast: 1000},
		{selector: 'img', hasAtLeast: 100}
	],
	callback: function(res) {
		if (res.result == 'failure') notify(credentials.myemail, res.data);
	}
});

checkSite({
	url: 'http://dailyemerald.com/wp-login.php',
	suite: [
		{selector: 'form',  hasAtLeast: 1},
		{selector: 'input', hasAtLeast: 3}
	],
	callback: function(res) {
		if (res.result == 'failure') notify(credentials.myemail, res.data);
	}
})

checkSite({
	url: 'http://thegarage.dailyemerald.com/',
	suite: [
		{selector: 'h1', hasAtLeast: 5},
		{selector: '#flag', hasAtLeast: 1}
	],
	callback: function(res) {
		if (res.result == 'failure') notify(credentials.myemail, res.data);
	}
})