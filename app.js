// Chat bot for #DN on irc.freenode.net
//
// TODO:
// 1. vines https://github.com/starlock/vino/wiki/API-Reference
// 2. youtube titles
// 3. google
// 4. imdb
// 5. !whois
// 6. !help
// 7. !tell
// 8. !seen
// 9. get real gif api key
// 10. !twitter = your last tweet
//
// DOING:

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
  first_seen: Date,
  last_seen: Date,
  social:{
    twitter: String,
    website: String,
    dribble: String
  },
  favorite_gif: String,
  points: Number,
  points_left: Number,
  quotes: Array
});
var User = mongoose.model('User', userSchema);


/* -------------- */
/* Initialize bot */
/* -------------- */
var bot = new irc.Client(config.server, config.botName, {
    channels:config.channels
});

/* ------------------------------ */
/* Track connecting to the server */
/* ------------------------------ */
console.log("Now connecting...");
bot.on('registered', function(){
  console.log("Welcome to freenode!");
  resetLogs();
});

/* -------------------------- */
/* Check user for first visit */
/* -------------------------- */
bot.on('join#bottest', function(nick, message){
  var user = nick.toLowerCase();
  User.findOne({'name': user }, function(err, person){
    if (err) return handleError(err);

    if(person == null){
      welcomeMessage(nick);
      var date = new Date();
      var newUser = new User({name: user, first_seen: date, points: 0,  points_left: 1});
      newUser.save(function(err, data){ if (err) return console.log(err); });
      console.log("New user: " + user + "!");
    } else {
      console.log("Welcome back " + user + "!");
    }
  });
});



/* ------------- */
/* Main function */
/* ------------- */
bot.on("message", function(from, to, text, message) {
  setLog(from, text);
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
    } else if(key == 'gifme'){
      findGif(input);
    } else if(key == 'gif'){
      findGif(input);
    } else if(key == 'trending'){
      trendingGif(input[1]);
    } else if(key == 'setgif'){
      setFavGif(from, input[1]);
    } else if(key == 'twitter'){
      twitter(from, input);
    } else if(key == 'dribble'){
      dribble(from, input);
    } else if(key == 'website'){
      website(from, input);
    } else if(key == 'social'){
      social(from, input);
    } else if(key == 'logs'){
      getLogs();
    } else if(key == 'feature'){
      feature(from, input);
    } else if(key == 'features'){
      feature(from, input);
    }
  }
  pingTheBot(input);
});

