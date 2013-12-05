/* parallel-ES6 - based on ES6-harmony generators 
 - Sequential programming for node.js - end of callback hell
 - Copyright 2013 Lucio Tato

 -- WARNING: bleeding edge --
 This lib is based on ECMAScript 6, 
 the next version of the javascript standard, code-named "Harmony".
 (release target date December 2013).

 This lib also uses bleeding edge v8 Harmony features, so you’ll need to
 use the latest -unstable- nodejs version wich today is v0.11.6 
 and also pass the --harmony flag when executing node.

    node --harmony parallel-demo.js

 check the complementing lib wait.for-ES6 at http://github.com/luciotato/waitfor-ES6
*/
"use strict";

var Parallel = {

    // parallel.runFiber
    // runs fiber until completion. (a fiber is a generator yielding async fns and params) 
    // On completion, callback.
    // 
    // same usage:
    // 
    // parallel.runfiber(processData(myData),
    //       function(err,data){
    //               console.log('process ended, result:',data)
    //       });
    // 
    runFiber: function(generator,finalCallback){ 

        // helper function, call the async, using theCallback as callback
        function callTheAsync(FunctionAndArgs,theCallback){
            // prepare arguments
            var argsOnly=Array.prototype.slice.call(FunctionAndArgs,1); // remove function from args & convert to Array
            argsOnly.push(theCallback); //add callback to arguments
            // start the asyncFn
            FunctionAndArgs[0].apply(null, argsOnly); // call the asyncFn, (strict: this=null)
        }

        // create a closure to act as callback for the yielded async calls in this generator
        // this callback will RESUME the generator, returning 'data' as the result of the 'yield' keyword
        generator.defaultCallback=function(err,data){

            // on callback:
            // console.log('on callback, err:',err,'data:',data);

            // if err, schedule a throw inside the generator, and exit.
            if (err) return generator.throw(err);

            // data:        
            // return data as the result of the yield keyword,
            // and RESUME the generator. (we store the result of resuming the generator in 'nextPart')
            var nextPart = generator.next(data);  // generator.next => RESUME generator, data:->result of 'yield'

            //after the next part of the generator runs...
            if (nextPart.done) {//the generator function has finished (executed "return")
                finalCallback && finalCallback();
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

        // starts the generator loop
        generator.defaultCallback();

    }


    // -------------
    // parallel.map
    // -------------
    // generatorFn will be run for each item
    // when all the generators complete, finalCallback will be called
    //
    // parallel.map can be waited.for, as in: 
    // mappedArr = yield wait.for(parallel.map, arr, translateFn);
    //
    ,map : function(arr, fiberFn, finalCallback){
        //
        // fiberFn = function*(item,index,arr) -> returns item mapped
        //
        var result={arr:[],count:0,expected:arr.length};
        if (result.expected===0) return finalCallback(null,result.arr); //early exit

        var taskJoiner=function(inx,data,result){
            //console.log('result arrived',inx,data);
            result.arr[inx]=data;
            result.count++;
            if (result.count>=result.expected) { // all results arrived
                finalCallback(null,result.arr) ; // final callback OK
            }
        };

        //main
        for (var i = 0; i < result.expected; i++) {
            Parallel.runFiber( fiber(arr[i],i,arr)
                    //as callback, create a closure to contain the index and store result data
                    ,function(err,data){ 
                        if (err) return finalCallback(err,i); //err
                        taskJoiner(i,data,result); 
                    });
        };

    }

    // ----------------------
    // parallel filter
    // ----------------------
    ,filter : function(arr, filterGeneratorFn, finalCallback){
        //
        // filterGeneratorFn = function*(item,index,arr) -> returns true/false
        //
        // usage:
        //
        // parallel.filter(myArr, filterFn,
        //       function(err,data){
        //               console.log('process ended, filtered result arr:', data)
        //       });
        //
        // parallel.filter can be waited with wait.for, as in:
        //
        // filteredArr = yield wait.for(parallel.filter,arr,filterFn);
        //
        // main: parallel call filterGeneratorFn on each item, store result (true/false)
        Parallel.map( arr, filterGeneratorFn
                ,function(err,testResults){ //when all the filters finish
                    if (err) return finalCallback(err);
                    // create an array for each item where filterGeneratorFn returned true
                    var filteredArr=[];
                    for (var i = 0; i < arr.length; i++) {
                        if (testResults[i]) filteredArr.push(arr[i]);
                    };
                    finalCallback(null,filteredArr);
                });
    }

};

module.exports = Parallel; //export
