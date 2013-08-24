var fs = require('fs');
var http = require('http');

//------------------------------
// LIB PART

var Wait={};

Wait.launchFiber = function(generatorFn){ //,arg1,arg2...

    // helper function, call the async, using theCallback as callback
    function callTheAsync(FunctionAndArgs,theCallback){
        // prepare arguments
        var argsOnly=Array.prototype.slice.call(FunctionAndArgs,1); // remove function from args & convert to Array
        argsOnly.push(theCallback); //add callback to arguments
        // start the asyncFn
        FunctionAndArgs[0].apply(null, argsOnly); // call the asyncFn, (strict: this=null)
    }

    // launchFiber :

    // create the iterator
    var newargs=Array.prototype.slice.call(arguments,1); // remove generatorFn from args
    var thisIterator = generatorFn.apply(null, newargs); // create the iterator. 
                       // Note: calling a generator function, DOES NOT execute it.
                       // just creates an iterator

    // create a closure to act as callback for the async calls in this iterator
    // this callback will RESUME the generator, returning 'data' as the result of the 'yield' keyword
    thisIterator.defaultCallback=function(err,data){

          // on callback:
          // console.log('on callback, err:',err,'data:',data);

          // if err, schedule a throw inside the generator, and exit.
          if (err) return thisIterator.throw(err);

          // data:        
          // return data as the result of the yield keyword,
          // and RESUME the generator. (we store the result of resuming the generator in 'nextPart')
          var nextPart = thisIterator.next(data);  // thisIterator.next => RESUME generator, data:->result of 'yield'
      
          //after the next part of the generator runs...
          if (nextPart.done) //the generator function has finished (executed "return")
              return; //it was the last part, nothing more to do

          // else...
          // not finished yet. The generator paused on another yield,
          // with another call to: wait.for(asyncFn,arg1,arg2...)
          // so in nextPart.value we have wait.for's arguments
          // Let's call the indicated async
          callTheAsync(nextPart.value, thisIterator.defaultCallback);
          // the async function callback will be handled by this same closure (thisIterator.defaultCallback) 
          // repeating the loop until nextPart.done
    };


    // launching the Fiber:
    // RUN first part of generator
    var firstPart = thisIterator.next(); //run first part upto a yield wait.for(...
    if (firstPart.done) return; //only one part, no 'yield' found

    // generator yielded, syntax is "yield wait.for(asyncFn,args...)", so yield send us the result of wait.for
    // The result of wait.for is wait.for's arguments.
    // Let's call the indicated async, using thisIterator.defaultCallback as callback
    callTheAsync(firstPart.value, thisIterator.defaultCallback); 
    // the async function callback will be handled by the above closure (thisIterator.defaultCallback) 
}

Wait.for = function(asyncFn){ //,arg1,arg2,...

    return arguments;

    // the syntax is: yield wait.for(asyncFn,arg1,arg2...)
    // so, the generator will yield wait.for's result (ie: it's arguments) 
    // to the calling function (launchFiber / defaultCallback)

    // given that wait.for is basically: function(){return arguments;}
    // then, the expression wait.for(asyncFn,arg1,arg2...) ~= [asyncFn,arg1,arg2...]
    // so, you can completely omit 'wait.for' and use
    // "the fancy syntax": yield [asyncFn, arg1, arg2...]
}


//------------------------------
// TEST APP - dummy blog server
//------------------------------

//wait = require('wait.for');
var wait=Wait; 

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

  var data = 'here it is: '+inputData;
  var err = Math.random()>0.8? new Error('The ocassional error, Math.random()>0.8') : null;
  
  //simulate a long operation
  setTimeout( function() {
      callback(err,data)}
      ,2000);
}

function* handler(req,res){  // function* => generator
    try{
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
      var hardToGetData = "\n" + start.toString().substr(-5) +"<br>" + ( yield wait.for(longAsyncFn,'some data') );

      console.log('hardToGetData=',hardToGetData);
      
      var end = new Date().getTime();

      hardToGetData += ', after '+(end-start)+' ms<br>';
      hardToGetData += end.toString().substr(-5);

      res.end( applyTemplate(template, formatPost ( content + hardToGetData) ) );

    }
    catch(err){
      res.end('ERROR: '+err.message);
    }
  }

//----------------
// Main

var server = http.createServer(
  function(req, res){
    console.log('req!');
    wait.launchFiber(handler,req,res); //handle in a generator (emulating a fiber)
  }).listen(8000);
  
console.log('server started on port', 8000);