/* ------------------------- */
/* Introduce user to channel */
/* ------------------------- */
function welcomeMessage(user){
  bot.say(user, 'Welcome to the Designer News chatroom ' + user + "! Be sure to set up your info so we can network online.");
  bot.say(user, ' ');
  bot.say(user, 'Type !twitter add [@handle] to add your twitter handle.');
  bot.say(user, 'Type !dribble add [https://dribble.com/profile] to add your dribble profile.');
  bot.say(user, 'Type !website add [https://news.layervault.com/] to add your personal site.');
  bot.say(user, ' ');
  bot.say(user, 'Access any of this information again by typing !aboutme or !whois [user].');
  bot.say(user, 'For more bot commands, please type !help');
}
/* ----------------- */
/* Log chat messages */
/* ----------------- */
function resetLogs(){
  fs.writeFile('logs.txt', "");
}
function getLogs(){
  fs.readFile('logs.txt', {encoding: 'utf8'}, function(err, data){
    if (err) throw err;
    data = data.replace(/\n/g, '\\n');
    getGist(data, 'logs.txt');
  });
}
function setLog(foo, bar){
  var time = new Date().toTimeString();
  var logMsg = time + ": " + foo + " => " + bar + "\n";
  fs.appendFile("logs.txt", logMsg, function(error){
    if (error) throw error;
  });
}
/* ------------- */
/* Create a gist */
/* ------------- */
function getGist(logs, file){
  var body = "";
  var gistHead = "";
  var options = {
    hostname: 'api.github.com',
    path: '/gists',
    method: 'POST',
    headers: {
      'User-Agent': 'Node.js'
    }
  }
  if (file == "logs.txt"){
    gistHead = "Designer News chat logs";
  } else if (file == "features.txt"){
    gistHead = "New feature requests";
  }
  var reqOptions = '{"description":"'+ gistHead +'", "public": true, "files": {"'+ file +'":{"content": "'+ logs +'"}}}';
  console.log(reqOptions);
  var req = https.request(options, function(res){
    res.setEncoding('utf8');
    res.on('data', function(chunk){ body+=chunk });
    res.on('end', function(){
      var body2 = JSON.parse(body);
      console.log(body2);
      bot.say(config.channels[0], body2.html_url);
    });
  });

  req.write(reqOptions);
  req.on('error', function(e){
    console.log('problem with the request: ' + e.message);
  });
  req.end();
}
/* ---------------- */
/* Feature requests */
/* ---------------- */
function feature(user, args){
  var body = "";
  if(args[1] == undefined){
    getFeatures();
  } else {
    for(var i=1; i<args.length; i++){
      body += args[i] + " ";
      console.log(body);
      setFeature(user, body);
    }
  }
}
function getFeatures(){
  fs.readFile('features.txt', {encoding: 'utf8'}, function(err, data){
    if (err) throw err;
    console.log(data);
    data = data.replace(/\n/g, '\\n');
    getGist(data, 'features.txt');
  });
}
function setFeature(foo, bar){
  var time = new Date().toTimeString();
  var featureMsg = foo + " requests: " + bar + "\n";
  fs.appendFile("features.txt", featureMsg, function(error){
    if (error) throw error;
  });
}
function resetFeatures(){
  fs.writeFile('features.txt', '');
}
/* ------------------- */
/* Display social info */
/* ------------------- */
function social(user, args){
  if(args[1] == undefined){
    User.findOne({'name':user}, function(err,person){
      if (err) return handleError(err);
      bot.say(config.channels[0], "Website: "+ person.social.website +" \n Twitter: "+ person.social.twitter +" \n Dribble: "+ person.social.dribble);
    });
  } else {
    User.findOne({'name':args[1]}, function(err, person){
      if (err) return handleError(err);
      if(person != null){
        bot.say(config.channels[0], args[1]+"\'s Website: "+ person.social.website +" \n "+args[1]+"\'s Twitter: "+ person.social.twitter +" \n "+args[1]+"\'s Dribble: "+ person.social.dribble);
      } else {
        bot.say(config.channels[0], "Sorry I can't find that user.");
      }
    });
  }
}
/* ------------------------- */
/* Find and set website info */
/* ------------------------- */
function website(user, args){
  if(args[1] == undefined){
    User.findOne({'name':user}, function(err,person){
      if (err) return handleError(err);
      bot.say(config.channels[0], person.social.website);
    });
  } else if (args[1] == "add") {
    User.findOne({'name':user}, function(err,person){
      if (err) return handleError(err);
      person.social.website = args[2];
      person.save(function(err, data){
        if (err) return handleError(err);
        bot.say(config.channels[0], "Your website is now " + args[2]);
      });
    });
  } else {
    User.findOne({'name':args[1]}, function(err, person){
      if (err) return handleError(err);
      if(person != null){
        bot.say(config.channels[0], args[1]+"'s website is "+person.social.website);
      } else {
        bot.say(config.channels[0], "Sorry I can't find that user.");
      }
    });
  }
}
/* ------------------------- */
/* Find and set dribble info */
/* ------------------------- */
function dribble(user, args){
  if(args[1] == undefined){
    User.findOne({'name':user}, function(err,person){
      if (err) return handleError(err);
      bot.say(config.channels[0], person.social.dribble);
    });
  } else if (args[1] == "add") {
    User.findOne({'name':user}, function(err,person){
      if (err) return handleError(err);
      person.social.dribble = args[2];
      person.save(function(err, data){
        if (err) return handleError(err);
        bot.say(config.channels[0], "Your dribble profile is now " + args[2]);
      });
    });
  } else {
    User.findOne({'name':args[1]}, function(err, person){
      if (err) return handleError(err);
      if(person != null){
        bot.say(config.channels[0], args[1]+"'s dribble profile is "+person.social.dribble);
      } else {
        bot.say(config.channels[0], "Sorry I can't find that user.");
      }
    });
  }
}
/* ------------------------- */
/* Find and set twitter info */
/* ------------------------- */
function twitter(user, args){
  if(args[1] == undefined){
    User.findOne({'name':user}, function(err,person){
      if (err) return handleError(err);
      bot.say(config.channels[0], person.social.twitter);
    });
  } else if (args[1] == "add") {
    User.findOne({'name':user}, function(err,person){
      if (err) return handleError(err);
      person.social.twitter = args[2];
      person.save(function(err, data){
        if (err) return handleError(err);
        bot.say(config.channels[0], "Your twitter handle is now " + args[2]);
      });
    });
  } else {
    User.findOne({'name':args[1]}, function(err, person){
      if (err) return handleError(err);
      if(person != null){
        bot.say(config.channels[0], args[1]+"'s twitter handle is "+person.social.twitter);
      } else {
        bot.say(config.channels[0], "Sorry I can't find that user.");
      }
    });
  }
}
/* ----------------------- */
/* Set user's favorite gif */
/* ----------------------- */
function setFavGif(user, gif){
  User.findOne({'name':user}, function(err, person){
    if (err) return handleError(err);
    if(gif != undefined){
      person.favorite_gif = gif;
      person.save();
      bot.say(config.channels[0], 'Gif saved!');
    } else {
      bot.say(config.channels[0], 'Please enter a gif to save.');
    }

  });
}
/* --------------- */
/* Find random gif */
/* --------------- */
function findGif(words){
  words.shift();
  var input = words.join("+");

  // API DOCS : https://github.com/giphy/GiphyAPI
  var url = "http://api.giphy.com/v1/gifs/random?api_key=dc6zaTOxFJmzC&tag=" + input;

  http.get(url, function(res){
    var body = '';
    res.on('data', function(chunk){
      body += chunk;
    });
    res.on('end', function(){
      var data = JSON.parse(body);

      if (input == ""){
        trendingGif(null);
      } else {
        if(data.data.image_url == undefined){
          bot.say(config.channels[0], "No results.");
        } else {
          //tags below gifs
          //var tags = data.data.tags.join(", ");
          //bot.say(config.channels[0], tags);
          bot.say(config.channels[0], data.data.image_url);
        }
      }
    });
  });
}
/* -------------------------- */
/* Get one gif of the top 100 */
/* -------------------------- */
function trendingGif(num){
  http.get("http://api.giphy.com/v1/gifs/trending?api_key=dc6zaTOxFJmzC&limit=100", function(res){

    console.log(num);
    var body = '';
    var rand = Math.floor(Math.random()*100)-1;
    res.on('data', function(chunk){
      body += chunk;
    });
    res.on('end', function(){
      var data = JSON.parse(body);
  //console.log(rand);
      if(num != undefined && num >= 0 && num < 100){
        bot.say(config.channels[0], data.data[num].images.original.url);
        bot.say(config.channels[0], "Trending gif #"+num);
      } else {
        bot.say(config.channels[0], data.data[rand].images.original.url);
        bot.say(config.channels[0], "Trending gif #"+rand);
      }
    });
  });
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
/* ------------------------------------------ */
/* Returns funny messages when you ping dnbot */
/* ------------------------------------------ */
function pingTheBot(words){
  var msg = ['does a backflip', 'hates all of you', 'loves you all', 'can\'t get laid', 'won the lottery', 'is not amused', 'waves hello :)'];
  var length = msg.length;
  var rand = Math.floor(Math.random()*length);
  words.forEach(function(word){
    var foo = word.toLowerCase();
    if(foo=="dnbot"){
      bot.action(config.channels[0], msg[rand]);
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
