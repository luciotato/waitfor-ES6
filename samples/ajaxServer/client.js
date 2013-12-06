//ON THE BROWSER
//---

function appendHtml(el, str) {
  var div = document.createElement('div');
  div.innerHTML = str;
  if (div.children.length > 0) {
    newItem = div.children[0];
    el.appendChild(newItem);
    return newItem;
  }
}
 
//---------------------------------
function new_XMLHttpRequest() {
    var ref = null;
    if (window.XMLHttpRequest) {
        ref = new XMLHttpRequest();
    } else if (window.ActiveXObject) { // Older IE.
        ref = new ActiveXObject("MSXML2.XMLHTTP.3.0");
    }
    if (!ref) {
        throw {status: 505, responseText: 'Failure to create XMLHttpRequest'};
    }
    return ref;
}

//---------------------------------
function ajaxGetJson(url, callback) {

    if (typeof callback !== 'function') {
        throw('callback should be a function(err,data)');
    }

    try {
        var xmlhttp = new_XMLHttpRequest();
        xmlhttp.onreadystatechange = function() {
            if (xmlhttp.readyState === 4) {
                if (xmlhttp.status !== 200) {
                    return callback(new Error("status:" + xmlhttp.status + " " + xmlhttp.statusText));
                }
                try {
                    var response = JSON.parse(xmlhttp.responseText); // parseo json
                } catch (ex) {
                    return callback(new Error(ex.message + '\n' + xmlhttp.responseText.substr(0, 600))); // data no era JSON
                }
                
                if (response.err) return callback(response.err); // server err
                return callback(null, response.data); // callback OK
            }
            ;
        };

        xmlhttp.open("GET", url, true); //async
        xmlhttp.setRequestHeader('content-type', 'applicattion/json');
        xmlhttp.send();
        return xmlhttp;
    }
    catch (e) {
	 //call the callback on next chance
        return setTimeout(function(){callback(e, null)},0); 
    }
}

//---------------------------------
function launch(){
var p = document.getElementById('parallel');
while(p.firstChild) p.removeChild(p.firstChild);
var cant = 20;
var newDivs=[];
for (var n=0;n<cant;n++){
	newDivs.push(appendHtml(p,'<div class=node-req>'+n+': started</div>'));
};

for (n=0;n<cant;n++){
	console.log('get',n);
	ajaxGetJson("/longAsyncOper/"+n,function(err,data){
		if (err) return newDivs[err.order|0].innerHTML="ERR " + err.message;
		console.log(data);
              newDivs[data.order].innerHTML= JSON.stringify(data.content);
		});
}
}
