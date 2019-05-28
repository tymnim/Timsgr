
"use strict"

var http = require('http');
var fs = require('fs');                  
var https = require('https');              
var os = require('os');

var file_all_users = "all_nodes", // file that contains all users info
    file_msgs = "msgs"; // file that contains all messages that weren't recieved

var all_users = {}, // all users info
    msgs = {}; // all messages that wasn't recieved


// Reading base of all users
fs.readFile( file_all_users, 
    {"encoding": "utf8"}, 
    function(err, data){
        if ( err ){ 
            console.log(err);
        }
        if ( data ){ 
            all_users = JSON.parse( data );
        }
    }
);
// Reading base of all unrecieved msgs
fs.readFile( file_msgs, 
    {"encoding": "utf8"}, 
    function(err, data){
        if ( err ){ 
            console.log( err );
        }
        if ( data ){ 
            msgs = JSON.parse(data);
        }
    }
);


var ap = http.createServer(apache_server).listen(5555); // Apache server that returns images
function apache_server(req, res){
    var url = require('url').parse(req.url, true);
    fs.readFile(url['path'], function(err, data){
        if ( err ){ 
            console.log(err);
        }
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end(data);
    })
}


var options = {// HTTPS server options
    key: fs.readFileSync("https/server-key.pem"),
    cert: fs.readFileSync("https/server-cert.pem"),
    //openssl genrsa -out server-key.pem 1024
    //openssl req -new -key server-key.pem -out server-csr.pem
    //openssl x509 -req -in server-csr.pem -signkey server-key.pem -out server-cert.pem
};
var server = https.createServer(options, on_response); //HTTPS server
    server.on('error', server_on_error );
    server.listen( 5556, server_on_listening );

function server_on_error(err){ // Just throwing error if there's one
    console.log(err);
    throw new Error(err);
}

function server_on_listening() {
    var addresses = "";
    var ifaces = os.networkInterfaces();
    for ( var iface in ifaces ) {
        for ( var addr in ifaces[iface] ) {
            if ( ifaces[iface][addr]['family'] === "IPv4" ) {
                addresses += (ifaces[iface][addr]['address'] + ", ");
            }
        }   
    }  
    console.log(addresses + " : 5556");// show current ip and constant port
}

