var Forecast = require('forecast'),
	geocoder = require('geocoder'),
	request = require('request'),
	cheerio = require('cheerio'),
	http = require('http'),
	https = require('https'),
	storage = require('node-persist');

storage.initSync();

if(!storage.getItem('featureRequests')) {
	storage.setItem('featureRequests', "{}");
}


var arguments = process.argv.splice(2);

var forecast = new Forecast({
  service: 'forecast.io',
  key: 'ec6d3faead4349452c196fe958924eac',
  units: 'c', // Only the first letter is parsed
  cache: true,      // Cache API requests?
  ttl: {           // How long to cache requests. Uses syntax from moment.js: http://momentjs.com/docs/#/durations/creating/
      minutes: 27,
      seconds: 45
    }
});



var config = {
	channels: ["#DN"],
	server: "irc.freenode.net",
	botName: "DNBOT"
};

if(arguments[0] == 'debug') {
	config.channels = ["#bottest"];
}

var irc = require("irc");
var bot = new irc.Client(config.server, config.botName, {
	channels:config.channels
});

function botError() {
	bot.say(config.channels[0], "I'm sorry Dave, I'm afraid I can't do that...");
	return false;
}

bot.addListener("message", function(from, to, text, message) {
	if(from=="conlinism" && text=="!features") {
		var featureRequests = storage.getItem('featureRequests');
		bot.say(from, featureRequests);
	}


	if(text.substr(0,8)=="!weather") {
		geocoder.geocode(text.substr(9), function ( err, data ) {
			if(err || !data.results[0]) {
				botError();
			}
			forecast.get([data.results[0].geometry.location.lat, data.results[0].geometry.location.lng], function(err, weather) {
				bot.say(config.channels[0],
					"It's currently "+parseInt(weather.currently.temperature, 10)+" degrees and "+weather.currently.summary+" in "+text.substr(9));
			});
		});
	}

	if(text.substr(0,6)=="!motd") {
		var url = 'http://news.layervault.com';

		request(url, function(err, resp, body){
			$ = cheerio.load(body);
			bot.say(config.channels[0], "DN MOTD: "+$('.MOTDMessageContent p').text().replace(/^\s+|\s+$/g,'')+" "+$('.MOTDCourtesy').text().replace(/^\s+|\s+$/g,''));
		});
	}

	if(text.substr(0,6)=="!help") {
		bot.say(from, "Hi "+from+"! Here are my commands\n!motd - display the current DN MOTD\n!weather <zip,city,location> - tells you the weather in a location.\n!help - displays this help dialog\n!btc - returns the current bitcoin price\n!feature <feature request> - request a feature for the bot");
	}

	if(text.substr(0,5)=="!btc") {
		var url = "https://coinbase.com/api/v1/prices/spot_rate";
		https.get(url, function(res) {
			var body = '';
			res.on('data', function(chunk) {
				body += chunk;
			});
			res.on('end', function() {
				var btcResponse = JSON.parse(body);
				if(btcResponse) {
					bot.say(config.channels[0],"The bitcoin price is "+btcResponse.amount+" "+btcResponse.currency);
				} else {
					botError();
				}
			});
		}).on('error', function(e) {
			console.log("Got error: ", e);
		});
	}

	if(text.substr(0,8)=="!feature" && text.substr(0,9)!="!features") {
		console.log("Feature Request!");
		var current = storage.getItem('featureRequests');


		var existFeatureRequests = JSON.parse(current);

		existFeatureRequests[Math.floor(Math.random() * (1000 - 1) + 1)+"-"+from] = text.substr(9);

		storage.setItem('featureRequests', JSON.stringify(existFeatureRequests));
		bot.say(from, "Feature request sent!");
	}


});