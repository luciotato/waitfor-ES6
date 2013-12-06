Wait.for-ES6
===========

Sequential programming for node.js *and the browser*, end of callback hell.

***Simple, straightforward abstraction.***

By using **wait.for**, you can call any nodejs standard async function in sequential/Sync mode, waiting for result data, 
without blocking node's event loop.

Definitions:
--
* A nodejs standard async function is a function in which the last parameter is a callback: function(err,data)
* A "fiber" in this context is a "generator" that yields async callable functions.


*Advantages:*
<ul>
<li> Avoid callback hell / pyramid of doom
<li> Simpler, sequential programming when required, without blocking node's event loop
<li> Simpler, try-catch exception programming. (default callback handler is: if (err) throw err; else return data)
<li> You can launch multiple parallel non-concurrent fibers.
<li> No multi-threaded debugging nightmares, only one fiber running at a given time.
<li> Can use any node-standard async function with callback(err,data) as last parameter.
<li> Plays along with node programming style. Write your async functions with callback(err,data), but use them in sequential/SYNC mode when required.
<li> Plays along with node cluster. You design for one thread/processor, then scale with cluster on multicores.
</ul>

- WARNING: Bleeding Edge -
--

This is a port of the original [Wait.for] (http://github.com/luciotato/waitfor),
now implemented using ***the upcoming*** javascript/ES6-Harmony generators.
It requires ***bleeding edge node v0.11.6, with --harmony command line option***

This lib is based on ECMAScript 6 "Harmony", the next version of the javascript standard, target release date December 2013.

This lib also uses bleeding edge V8 Harmony features, so you’ll need to use the latest (unstable) nodejs version (v0.11.6) and also pass the --harmony flag when executing node.

Example:

    cd samples/blogServer
    node --harmony server.js

Wait.for on stable Node
--
If you want to use ***wait.for*** but you can't use (unstable) node and/or ES6-Harmony
you can try the<br>
[Wait.for version based on node-fibers] (http://github.com/luciotato/waitfor),
which only requires node >= 0.5.2, and the stable package [node-fibers](https://github.com/laverdet/node-fibers)


Install: 
-
        npm install wait.for-es6 

Examples:
-
```javascript
// (inside a generator) call async function fs.readfile(path,enconding), 
// wait for result, return data
console.log('contents of file: ', yield wait.for(fs.readfile, '/etc/file.txt', 'utf8'));
```

DNS testing, *using pure node.js* (a little of callback hell):
```javascript
var dns = require("dns");
    
function test(){ 
	dns.resolve4("google.com", function(err, addresses) {
		if (err) throw err;
		for (var i = 0; i < addresses.length; i++) {
			var a = addresses[i];
			dns.reverse(a, function (err, data) {
				if (err) throw err;
				console.log("reverse for " + a + ": " + JSON.stringify(data));
			});
		};
	});
}

test();
```
***THE SAME CODE***, using **wait.for** (sequential): 
```javascript
var dns = require("dns"), wait=require('wait.for-es6');

function* test(){
	var addresses = yield wait.for(dns.resolve4,"google.com");
	for (var i = 0; i < addresses.length; i++) {
		var a = addresses[i];
		console.log("reverse for " + a + ": " + JSON.stringify( yield wait.for(dns.reverse,a)));
	}
}

wait.launchFiber(test); 
```
Alternative, **fancy syntax**, *omiting* **wait.for** (see [The funny thing is...](#the-funny-thing-is))
```javascript
var dns = require("dns"), wait=require('wait.for-es6');

function* test(){
    var addresses = yield [dns.resolve4, "google.com"];
    for( let i=0; i<addresses.length; i++)
        var a=addresses[i];
        console.log("reverse for " + a + ": " + JSON.stringify( yield [dns.reverse,a] ));
}
wait.launchFiber(test); 
```

Database example (pseudocode)
--
*using pure node.js* (a callback hell):
```javascript
var db = require("some-db-abstraction");

function handleWithdrawal(req,res){  
	try {
		var amount=req.param("amount");
		db.select("* from sessions where session_id=?",req.param("session_id"),function(err,sessiondata) {
			if (err) throw err;
			db.select("* from accounts where user_id=?",sessiondata.user_ID),function(err,accountdata) {
				if (err) throw err;
					if (accountdata.balance < amount) throw new Error('insufficient funds');
					db.execute("withdrawal(?,?)",accountdata.ID,req.param("amount"), function(err,data) {
						if (err) throw err;
						res.write("withdrawal OK, amount: "+ req.param("amount"));
						db.select("balance from accounts where account_id=?", accountdata.ID,function(err,balance) {
							if (err) throw err;
							res.end("your current balance is "  + balance.amount);
						});
    				});
				});
			});
		}
		catch(err) {
			res.end("Withdrawal error: "  + err.message);
	}
}
```
Note: The above code, although it looks like it will catch the exceptions, **it will not**. 
Catching exceptions with callback hell adds a lot of pain, and i'm not sure if you will have the 'res' parameter 
to respond to the user. If somebody like to fix this example... be my guest.


***THE SAME CODE***, using **wait.for** (sequential logic - sequential programming):
```javascript
var db = require("some-db-abstraction"), wait=require('wait.for-es6');

function* handleWithdrawal(req,res){  
	try {
		var amount=req.param("amount");
		sessiondata = yield wait.forMethod(db,"select","* from session where session_id=?",req.param("session_id"));
		accountdata = yield wait.forMethod(db,"select","* from accounts where user_id=?",sessiondata.user_ID);
		if (accountdata.balance < amount) throw new Error('insufficient funds');
		yield wait.forMethod(db,"execute","withdrawal(?,?)",accountdata.ID,req.param("amount"));
		res.write("withdrawal OK, amount: "+ req.param("amount"));
		balance = yield wait.forMethod(db,"select","balance from accounts where account_id=?", accountdata.ID);
		res.end("your current balance is "  + balance.amount);
		}
	catch(err) {
		res.end("Withdrawal error: "  + err.message);
}  
```

Note: Exceptions will be catched as expected. 
db methods (db.select, db.execute) will be called with this=db 

More examples:

* see  [blogServer] (http://github.com/luciotato/waitfor-ES6/tree/master/samples/blogServer) 
* see  [ajaxServer] (http://github.com/luciotato/waitfor-ES6/tree/master/samples/ajaxServer) 

Usage: 
-
```javascript
var wait=require('wait.for-es6');

// launch a new fiber 
wait.launchFiber(my_seq_function, arg,arg,...)

// fiber (generator)
function* my_seq_function(arg,arg...){
    // call async_function(arg1), wait for result, return data
    var myObj = yield wait.for(async_function, arg1); 
    // call myObj.querydata(arg1,arg2), wait for result, return data
    var myObjData = yield wait.forMethod(myObj,'queryData', arg1, arg2);
    console.log(myObjData.toString());

    // call async function fs.readfile(path,enconding), wait for result, return data
    console.log('contents of file: ' yield [ fs.readfile, path, enconding ]);
}

// fiber (generator)
function* handler(req,res){
    res.end ( markdown ( yield [ fs.readfile, 'post-'+req.query.postnum, 'utf8' ] );
}
```


The funny thing is...
--
After uploading the original **wait.for** based on node-fibers, several people ask me: "why not base it on ES6-Harmony generators?". So I started looking for information on such a migration. 
After a quick search, the migration did not seem possible:
(According to this: http://stackoverflow.com/questions/18293563/can-node-fibers-be-implemented-using-es6-generators
and this: http://calculist.org/blog/2011/12/14/why-coroutines-wont-work-on-the-web)

However, the basic building blocks of ES6 generators are the same for the concept of fibers, 
so I started trying to port **wait.for** to ES6...

It didn't looked good, ***but it went much better than expected!***

The funny thing is, the implementation of the core function ***wait.for(async,arg...)***, using ES6 generators is:

```javascript
wait.for = function( asyncFn ) { return arguments; }
```
Yes, just return arguments.

Compare it to **wait.for** based on node-fibers:

```javascript
wait.for = function(asyncFn){ 
        var newargs=Array.prototype.slice.call(arguments,1); // remove function from args
        return Wait.applyAndWait(null,fn,newargs); 
    }
```

**wait.for** based on node-fibers *actually does something*: calls ***Wait.applyAndWait*** 

In contrast ES6 based implementation of **wait.for(asyncFn)** does basically nothing (the magic control flow resides in *yield*)

You use ***wait.for*** inside a generator (function*) in conjunction with new JS/ES6 ***yield*** keyword, as in:

```javascript
var data = yield wait.for ( fs.readFile, '/etc/somefile' );
```

<h3>Surprisingly, ES6 generators-based implementation of <i>function wait.for(asyncFn)</i> 
is almost a no-op, you can even omit it...</h3></blockquote>

Given that evaluating ***wait.for*** return its arguments, the call can be replaced with an object literal, which is an array-like object. It results that:
```javascript

wait.for( asyncFn, arg1, arg2 )  // return arguments
=== {0:asyncFn, 1:arg1, 2:arg2 } // is equivalent to...
~= [ asyncFn, arg1, arg2 ] // is similar to...
```
so, the following two snippets are equivalent (inside a generator launched via ***wait.launchFiber(generator)***):

```javascript
// call an async function and wait for results, (wait.for syntax):
console.log( yield wait.for ( fs.readFile, '/etc/somefile', 'utf8' ) );

// call an async function and wait for results, (fancy syntax):
console.log( yield [ fs.readFile, '/etc/passwd', 'utf8' ] );
```


Roadmap
--

 * Parallel execution, launch one fiber for each array item, waits until all fibers complete execution.
   * **function parallel.map(arr,fn,callback)** return transformed array;
   * **function parallel.filter(arr,fn,callback)** return filtered array;
   * Status: *BETA* in complementary lib [parallel.js](http://github.com/luciotato/parallel-ES6)
