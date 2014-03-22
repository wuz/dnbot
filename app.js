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

	if(text.substr(0,8)=="!github") {
		var url = 'https://github.com/trending';

		request(url, function(err, resp, body){
			$ = cheerio.load(body);
			bot.say(config.channels[0], "The top repos are:");
			var strToSay = "";
			$(".repo-leaderboard-list-item").each(function() {
				strToSay += $(".repository-name .owner-name", this).text()+$(".repository-name .separator", this).text()+$(".repository-name strong", this).text()+": https://github.com"+$(".repository-name", this).attr("href")+"\n";
			});
			bot.say(config.channels[0], strToSay);
		});
	}

	if(text.substr(0,6)=="!help") {
		bot.say(from, "Hi "+from+"! Here are my commands\n!motd - display the current DN MOTD\n!weather <zip,city,location> - tells you the weather in a location.\n!help - displays this help dialog\n!btc - returns the current bitcoin price\n!feature <feature request> - request a feature for the bot\n!set <setting> <option> - set various settings. Options: dribbble <username> - set your dribbble username. website <url> set your personal website.\n!dribbble - return your most recent followed shot (must have !set dribbble <username> before using)\n!gif <id> - get gif by id from Giphy\n!gifme <term> - returns a gif related to the term\n!gifsearch <term> - search for gif id's by term. Returned as PM.\n !whois <user> - return information set by a user with the !set command\n !8ball <question> - answers your question with an 8ball.\n!github - returns the trending github repos for the week.");
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

	if(text.substr(0,4)=="!set") {
		if(text.substr(5,8)=="dribbble") {
			var currentUser = storage.getItem(from)?storage.getItem(from):"{}";
			userVars = JSON.parse(currentUser);
			userVars.dribbble = text.substr(14);
			storage.setItem(from, JSON.stringify(userVars));
		}
		if(text.substr(5,7)=="website") {
			var currentUser = storage.getItem(from)?storage.getItem(from):"{}";
			userVars = JSON.parse(currentUser);
			userVars.website = text.substr(13);
			storage.setItem(from, JSON.stringify(userVars));
		}
		if(text.substr(5,7)=="twitter") {
			var currentUser = storage.getItem(from)?storage.getItem(from):"{}";
			userVars = JSON.parse(currentUser);
			userVars.twitter = text.substr(13);
			storage.setItem(from, JSON.stringify(userVars));
		}
	}

	if(text.substr(0,6)=="!whois") {
		var user = storage.getItem(text.substr(7))?storage.getItem(text.substr(7)):"{}";
		var userVars = JSON.parse(user);
		var userIs = text.substr(7)+" is:\n";
		for (var key in userVars) {
			if (userVars.hasOwnProperty(key)) {
				userIs += key+": "+userVars[key]+"\n";
			}
		}
		bot.say(config.channels[0], userIs)
	}

	if(text.substr(0,9)=="!dribbble") {
		var currentUser = storage.getItem(from);
		userVars = JSON.parse(currentUser);
		if(!userVars.dribbble) {
			botError();
		}
		var url = "http://api.dribbble.com/players/"+userVars.dribbble+"/shots/following";
		http.get(url, function(res) {
			var body = '';
			res.on('data', function(chunk) {
				body += chunk;
			});
			res.on('end', function() {
				var dribbbleResponse = JSON.parse(body);
				if(dribbbleResponse) {
					bot.say(config.channels[0],dribbbleResponse.shots[0].title+": "+dribbbleResponse.shots[0].short_url+" | "+dribbbleResponse.shots[0].image_url);
				} else {
					botError();
				}
			});
		}).on('error', function(e) {
			console.log("Got error: ", e);
		});
	}

	if(text.substr(0,5)=="!nick") {
		bot.say(config.channels[0], "/nick DNBOT1");
	}

	if(text.substr(0,6)=="!gifme") {
		var giphy_url = "http://api.giphy.com/v1/gifs/random?api_key=dc6zaTOxFJmzC&tag="+encodeURIComponent(text.substr(6));
		http.get(giphy_url, function(res) {
			var body = '';
			res.on('data', function(chunk) {
				body += chunk;
			});
			res.on('end', function() {
				var dataResponse = JSON.parse(body);
				if(dataResponse) {
					bot.say(config.channels[0],dataResponse.data.image_original_url);
				} else {
					botError();
				}
			});
		}).on('error', function(e) {
			console.log("Got error: ", e);
		});
	}

	if(text.substr(0,10)=="!gifsearch") {
		var giphy_url = "http://api.giphy.com/v1/gifs/search?api_key=dc6zaTOxFJmzC&q="+encodeURIComponent(text.substr(11))+"&limit=10";
		http.get(giphy_url, function(res) {
			var body = '';
			res.on('data', function(chunk) {
				body += chunk;
			});
			res.on('end', function() {
				var dataResponse = JSON.parse(body);
				console.log(dataResponse);
				if(dataResponse.data) {
					for(i=0;i<dataResponse.data.length;i++) {
						bot.say(from,dataResponse.data[i].id+" | "+dataResponse.data[i].images.fixed_height.url);
					}
				} else {
					botError();
				}
			});
		}).on('error', function(e) {
			console.log("Got error: ", e);
		});
	}

	if(text.substr(0,4)=="!gif" && text.substr(0,6)!="!gifme" && text.substr(0,10)!="!gifsearch") {
		var giphy2_url = "http://api.giphy.com/v1/gifs/"+encodeURIComponent(text.substr(5))+"?api_key=dc6zaTOxFJmzC";
		http.get(giphy2_url, function(res) {
			var body = '';
			res.on('data', function(chunk) {
				body += chunk;
			});
			res.on('end', function() {
				var dataResponse = JSON.parse(body);
				if(dataResponse.data) {
					bot.say(config.channels[0],dataResponse.data.images.original.url);
				} else {
					botError();
				}
			});
		}).on('error', function(e) {
			console.log("Got error: ", e);
		});
	}


	if(text.substr(0,6)=="!8ball") {
		var arr = ["Try again later.", "The future is cloudy.", "It's not a no.", "Maybe?", "Yes.", "No"];
		bot.say(config.channels[0], arr[Math.floor(Math.random() * (arr.length + 1))]);
	}
});