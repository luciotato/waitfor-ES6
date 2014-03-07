var path = require('path');
var fs   = require('fs');
var fsUtil = require('./fsUtil');

var wait = require('../../waitfor');

var compiler;

var normal = "\x1b[39;49m";
var red = "\x1b[91m";
var green = "\x1b[32m";

var cp  = require('child_process')

//------------------------------------------
// ug a FILE

  function* ugFile(filename, output_dir, options) {

      options = options || {};
      //if (options.map===undefined) options.map=true;

      var stat, extension, js_filename, source, js_output;
      stat = fs.statSync(filename);
      if (stat.isDirectory()) throw 'expected a file';

      extension = path.extname(filename);

      if (['.js'].indexOf(extension) >= 0) {

          //console.log(fname_processed);
          
          // get filename for output .js
          js_filename = path.join(output_dir, path.basename(filename, extension)) + '.ug.js';

          fsUtil.mkPathToFile(js_filename);

          console.log(green,'ug', filename,normal, '->', js_filename);

          yield wait.for ( cp.exec, 'uglifyjs '+filename+' -b -o '+js_filename);

          //do some replacement on the file
          var contents = fs.readFileSync(js_filename,'utf-8');
          fs.writeFileSync(js_filename,contents.replace(/\svar\s/g," "));

          console.log(green, js_filename,' REPLACED var',normal);

          console.log(normal,'-----------');    

    
      }
  }


function* ugDir(sourceDir, outDir, options){

    console.log('ug dir  '+sourceDir+' -to- '+outDir);
    if (options) console.log('OPTIONS ', options);

    //get files
    var files = [];
    var filename;
    fsUtil.recurseDir(sourceDir, function(filename){
        if ( path.extname(filename)==='.js'
            && (options.filter===undefined || filename.indexOf(options.filter)>=0)
            && (options.exclude===undefined || filename.indexOf(options.exclude)===-1) )      
                    files.push(filename);
    });

    //run ug sequentially on each one
    for(var i=0;i<files.length;i++){
        filename = files[i];
        yield wait.runGenerator(ugFile,filename,outDir,options);
    }


}

function* mainProcess(){

    yield wait.runGenerator(ugDir,'test','out',options);

};

//
//-- MAIN--------------------------------------
//

console.log("\n\n\n");
console.log(process.argv);
console.log(process.cwd());

var options = {beautify:true};

options.exclude = 'README';

options.force = (process.argv.indexOf("-force")>=0)

wait.launchFiber(mainProcess);