function on_response(req, res) {  
    console.log('GOT CONNECTION: ' + req.url)
    var url = require('url').parse(req.url, true);
    
    if ( url['path'] === "/signup" ) {
        req.on('data', 
            function(data){
                var inform_json = JSON.parse(data);
                var login = Object.keys(inform_json)[0];
                if ( all_users[login] ) {
                    res.writeHead(410, {'Content-Type': 'text/plain'});
                    res.end("This username was already taken.");
                    return;
                } 
                all_users[login] = inform_json[login];
                save_users_file();
                res.writeHead(200, {'Content-Type': 'text/plain'});
                res.end("OK")
            } 
        );
    }
    
    if ( url['path'] === "/login" ) {
        req.on('data',
            function(data){
                var info_json = JSON.parse(data);
                var login = Object.keys(info_json)[0];
                if ( all_users[login ]) {
                    if ( info_json[login]['pass'] === all_users[login]['pass'] ){
                        res.writeHead(200, {'Content-Type': 'text/plain'});
                        res.end("OK");// Permition to log in
                    } else {
                        res.writeHead(403, {'Content-Type': 'text/plain'});
                        res.end("The Password was typed incorrectly");
                    }
                } else {
                    res.writeHead(404, {'Content-Type': 'text/plain'});
                    res.end("Then user name was not found");
                } 
            }
        );
    }
    
    if (url['path'] === "/add_friend"){
        req.on('data',
            function(data){
                data = JSON.parse(data);
                var login = data['name'];
                if ( all_users[login] ) {
                    res.writeHead(200, {'Content-Type': 'text/plain'});
                    var result = {};
                        result['key'] = all_users[login]['key'];
                        result['src'] = all_users[login]['src'];
                    res.end(JSON.stringify(result));
                } else {
                    res.writeHead(404, {'Content-Type': 'text/plain'});
                    res.end('The Friend Is Not Found');
                }
            }
        );
    } 
    
    if (url['path'] === "/send_msg"){
        req.on('data',
            function(data){
                var msg = JSON.parse(data);
                var login = Object.keys(msg)[0];
                var sender = Object.keys(msg[login])[0];
                if (all_users[login]) {
                    if ( msgs[login] ) {
                        if (msgs[login][sender]) {
                            msgs[login][sender][msgs[login][sender].length] = msg[login][sender];
                        } else {
                            msgs[login][sender] = [];
                            msgs[login][sender][msgs[login][sender].length] = msg[login][sender];
                        }
                        save_msgs_file();
                        res.writeHead(200, {'Content-Type': 'text/plain'});
                        res.end("OK");
                    } else {
                        msgs[login] = {};
                        msgs[login][sender] = [];
                        msgs[login][sender][msgs[login][sender].length] = msg[login][sender];
                        save_msgs_file();
                        res.writeHead(200, {'Content-Type': 'text/plain'});
                        res.end("OK");
                    }
                } else {
                    res.writeHead(404, {'Content-Type': 'text/plain'});
                    res.end('Not found friend');
                }
            }
        );
    }
    
    if (url['path'] === "/online"){
        
        req.on('data',
            function (data){
                var answer;
                var list_json = JSON.parse(data);
                var login = Object.keys(list_json)[0];
                
                if ( msgs[login] ) {
                    answer = JSON.stringify(msgs[login]);
                    delete(msgs[login]);
                    save_msgs_file();
                    res.writeHead(200, {'Content-Type': 'text/plain'});
                    res.end(answer);
                    
                } else {
                    res.writeHead(204, {'Content-Type': 'text/plain'});
                    res.end("no content");
                }
                save_users_file();
            }
                
        );

    }
    
    if (url['pathname'] === "/change_photo"){
        var new_av = "";
        req.setEncoding('binary');
        var filename = decodeURIComponent(url['query']['name']);
        req.on('data', 
            function(data){
               new_av += data;
            });
        req.on('end', function(){
            fs.writeFile("images/" + filename, new_av, 'binary', function (err) {
                if (err) {throw err}
                all_users[filename.split(".")[0]]['src'] = "images/" + filename;
                res.writeHead(200, {'Content-Type': 'text/plain'});
                res.end("OK");
            });
        });
    }
    
    if (url['path'] === "/online_friends") {
        
        req.on('data', function(data){
            var list_json = JSON.parse(data)
            var login = Object.keys(list_json)[0];
            if (all_users[login]) {
                all_users[login]['state'] = Date.now();
            }
            var ans = {};
            for (var i in list_json[login]){ 
                if(all_users[i]) {
                    ans[list_json[login][i]] = all_users[i]['state'];
                }
            }
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end(JSON.stringify(ans));
        });
    }
    if (url['path'] === "/remove_photo") {
        
        req.on('data', function(data){
            var login = JSON.parse(data)['name'];
            if(all_users[login]){
                all_users[login]['src'] = "icon.png";
                res.writeHead(200, {'Content-Type': 'text/plain'});
                res.end("OK");
            }
            
        });
    }
    
}
// writes all user info the usersfile to save it
function save_users_file() {
    fs.writeFile(                                                         
        file_all_users,                                                   
        JSON.stringify(all_users, null, 4),                               
        {"encoding": "utf8"},                                             
        function (err) {                                                  
            if ( err ) {                                                  
                server_on_error("can't save friendlist to "+ file_all_users +": "+ err);
            }
        }
    );
}
// writes all unrecieved messages in case the server die
function save_msgs_file() { 
    fs.writeFile(                                                         
        file_msgs,                                                   
        JSON.stringify(msgs, null, 4),                               
        {"encoding": "utf8"},                                             
        function (err) {                                                  
            if ( err ) {                                                  
                server_on_error("can't save message to "+ file_msgs +": "+ err);
            }
        }
    );
}
