"use strict";
var util = require("util");
var fs = require('fs'), dns = require("dns");
var wait = require("../waitfor");


// ----------------------
// DNS TESTS -------------
// ----------------------

function* sequential_resolve_reverse_ES6(hostname){
    console.log('T2: wait dns.resolve4',hostname);
    var addresses = yield [dns.resolve4, hostname];
    console.log('T2:',addresses.length, "addresses");
    for( let i=0; i<addresses.length; i++) {
        var a=addresses[i];
        console.log("T2: reverse for " + a + " is " + JSON.stringify( yield [dns.reverse,a] ));
    }
}


function* showReverse(title, addr){
    console.log(title+": reverse for " + addr + ": " + JSON.stringify(yield [dns.reverse,addr]));
}

function* sequential_resolve_parallel_reverse(hostname){

    console.log('T1: wait dns.resolve4 ',hostname);
    var addresses = yield wait.for(dns.resolve4,hostname);
    console.log('T1:',addresses.length,'addresses:',JSON.stringify(addresses));
    for (var i = 0; i < addresses.length; i++) {
        wait.launchFiber(showReverse,'T1',addresses[i]);
    };
}


// ----------------------
// OBJECT TESTS ---------
// ----------------------
function Constructor(value,pong){
    this.value = value;
    this.pong = pong;
}

Constructor.prototype.think=function(callback){
  if (!this) {
    var errMsg='ERR: this is null, at: Constructor.prototype.think';
    console.log(errMsg);
    callback(new Error(errMsg));
  } 
  else {
    console.log('thinking...');
    var self=this;
    // callback after 1.5 secs
    setTimeout(function(){
        callback(null, 'the answer is: '+self.value)}
        ,Math.floor(Math.random()*400)+200);
  }
};

Constructor.prototype.pingPong=function(ping,callback){
    // callback before return
    callback(null, ping+'...'+this.pong);
}


var theAnswer = new Constructor(42,'tomeito');
var theWrongAnswer = new Constructor('a thousand','tomatito');


// -------------------
// RUN TESTS (Fiber)--
// -------------------
function* runTests(){

    console.log('----------------------------------');
    console.log('T1: sequential_resolve_reverse_ES6');
    console.log('T2: resolve, then parallel reverse');
    console.log('T3: METHOD TEST (passing "this" to object methods)');
    console.log('--------------------------------');
    console.log('.');
    console.log('.');

    wait.launchFiber(sequential_resolve_reverse_ES6, 'www.google.us'); //T1

    wait.launchFiber(sequential_resolve_parallel_reverse, 'google.com'); //T2

    console.log(yield wait.forMethod(theAnswer,'think'));
    console.log(yield wait.forMethod(theWrongAnswer,'think'));
    
    console.log(yield wait.forMethod(theAnswer,'pingPong','tomato'));
    console.log(yield wait.forMethod(theWrongAnswer,'pingPong','pera'));


}

// MAIN
try{
    wait.launchFiber(runTests);
} 
catch(e){
    console.log("Error: " + e.message);
};
