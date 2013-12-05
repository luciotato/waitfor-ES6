var fs = require('fs');
var http = require('http');
var wait = require('./waitfor');

//------------------------------
// TEST APP - dummy blog server
//------------------------------

function formatPost(post){
  var lines=post.split('\n');
  var result = '<h1>'+lines[0]+'</h1>'
              + '<h2>'+lines[1]+'</h2>';
  for(var i=2;i<lines.length;i++)
      result +='<p>'+lines[i]+'</p>';
  
  return result;
}

function composeTemplate(css, template){
  var composed=template.replace('{{ css }}', css);
  return composed;
}

function applyTemplate(template, content){
  return template.replace('{{ content }}', content);
}

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

        case "/favicon.ico":
          return res.end();

        case "/waitfor-demo-client.js": //server client jscript
          return res.end(yield [fs.readFile,'waitfor-demo-client.js','utf8']);

        case "/longAsyncOper": //ajax call
          try{
            hardToGetData = yield wait.for(longAsyncFn,'some data');
            return res.end ( JSON.stringify({data:{order:param,content:hardToGetData}}) );
          }
          catch(err){
            return res.end ( JSON.stringify({err:{order:param, message:err.message}}));
          }

        case "/": //blog server
          res.writeHead(200, {'Content-Type': 'text/html'});
          var start = new Date().getTime();
          //console.log(start);

          //read css, wait.for syntax:
          var css = yield wait.for(fs.readFile,'style.css','utf8');

          //read post, fancy syntax:
          var content = yield [fs.readFile,'blogPost.txt','utf8'];

          //compose  template, fancy syntax, as parameter:
          var template = composeTemplate ( css, yield [fs.readFile,'blogTemplate.html','utf8'] );

          console.log('about to call hardToGetData...');

          //call async, wait.for syntax, in a expression
          var hardToGetData = yield wait.for(longAsyncFn,'some data');
          console.log('hardToGetData=',hardToGetData);

          return res.end( applyTemplate(template, formatPost ( content + JSON.stringify(hardToGetData)) ) );

        default:
          return res.end ( '404 '+ req.url + ' not valid');

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

