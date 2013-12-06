/* node wait.for-ES6 - based on ES6-harmony generators 
 - Sequential programming for node.js - end of callback hell
 - Copyright 2013 Lucio Tato

 -- WARNING: bleeding edge --
 This lib is based on ECMAScript 6, 
 the next version of the javascript standard, code-named "Harmony".
 (release target date December 2013).

 This lib also uses bleeding edge v8 Harmony features, so you’ll need to
 use the latest -unstable- nodejs version wich today is v0.11.6 
 and also pass the --harmony flag when executing node.

    node --harmony waitfor-demo.js

 If you want to use "wait.for" but you can't use (unstable) node and/or ES6-Harmony
 you can use the Fibers-based version of wait.for 
 at:  http://github.com/luciotato/waitfor
 The Fibers-based version of wait.for only requires node-fibers(stable), and node >= 0.5.2 

*/

"use strict";

var Wait = {

    launchFiber: function(generatorFn){ // wait.launchFiber(fn,arg1,arg2...)

        //console.log(Array.prototype.slice.call(arguments));
        
        // starts a generator (emulating a fiber)

        // helper function, call the async, using theCallback as callback
        function callTheAsync(FunctionAndArgs,theCallback){
            // prepare arguments
            var argsOnly=Array.prototype.slice.call(FunctionAndArgs,1); // remove function from args & convert to Array
            argsOnly.push(theCallback); //add callback to arguments
            // start the asyncFn
            FunctionAndArgs[0].apply(null, argsOnly); // call the asyncFn, (strict: this=null)
        }

        // launchFiber :
        //console.log('launchFiber',arguments);

        // get parameters
        var newArgs=Array.prototype.slice.call(arguments,1); // remove generatorFn from args & convert to Array
        var finalCallback=null; //optional

        if (typeof generatorFn !== 'function') {
            if (generatorFn==='onComplete') { //1st param is string 'onComplete'
                //special mode: second parameter is finalCallback tp signal completion of the iterator
                finalCallback=newArgs.shift(); //remove 2nd param finalCallback
                generatorFn=newArgs.shift(); //remove. 3rd param is generatorFn
                //console.log('launchFiber mode:async ',newArgs);
            }
            else {
                console.log(arguments);
                throw new Error('first argument must be a function*, not '+(typeof generatorFn));
            }
        }

        // create the iterator
        var thisIterator = generatorFn.apply(null, newArgs); // create the iterator. 
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
            if (nextPart.done) {//the generator function has finished (executed "return")
                finalCallback && finalCallback(null, {result:nextPart.value, iterator:thisIterator}); //final callback ok
                return; //it was the last part, nothing more to do
            }

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
        thisIterator.defaultCallback();
        
        return thisIterator; //launchFiber returns created iterator
    }

    ,for: function(asyncFn){ // wait.for(asyncFn,arg1,arg2,...)

            return arguments;

            // the syntax is: yield wait.for(asyncFn,arg1,arg2...)
            // so, the generator will yield wait.for's result (ie: it's arguments) 
            // to the calling function (launchFiber / defaultCallback)

            // given that wait.for is basically: function(){return arguments;}
            // then, the expression wait.for(asyncFn,arg1,arg2...) ~= [asyncFn,arg1,arg2...]
            // so, you can completely omit 'wait.for' and use
            // "the fancy syntax": yield [asyncFn, arg1, arg2...]
    }

    ,forMethod: function(obj,methodName){ // wait.forMethod(dbObj,'select',....)

        var method=obj[methodName];
        if (!method) throw new Error('wait.forMethod: second argument must be the async method name (string)');
        
        var newArgs=Array.prototype.slice.call(arguments,1); // remove obj  from args
        newArgs[0]=method.bind(obj); // create a function wich will call obj.method (with this=obj)
        return newArgs; // continue as with non-method async
    }

    ,runGenerator: function(generatorFn){ // yield [wait.asyncFiber, generatorFn,arg1,arg2,...)

        // helper closure asyncFiber
        function async_launchFiber(generatorFnAndParams, finalCallback){ // 
            try{
                generatorFnAndParams.unshift('onComplete',finalCallback); // insert 'onComplete',finalCallback
                //console.log('async_launchFiber',generatorFnAndParams);
                Wait.launchFiber.apply(null, generatorFnAndParams) // wait.launchFiber, call with all params
                // 'onComplete' makes Wait.launchFiber to call finalCallback at generator:done
                // so asyncFiber can signal completion
            }
            catch(err){
                console.log('ERR async_launchFiber',err.message);
                return finalCallback(err);
            }
        }

        var newArgs=Array.prototype.slice.call(arguments); // convert to array
        return [async_launchFiber,newArgs]; //compose array with helper fn asyncFiber
        // return [asyncFiber,[generatorFn,arg1,arg2,...]]
        // so wait.for will call: Wait.asyncFiber([generatorFn,arg1,arg2,...], callback)

    }
};


module.exports = Wait; //export
