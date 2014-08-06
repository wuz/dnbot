// Chat bot for #DN on irc.freenode.net
//
// TODO:
// 1. Feature requests
// 2. Gifs
// 3. dnbot response array
//
// DOING:
// 1. Chat logs
// 2. !whois

var irc = require('irc'),
    geocoder = require('geocoder'),
    forecast = require('forecast'),
    request = require('request'),
    http = require('http'),
    https = require('https'),
    fs = require('fs'),
    MongoClient = require('mongodb').MongoClient,
    mongoose = require('mongoose'),
    format = require('util').format;

var config = {
    channels: ["#bottest"],
    server: "irc.freenode.net",
    botName: "DNbot"
};

/* ---------------------- */
/* Database configuration */
/* ---------------------- */
mongoose.connect('mongodb://localhost/test');
var db = mongoose.connection;

db.once('open', function callback (){
  console.log("Database established.")
});
db.on('error', console.error.bind(console, 'connection error:'));

var userSchema = mongoose.Schema({
  name: String,
  social:{
    twitter: String,
    website: String,
    dribble: String
  }
});
var User = mongoose.model('User', userSchema);


// Initialize bot
var bot = new irc.Client(config.server, config.botName, {
    channels:config.channels
});


// Checks user for first visit
// Work in progress
bot.on('join#bottest', function(nick, message){
  var user = nick.toLowerCase();

  User.findOne({'name': user }, function(err, person){
    if (err) return handleError(err);
    if(person == null){
      var newUser = new User({name: user});
      bot.say(nick, 'Welcome to the Designer News chatroom ' + nick + "!");

      // newUser.save(function(err, data){ if (err) return console.log(err); });
    } else {
      console.log("welcome back!");
    }
    console.log(person);
  })
});

// Log files
// Work in progress
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
  var input = text.split(" ");

  if(text.charAt(0) == "!"){
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
    } else if(key == 'choose'){
      choose(input);
    }
  }
  pingTheBot(input);

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

/* ------------------ */
/* Chooses one option */
/* ------------------ */
function choose(words){
  words.shift();
  var count = words.length;
  var answer = Math.floor(Math.random()*count);
  bot.say(config.channels[0], words[answer]);
  return words[answer];
}
/* ---------------------- */
/* Returns funny messages */
/* when you ping dnbot    */
/* Needs a message array  */
/* ---------------------- */
function pingTheBot(words){
  words.forEach(function(word){
    if(word=="dnbot"){
      bot.action(config.channels[0], 'does a backflip');
    }
  });
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
/* Weather Code */
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
