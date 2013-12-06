var fs = require('fs');
var http = require('http');
var wait = require('../../waitfor');

//------------------------------
// TEST APP - dummy ajax server
//------------------------------

function longAsyncFn(inputData,callback){

  var data = {
    start: new Date().getTime()
  };
  //simulate ocassional error
  var err = Math.random()>0.8? new Error('The ocassional error, Math.random()>0.8') : null;
  //simulate a long async operation
  var sleep=1000+ Math.floor(Math.random()*3000);
  //console.log(sleep);
  setTimeout( function() {
      data.end = new Date().getTime();
      data.text = 'here it is: '+inputData;
      data.duration = data.end-data.start;
      callback(err,data);
      }
      ,sleep);
}

// REQUEST HANDLER (generator, sequential)
function* handler(req,res){  // function* => generator

    try {

      console.log('request for',req.url);
      var url = req.url;
      var pos=url.lastIndexOf("/");
      if (pos>0){ //more than one /
        var param=parseInt(url.substr(pos+1));
        url = url.substr(0,pos);
      }

      switch(url){

        case "/": //main page
            res.writeHead(200, {'Content-Type': 'text/html'});
            return res.end( yield [fs.readFile,'page.html','utf8'] );
            break;

        case "/client.js": //serve client jscript
          return res.end(yield [fs.readFile,'client.js','utf8']);

        case "/longAsyncOper": //ajax call
          try{
            hardToGetData = yield wait.for(longAsyncFn,'some data');
            return res.end ( JSON.stringify({data:{order:param,content:hardToGetData}}) );
          }
          catch(err){
            return res.end ( JSON.stringify({err:{order:param, message:err.message}}));
          }

        default:
            res.statusCode=404;
            return res.end (); 

      }

    }
    catch(err){
      res.end('async ERROR catched: '+err.message);
    }
  }

//----------------
// Main

var server = http.createServer(
  function(req, res){
    console.log('req!');
    wait.launchFiber(handler,req,res); //handle requests in a "fiber"(generator), allowing sequential programming by yield
  }).listen(8000);
  
console.log('server started on port', 8000);

