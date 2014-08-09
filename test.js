var https = require('https');
var fs = require('fs');
function resetFeatures(){
  fs.writeFile('features.txt', '');
}
function getFeatures(){
  fs.readFile('features.txt', {encoding: 'utf8'}, function(err, data){
    if (err) throw err;
    data = data.replace(/\n/g, '\\n');
    getGist(data)
  });
}
function setFeature(foo, bar){
  var time = new Date().toTimeString();
  var logMsg = time + ": " + foo + " => " + bar + "\n";
  fs.appendFile("features.txt", logMsg, function(error){
    if (error) throw error;
  });
}
function getGist(logs){
  var body = "";
  var options = {
    hostname: 'api.github.com',
    path: '/gists',
    method: 'POST',
    headers: {
      'User-Agent': 'Node.js'
    }
  }

  var reqOptions = '{"description":"test gist", "public": true, "files": {"logs.txt":{"content": "'+ logs +'"}}}';
  var req = https.request(options, function(res){
    res.setEncoding('utf8');
    res.on('data', function(chunk){ body+=chunk });
    res.on('end', function(){
      var body2 = JSON.parse(body);
      console.log(body2.html_url);
    });
  });

  req.write(reqOptions);
  req.on('error', function(e){
    console.log('problem with the request: ' + e.message);
  });
  req.end();
}
getLogs();
