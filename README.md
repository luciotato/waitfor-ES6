Wait.for-ES6
===========

Sequential programming for node.js *and the browser*, end of callback hell.

Simple, straightforward abstraction.

By using **wait.for**, you can call any nodejs standard async function in sequential/Sync mode, waiting for result data, 
without blocking node's event loop

A nodejs standard async function is a function in which the last parameter is a callback: function(err,data)

Advantages:
* Avoid callback hell / pyramid of doom
* Simpler, sequential programming when required, without blocking node's event loop
* Simpler, try-catch exception programming. (default callback handler is: if (err) throw err; else return data)
* You can also launch multiple parallel non-concurrent fibers.
* No multi-threaded debugging nightmares, only one fiber running at a given time.
* Can use any node-standard async function with callback(err,data) as last parameter.
* Plays along with node programming style, you write your async functions with callback(err,data), but you can use them in sequential/SYNC mode when required.
* Plays along with node cluster. You design for one thread/processor, then scale with cluster on multicores.

- WARNING: Bleeding Edge -
--

This is a port of the original [Wait.for] (http://github.com/luciotato/waitfor),
implemented using ***the upcoming*** javascript/ES6-Harmony generators,
and it also requires ***bleeding edge unstable node v0.11.6, plus the --harmony command line option***

This lib is based on ECMAScript 6, which is the next version of the javascript standard, code-named "Harmony",
with a target release date of December 2013.

This lib also uses bleeding edge V8 Harmony features, so you’ll need to use the latest (unstable) nodejs version wich today is v0.11.6 
and also pass the --harmony flag when executing node.

Example:

    node --harmony waitfor-demo.js

stable Wait.for
--
If you want to use ***wait.for*** but you can't use (unstable) node and/or ES6-Harmony
you can try the<br>
[Wait.for version based on node-fibers] (http://github.com/luciotato/waitfor),
which only requires node >= 0.5.2, and the stable package [node-fibers](https://github.com/laverdet/node-fibers)


Install (not yet): 
-
        npm install wait.for-ES6 

Examples:
-

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
var dns = require("dns"), wait=require('wait.for-ES6');

function* test(){
	var addresses = yield wait.for(dns.resolve4,"google.com");
	for (var i = 0; i < addresses.length; i++) {
		var a = addresses[i];
		console.log("reverse for " + a + ": " + JSON.stringify( yield wait.for(dns.reverse,a)));
	}
}

wait.launchFiber(test); 
```
Alternative, **fancy syntax**:
```javascript
var dns = require("dns"), wait=require('wait.for-ES6');

function* test(){
	var addresses = yield [dns.resolve4, "google.com"];
	for (var i = 0; i < addresses.length; i++) {
		var a = addresses[i];
		console.log("reverse for " + a + ": " + JSON.stringify( yield [dns.reverse,a] ));
	}
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
var db = require("some-db-abstraction"), wait=require('wait.for');

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

Note: Exceptions will be catched as expected. (not fully tested yet, -bleeding edge-, remember?). 
db methods (db.select, db.execute) will be called with this=db 

More examples:

* see [tests.js] (http://github.com/luciotato/waitfor-ES6/blob/master/tests.js) for more examples
* see [waitfor-demo.js](http://github.com/luciotato/waitfor/blob/master/waitfor-demo.js.js) for a 
dummy blog server demo using sequential programming

Usage: 
-
```javascript
var wait=require('wait.for');

// launch a new fiber (emulated by a generator)
wait.launchFiber(my_seq_function, arg,arg,...)

// fiber (generator)
function* my_seq_function(arg,arg...){
    // call async_function(arg1), wait for result, return data
    var myObj = yield wait.for(async_function, arg1); 
    // call myObj.querydata(arg1,arg2), wait for result, return data
    var myObjData = yield wait.forMethod(myObj,'queryData', arg1, arg2);
    console.log(myObjData.toString());
}

// fiber (generator)
function* handler(req,res){
    res.end ( markdown ( yield [ fs.readfile, 'post-'+req.query.postnum, 'utf8' ] );
}
```


Roadmap
--

 * Parallel execution, launch one fiber for each array item, waits until all fibers complete execution.
   * **function parallel.map(arr,fn,callback)** return transformed array;
   * **function parallel.filter(arr,fn,callback)** return filtered array;
   * Status: ***WORKING PROTOYPES*** in [paralell-tests.js](http://github.com/luciotato/waitfor-ES6/blob/master/paralell-tests.js)
