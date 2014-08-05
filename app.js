var geocoder = require('geocoder'),
    forecast = require('forecast'),
	request = require('request'),
	http = require('http'),
	https = require('https'),
	storage = require('node-persist'),
    irc = require('irc'),
    fs = require('fs');

var config = {
	channels: ["#bottest"],
	server: "irc.freenode.net",
	botName: "DNbot"
};

var bot = new irc.Client(config.server, config.botName, {
	channels:config.channels
});

storage.initSync();
if(!storage.getItem('featureRequests')) {
  storage.setItem('featureRequests', "{}");
}

// does this work?
var arguments = process.argv.splice(2);
if(arguments[0] == 'debug') {
  config.channels = ["#bottest"];
}

function resetLogs(){
  fs.writeFile('logs.txt', "");
}
function getLogs(){

}
function setLog(foo, bar){
  var time = new Date().toTimeString();
  var logMsg = foo + " => " + bar + " (" + time + ")\n";
  fs.appendFile("logs.txt", logMsg, function(error){
    if (error) throw error;
  });
}

bot.on("message", function(from, to, text, message) {
  setLog(from, text);

  if(text.charAt(0) == "!"){
    var input = text.split(" ");
    var key = input[0].slice(1).toLowerCase();

    if(key == "weather"){
      if(input[1] == undefined){
        bot.say(config.channels[0], "Please enter a location for the weather");
      }else{
        getWeather(input[1]);
      }
    } else if(key == "motd" || key == "dnmotd"){
      getMOTD();
    } else if(key == "help"){
      getHelp(from);
    } else if(key == "btc"){
      getBtc();
    }
  }

  if(from=="conlinism" && text=="!features") {
      var featureRequests = storage.getItem('featureRequests');
      bot.say(from, featureRequests);
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
});
function botError() {
	bot.say(config.channels[0], "I'm sorry Dave, I'm afraid I can't do that...");
	return false;
}

/* ----------------- */
/* Send bot commands */
/* ----------------- */
function getHelp(user){
  bot.say(user, "Hi " + user + "! Here are my commands\n!motd - display the current DN MOTD\n!weather <zip,city,location> - tells you the weather in a location.\n!help - displays this help dialog\n!btc - returns the current bitcoin price\n!feature <feature request> - request a feature for the bot\n!set <setting> <option> - set various settings. Options: dribbble <username> - set your dribbble username. website <url> set your personal website.\n!dribbble - return your most recent followed shot (must have !set dribbble <username> before using)\n!gif <id> - get gif by id from Giphy\n!gifme <term> - returns a gif related to the term\n!gifsearch <term> - search for gif id's by term. Returned as PM.\n !whois <user> - return information set by a user with the !set command");
}

/* ------------------ */
/* Find bitcoin price */
/* ------------------ */
function getBtc(){
  request('https://coinbase.com/api/v1/prices/spot_rate', function(error, response, body){
     if(!error && response.statusCode == 200){
       var btc = JSON.parse(body);
       bot.say(config.channels[0], "The price of bitcoin is " + btc.amount +" "+ btc.currency);
     }
  });
}

/* -------------------------------- */
/* Designer News Message of the Day */
/* -------------------------------- */
function getMOTD(){
  request('http://news.layervault.com', function(error, response, body){
    if(!error && response.statusCode == 200){
      //console.log(body);
      var start=body.indexOf("MOTDMessageContent")+20;
      var end=body.indexOf("</span>", start);
      var foo=body.substring(start,end);
      foo = cleanUpHTML(foo);
      bot.say(config.channels[0], "DN MOTD: " + foo);
    }
  });
}
function cleanUpHTML(foo){
  // trying to avoid regular expresions
  var content = foo.replace("<p>"," ");
  content = content.replace("</p>"," ");
  content = content.replace("</a>"," ");
  content = content.replace("&#8220;"," ");
  content = content.replace("&#8221;"," ");
  var start = content.indexOf("<a");
  var end = content.indexOf(">", start)+1;
  var aTag = content.substring(start,end);
  content = content.replace(aTag, "");
  return content.trim();
}

/* ------------ */
/* WEATHER CODE */
/* ------------ */
var forecast = new forecast({
  service: 'forecast.io',
  key: 'ec6d3faead4349452c196fe958924eac',
  units: 'c',
  cache: true,
  ttl: {
    minutes: 27,
    seconds: 45
  }
});
function getWeather(location){
  geocoder.geocode(location, function(err, res){
    if(err || res.results[0] == undefined){
      bot.say(config.channels[0], "Sorry I can't find that location.");
      return false;
    } else { var foo = res.results[0].geometry.location; }

    forecast.get([foo.lat, foo.lng], function(error, weather){
      if(error){
        bot.say(config.channels[0], "Error fetching weather.");
        throw new Error(error);
      }

      var c = Math.floor(weather.currently.temperature),
          f = Math.floor(celToFah(c));
      bot.say(config.channels[0], "Weather in " + res.results[0].formatted_address + ": " + weather.currently.summary + " and " + c + "°C/" + f + "°F");
      bot.say(config.channels[0], weather.hourly.summary);
    });
  });
}
function celToFah(cel){
  return ((cel*9)/5)+32;
}

/* ------------------------------ */
/* Track connecting to the server */
/* ------------------------------ */
console.log("Now connecting...");
bot.on('registered', function(){
  console.log("Welcome to freenode!");
  resetLogs();
});
