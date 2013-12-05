//"use strict";
var util = require("util");
var dns = require("dns");
var wait = require("./waitfor");

var parallel={};
wait.helper={};

wait.milliseconds = function(ms,callback){
    setTimeout(callback,ms); //call callback(null,null) in ms miliseconds
}

wait.helper.fiberForItem = function*(asyncItemFn,item,inx,result,finalCallback){
    try{
        var ms=Math.floor(Math.random()*1000);
        console.log('fiber',inx,'waiting',ms);
        yield [wait.milliseconds, ms];
        console.log('fiber',inx,'calling asyncItemFn on',item);
        var data = yield [asyncItemFn,item];
        console.log('arrived result',inx,data);
        result.arr[inx]=data;
        result.count++;
        if (result.count>=result.expected) { // last result, this fiber was the longer
            return finalCallback(null, result.arr) ; // final callback
        }
    }
    catch(err){
        console.log('fiberForItem catch(ERR) fiber',inx,err.message);
        return finalCallback(err,null); // final callback: err
    }
};

//async parallel map
parallel.map = function(arr,asyncItemFn,finalCallback){
    //
    // asyncItemFn = function(item,callback) -> callback(err,data) returns item transformed
    //
    // can be called with yield, as in: 
    // mappedArr = yield wait.for(parallel.map,arr,testFn);
    //
    var result={arr:[],count:0,expected:arr.length};
    if (result.expected===0) return finalCallback(null,result.arr);

    for (var i = 0; i < arr.length; i++) {
        wait.launchFiber(wait.helper.fiberForItem
            ,asyncItemFn,arr[i],i,result,finalCallback);
    };

};

//async parallel filter
parallel.filter = function(arr,asyncItemTestFn,finalCallback){
    //
    // asyncItemFn = function(item,callback) -> callback(err,data) return data=true/false
    //
    // can be called with yield, as in
    // filteredArr = yield wait.for(parallel.filter,arr,testFn);
    //
    parallel.map(arr,asyncItemTestFn,function(err,testResults){
        if (err) return finalCallback(err);
        // create an array for each item where asyncItemTestFn returned true
        var filteredArr=[];
        for (var i = 0; i < arr.length; i++) 
            if (testResults[i]) filteredArr.push(arr[i]);
        finalCallback(null,filteredArr);
    });
};



// ----------------------
// DNS TESTS -------------
// ----------------------

function* showReverse(addr,i){
    var ms=Math.floor(Math.random()*1000);
    console.log('waiting',ms);
    yield [wait.milliseconds, ms];
    console.log("reverse for",i, addr , ":", JSON.stringify(yield wait.for(dns.reverse,addr)));
}

function* sequential_resolve_parallel_reverse(hostname){

    console.log('dns.resolve4 ',hostname);
    var addresses = yield wait.for(dns.resolve4,hostname);
    console.log("addresses: ",JSON.stringify(addresses));
    for (var i = 0; i < addresses.length; i++) {
        wait.launchFiber(showReverse, addresses[i],i);
    };
}


function* sequential_resolve(hostname){

    console.log('dns.resolve4 ',hostname);
    var addresses = yield wait.for(dns.resolve4,hostname);
    console.log("addresses: ",JSON.stringify(addresses));
    for (var i = 0; i < addresses.length; i++) {
        yield wait.runGenerator(showReverse,addresses[i],i);
        //if (i===5) throw new Error('test ERROR, i===5 on sequential_resolve');
    };

}

// ----------------------
// OBJECT TESTS ---------
// ----------------------
function Answer(value,pong){
    this.value = value;
    this.pong = pong;
}

Answer.prototype.think=function(callback){
  if (!this) {
    var errMsg='ERR: this is null, at: Answer.prototype.think';
    console.log(errMsg);
    callback(new Error(errMsg));
  } 
  else {
    console.log('thinking...(but not blocking)');
    myValue = this.value;
    wait.milliseconds(500, function(){
        callback(null, 'the answer is: '+ myValue)
        });
  }
};

Answer.prototype.pingPong=function(ping,callback){
    // callback before return
    callback(null, ping+'...'+this.pong);
}


var theAnswer = new Answer(42,'tomeito');
var theWrongAnswer = new Answer('a thousand','tomatito');


function testLikeAddr(addr,callback){
    console.log('1st dns.reverse',addr);
    dns.reverse(addr,function(err,reverse){
        if (err) return callback(err);
        var likeIt= Math.random()>0.5;
        if (likeIt) console.log('I like ',reverse,addr);
        if (Math.random()>0.9) return callback(new Error('test ERROR Math.random()>0.9 at testLikeAddr'));
        callback(null, likeIt);
    });
}

// -------------------
// RUN TESTS (Fiber)--
// -------------------
function* runTests(hostname){

    console.log('--------------------------------');
    console.log('wait.for dns.resolve4 ',hostname);
    var addresses = yield wait.for(dns.resolve4,hostname);
    console.log("addresses: ",JSON.stringify(addresses));
    // get reverse addrs in parallel
    console.log('wait.parallel.map(addresses, dns.reverse)');
    console.log('-with random waits-');
    var reverseAddrs = yield wait.for(parallel.map,addresses,dns.reverse);
    console.log("reverses:");
    for (var i = 0; i < reverseAddrs.length; i++) {
        console.log(i,reverseAddrs[i]);
    };

    console.log('--------------------------------');
    console.log('wait.parallel.filter(addresses, testLikeAddr(addr)');
    try {
        var reverseLiked = yield wait.for(parallel.filter, addresses, testLikeAddr);
        console.log("Reverses Liked:");
        for (var i = 0; i < reverseLiked.length; i++) {
            console.log(i,reverseLiked[i]);
        };
    } catch(err){
        console.log("ERROR at TEST wait.parallel.filter",err.message)
    }

    console.log('--------------------------------');
    console.log('resolve, then sequential reverse (wait for each)');
    yield wait.runGenerator(sequential_resolve,hostname);
    console.log('--------------------------------');

    console.log('--------------------------------');
    console.log('resolve, then parallel reverse (no wait)');
    yield wait.runGenerator(sequential_resolve_parallel_reverse,hostname);
    console.log('--------------------------------');

    //METHOD TEST (passing 'this' to the function)
    console.log(yield wait.forMethod(theAnswer,'think'));
    console.log(yield wait.forMethod(theAnswer,'pingPong','tomato'));

    console.log(yield wait.forMethod(theWrongAnswer,'think'));
    console.log(yield wait.forMethod(theWrongAnswer,'pingPong','pera'));

}

// MAIN
try{
    wait.launchFiber(runTests,"google.com");
} 
catch(e){
    console.log("Error: " + e.message);
};

