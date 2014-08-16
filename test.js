var google = require('google');
function googleSearch(query){
  var body = "";
  google.resultsPerPage = 1;
  for(var i=1; i<query.length; i++){
    body += query[i] + " ";
  }
  google(body, function(err, next, links){
    console.log(links[0]);
  });
}
googleSearch(['!google', 'hello', 'world']);
