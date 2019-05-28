"use strict";

var fs = require('fs');
var os = require('os');
var path = require('path');
var NodeRSA = require('./Node-rsa/src/NodeRSA.js');

    // Paths to files
var file_friends,       // Address of the file that contains friends
    file_history_base,  // Path to all files that contains message history
    homedir;            // Path to home directory

    // Server data
var addr_server = "127.0.0.1:5556"; // put your server ip
var addr_apache = "127.0.0.1:5555"; // put your server ip
var addr_photos = "path/to/source"; // path to the mage folder

    // Boosting messager
var proving_popup,      // DOM element - the popup to prove that you found right friend
    history_msg,        // DOM element - container for texting history
    input_msg,          // DOM element - textarea, input field for 
    img_new_friend,     // DOM element - new friend image in the popup
    name_new_friend;    // DOM element - input, field to search the friend

    // Gloval variables
var my_name,            // Global variable to keep out name in memory to access it easily
    my_pass,            // Global variable to keep out password in memory to access it easily
    friend_id = 0,      // Global counter to have unique ID for each friend
    current = [],       // Global variable, caontains info about current chosen friend
    friends = {};       // Global variable,  contains all friends

var keys = new NodeRSA(); // Profile encryption and decryption keys


// Onclick on Log In button START //
function log_in_click(){ // Sends the username and the password to the server to log in

    var user_name = document.getElementById("login_username").value;
    var pass_text = document.getElementById("login_pass").value;
    
    // Encrypted password to ensure that server cannot get access to our account
    var pass_hash = require('crypto').createHmac('sha256', pass_text).digest('hex');

    var login_user_info_json = {}; // Info will be sent to the server to get permision to log in
        login_user_info_json[user_name] = {};
        login_user_info_json[user_name]["pass"] = pass_hash;

    var url = "https://" + addr_server + "/login"; // Pathname means action that we wanna do

    var xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.send(JSON.stringify(login_user_info_json)); // Sends info to server

    xhr.onreadystatechange = function() {
        if ( xhr.readyState === 4 ) {
            if ( xhr.status != 200 ) {
                    alert(xhr.status + " : " + xhr.statusText);
                return;
            } else {
                // Loads main page of the messager
                onload_msgr(encodeURIComponent(user_name), encodeURIComponent(pass_text));
            }
        } 
    }
}
// Onclick on Log In button END //


// Onclick on Sign Up button START //
function sign_up_click(){ // Creates new account (name, password, key) and sends it to the server
    
    var new_login = document.getElementById("new_username").value;
    var new_pass = document.getElementById("new_pass").value;
    var rep_pass = document.getElementById("rep_new_pass").value;
    
    if ( new_pass != rep_pass ) { // Check new password
        alert("The password was repeated wrong.");
        return;
    }
    
    // RSA keys generation
    var key = new NodeRSA({b: 512});
    var public_der = key.exportKey('pkcs8-public-der');
    var private_der = key.exportKey('pkcs1-der');
    
    var publickey = new NodeRSA();
        publickey.importKey(public_der, 'pkcs8-public-der');

    var pass_hash = require('crypto').createHmac('sha256', new_pass).digest('hex')   

    var signup_user_info = {};
        signup_user_info[new_login] = {};
        signup_user_info[new_login]["pass"] = pass_hash;
        signup_user_info[new_login]["src"] = "icon.png"; // Default profile image
        signup_user_info[new_login]["key"] = public_der; // Public key is sent to the server

    var url = "https://" + addr_server + "/signup";

    var xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.send(JSON.stringify(signup_user_info)); // Sends info to server

    xhr.onreadystatechange = function() {
        if ( xhr.readyState === 4 ) {
            if ( xhr.status != 200 ) { 
                    alert(xhr.status + ": " + xhr.statusText)
                return;
            } else {
                // Home directory creation
                homedir = os.tmpdir() + path.sep + new_login;
                if (! fs.existsSync(homedir) ) { 
                    fs.mkdirSync(homedir) 
                };

                //Saving public and private keys
                var key_json = {};
                    key_json["private"] = private_der;
                    key_json["public"] = public_der;
                fs.writeFile(homedir + path.sep + "key", JSON.stringify(key_json),
                    function(err){
                        if ( err ) {                             
                            alert("Cannot create a new account: "+ err); 
                        }
                    }
                
                );

                // Creating the file for link to our profile image
                fs.writeFile(homedir + path.sep + "photo_src", "icon.png", function(err){
                    if (err){
                        alert("Can't change ava" + err);
                    }
                });
                // Loads main page of the messager
                onload_msgr(encodeURIComponent(new_login), encodeURIComponent(new_pass));
            }
        }
    }
}   
// Onclick on Sign Up button END //


function onload_msgr(username, pass) { // Loads main page of the messager
    // Runs main.html and sends username and password
    document.location.assign('main.html?username=' + username + "&" + "pass=" + pass);
}


//Onload on the body of document START //
function on_load() { // Prepares messager to using

    // Decoding URL to get the name and passwod
    var url = require('url').parse(document.location.href, true);
    my_name = decodeURIComponent(url["query"]["username"]);
    my_pass = decodeURIComponent(url["query"]["pass"]);

    document.getElementById("my_name").innerHTML = my_name;
    document.getElementById("my_name1").innerHTML = my_name;


    homedir = os.tmpdir() + path.sep + my_name;
    if (! fs.existsSync(homedir) ) { 
        fs.mkdirSync(homedir) 
    };
    
    fs.readFile(homedir + path.sep + "key", {"encoding": "utf8"}, function(err ,data){
        // Gets RSA keys
        if ( err ) { return }

        var key = JSON.parse(data);
        var public_key = new Buffer.from(key["public"]);
        var private_key = new Buffer.from(key["private"]);

        keys.importKey(public_key, "pkcs8--public-der");
        keys.importKey(private_key, "pkcs1-der");

        // Getting id to prove your account
        var hash = require('crypto').createHmac('sha256', public_key).digest('hex')
        var strhash = hash.slice(0, 8);

        document.getElementById("my_id").value = strhash;
        document.getElementById("my_id").innerHTML = " " + strhash;
    });
    
    // Gets profile picture
    fs.readFile(homedir + path.sep + "photo_src", function(err, data) {
        document.getElementById("myava").src = "http:" + addr_apache + addr_photos + data;
        document.getElementById("my_big_ava").src = "http:" + addr_apache + addr_photos + data;
    });
    
    file_friends = homedir + path.sep + "friends";
    file_history_base = homedir + path.sep + "history_";

    proving_popup = document.getElementById("popup");
    img_new_friend = document.getElementById("img_new_friend");
    history_msg = document.getElementById("history");
    input_msg = document.getElementById("input_msg");
    name_new_friend = document.getElementById("new_friend_name");

    fs.readFile( file_friends, {"encoding": "utf8"}, friends_load ); // Loads friend list

    // Onkeypress to send messages by ENTER + SHIFT
    var map = {}; 
    onkeydown = onkeyup = function(e){
        if ((e.keyCode == 13)||(e.keyCode == 16)){
            map[e.keyCode] = e.type == 'keydown';
        }
        if((map[13] == true) && (map[16] == true)) {
            send_message(); 
        };
    }
    

    var timerIdOnline = setTimeout(function(){
        online(); // Tells server that the account is online and gets new messages
        var timerReq = setInterval(online, 5 * 1000); 
    }, 500);
    
    var timerIdFriends = setTimeout(function(){
        get_online_friends(); // Gets friend states (Online / Offline)
        var timerReq = setInterval(get_online_friends, 10 * 1000);
    }, 500);
}
//Onload on the body of document END //


// Onclick of serach button new serach line START //
function search_friend() { // Sends request to the server to get new friend image
    
    var url = "https://" + addr_server + "/add_friend"; // Gets public key and 
    var name = {}; // Data to send to the server - only friend name
        name["name"] = name_new_friend.value;

    var xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.send(JSON.stringify(name)); // Sends name

    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status != 200) {
                alert(xhr.status + ": " + xhr.statusText);
                return;
            }; 
            if (xhr.status == 200) {
                // Changes new friend picture in the popup and shows it
                img_new_friend.src = "http:" + addr_apache + addr_photos + JSON.parse(xhr.responseText)["src"];
                img_new_friend.alt = name_new_friend.value;
                name_new_friend.value = "";
                PopUpShow();
            }
        }
    }
}
// Onclick of serach button new serach line END //


// Callback of reading friends file START //
function friends_load(err, data) { // Prepares friends data for using
     
    if ( err ) {  
        //alert("can't load friendlist from "+ file_friends +": "+ err);
    } else {                                                            
        friends = JSON.parse(data);
        for ( var i in friends ) {
            add_friend("add", i, friends[i]["img"], friends[i]["key"]); // Sends "add", means we do not rewrite friend file         
        };
    };
}
// Frends data preparing END //


// Onclick on Add Friend button START //
function add_friend_click(){ // Proves friend ID and calls add_fried() to save a new friend

    var fid = document.getElementById("inhash").value; // Gets typed id that we got from a friend
    if ( fid == "" ) {
        alert("ID line is empty");
        return;
    }

    var name = img_new_friend.alt;
    for ( var i in friends ) { // Finds if there's a friend with the same name
        if ( i == name ) {
            alert(name + " is in your friend list already.");
            return;
        }
    }

    if ( name != undefined ) {
        var name_pack = {};
            name_pack["name"] = name;

        var url = "https://" + addr_server + "/add_friend";
        
        var xhr = new XMLHttpRequest();
            xhr.open('POST', url, true);
            xhr.send(JSON.stringify(name_pack)); // Sends name of the friend that we want to add

        xhr.onreadystatechange = function() {
            if ( xhr.readyState === 4 ) {
                if ( xhr.status != 200 ) {
                    alert(xhr.status + ": " + xhr.statusText);
                    return;
                }; 

                if ( xhr.status == 200 ) {
                    var key = new Buffer.from(JSON.parse(xhr.responseText)["key"]); // Gets public key of the friend
                    var friends_public_key = require('crypto').createHmac('sha256', key).digest('hex'); // Gets hash of the public key
                    var friends_id = friends_public_key.slice(0, 8); // ID is first 8 characters
                    if ( friends_id == fid ) {
                        document.getElementById("inhash").value = "";
                        add_friend("new", name,  JSON.parse(xhr.responseText)["src"], key); // "new" means we add a new friend
                    } else {
                        alert("The id is incorrect.");
                    }
                }
            }
        }
    }
}
// Onclick on Add Friend button END //


// Adds friend into DOM element riend list START //
function add_friend(state, name, img_src, fkey) { // Creates DOM element for each friend in the list 


    var friend = document.createElement('div'); // Root container for new friend in the list
        friend.className = "friend";
        friend.id = "friend" + friend_id;

    document.getElementById("friends").appendChild(friend); // Append into the list

    var zone = document.createElement("div"); // Container for new friend
        zone.className = "friend_zone";
        zone.onclick = function() { // Onclick for some friend in the freind list 
            if ( current[0] != undefined ) {
                // Makes previous active friend class into just friend - passive
                document.getElementById(current[0]).className = "friend";
            }
            // Chenges info about current friend
            current[0] = friend.id; // ID ofr current box in the list
            current[1] = name;
            current[2] = new NodeRSA();
            console.log(current)
            console.log(fkey)
            var key = new Buffer.from(fkey);

            current[2].importKey(key, 'pkcs8-public-der');


            document.getElementById("name_" + friend.id).innerHTML = name; // 

            document.getElementById(friend.id).className = "friend active"; 
            // Changes class to make the friend visually active
            
            history_msg.removeChild(document.getElementById("re_history")); 
            // Removes block of all images
            
            var div = document.createElement('div'); // Container for new message history
                div.id = "re_history";
                div.className = "replasement";
            history_msg.insertBefore(div, history_msg.children[1]);

            fs.readFile(file_history_base + name,  {"encoding": "utf8"}, history_load);
            // Loads messages from the file
        };

    friend.appendChild(zone); // Append sone into Root container
    
    var left = document.createElement("div"); // Container for image position 
        left.className = "left";
    zone.appendChild(left);

    var img_div = document.createElement("div"); // Container for friend profile image
        img_div.className = "img_div";
    left.appendChild(img_div);

    var div = document.createElement("div"); // Another container
    img_div.appendChild(div);

    var img = document.createElement("img"); // Picture of the friend 
        img.className = "img";
        img.src = "http:" + addr_apache + addr_photos + img_src;
        img.id = "photo_friend" + friend_id;
    div.appendChild(img);
    
    var status = document.createElement("div"); // Container for state of the friend (Online / Offline)
        status.className = "status";
        status.id = "state_img_" + friend_id;
    div.appendChild(status);

    var icon = document.createElement("i"); // Icon of state changes color depending on state
        icon.className = "fa fa-certificate fa-spin";
    status.appendChild(icon);
    
    var right = document.createElement("div"); // Container for friend name
        right.className = "right";
    zone.appendChild(right);

    var friend_div = document.createElement("div"); // Another container for name
        friend_div.className = "name";
    right.appendChild(friend_div);
    
    var fname = document.createElement('label'); // Friend name label
        fname.id = "name_" + friend.id;
        fname.value = name;
        fname.innerHTML = name;
    friend_div.appendChild(fname);
    
    var cross_div = document.createElement("div"); // Container for removeing friend button
        cross_div.className = "delete_friend_cross";
    friend.appendChild(cross_div);

    var cross = document.createElement("div"); // Delete friend button
        cross.className = "cross";
        cross.onclick = function() {
            var elem = document.getElementById(friend.id);
            delete friends[fname.value]; // Deleting the friend from the list im memory
            
            // Deletes history of removed friend, remove history of current friend
            var current_name = current[1];
            current[1] = fname.value;
            del_history(); 
            current[1] = current_name;

            // Clear current friend data
            if ( current[0] = friend.id ) {
                current[0] = undefined;
                current[1] = undefined;
            }

            document.getElementById("friends").removeChild(elem); // Removes friend from DOM
            save_friend(); // Rewrite new friend list
        }
    cross_div.appendChild(cross);

    var del = document.createElement("i"); // Icon inside of button
        del.className = "fa fa-ban";
    cross.appendChild(del);
    
    // Creates friend in the list in memory
    friends[name] = {};
    friends[name]["img"] = img_src;
    friends[name]["key"] = fkey;
    friends[name]["id"] = friend_id;
    friend_id++; // Unique ID of each friend counts from 0

    if ( state == "new" ){ // Revrites friend list when we add new friends
        PopUpHide();
        save_friend();
    }
    if ( state == "new_msg" ) { // In case we add friend when we get message from user that is not in our friend list
        fname.innerHTML = name + " +";
        save_friend();
    }
}
// Adds friend into DOM element riend list END //


// Revrites friends data base START //
function save_friend() { // Rewrites file that contains data of all friends

    var new_friends = {};

    for ( var i in friends ) { // saves new friends[] with all undefined removed
        if (! (( friends[i] == undefined )||( friends[i] == "" )) ) {
            new_friends[i] = {};
            new_friends[i] = friends[i];
        }
    }

    fs.writeFile( // Rewrites file that contains data of all friends
        file_friends,
        JSON.stringify(new_friends),
        function(err){
            if (err) {                             
                alert("can't save this friend"+ err);
            }
        }
    );
}
// Revrites friends data base END //


// Callback on reading file of message history START //
function history_load(err,data) { // Loads message history. Calls when you select a friend different from your current selected friend

    if ( err ) { // If error means there's no history file. Means there has'n been any texting.
        //alert("Cannot read history file: "+ err);                
        return;
    }

    if ( data ) {
        var line = data.split("\n"); // Parses JSON file. Each line is new message
        for ( var i in line ) {
            if ( line[i] ) {
                var msg = JSON.parse(line[i]);
                if ( Object.keys(msg)[0] == my_name ) { // Check if it's our message
                    my_msg(msg[Object.keys(msg)[0]]["msg"], msg[Object.keys(msg)[0]]["date"]); // If it's our message, there's no need to send name
                                                                                            // Created DOM elements to display our message
                } else { // If it's not ours, it's friend's one
                    friends_msg(msg[Object.keys(msg)[0]]); // Creates DOM elements to display friend's message
                }
            }
        }
    }
}
// Callback on reading file of message history END //


// Message history generation START //
function my_msg(msg, dat){ //Created DOM elements to display user's message
    var re_hist = document.getElementById("re_history"); // History container

    var mess = document.createElement('div'); // Message container
        mess.className = "mymess";
    re_hist.appendChild(mess);

    var avatar = document.createElement('img'); // User's profile picture
        avatar.className = "mymessphoto";
        avatar.src = document.getElementById("myava").src;
    mess.appendChild(avatar);

    var text = document.createElement('div'); // Container for message text
        text.className = "mymesstext";
    mess.appendChild(text);

    var value_mess = msg.split("\n"); // Makes line breaks and appends text
    for (var i in value_mess) {
        if((value_mess[i] == "")&&(i == (value_mess.length - 1))) {}  else {
            var val = document.createTextNode(value_mess[i]);
            text.appendChild(val);
            var br = document.createElement("br");
            text.appendChild(br);
        }
    }

    var date = document.createElement('div'); // Date and time message was sent
        date.className = "date";
    text.appendChild(date);

    var val_date = document.createTextNode(dat); // Append date value
    date.appendChild(val_date);

    re_hist.scrollTop = re_hist.scrollHeight; // Scrolls down
}


function friends_msg(msg){ // Creates DOM elements to display friend's message

        var re_hist = document.getElementById("re_history");
        var mess = document.createElement('div');
        mess.className = "newmess";
        re_hist.appendChild(mess);
        var avatar = document.createElement('img');
        avatar.className = "newmessphoto";
        avatar.src = document.getElementById("photo_" + current[0]).src;
        mess.appendChild(avatar);
        var text = document.createElement('div');
        text.className = "newmesstext";
        mess.appendChild(text);
        var value_mess = msg.msg.split("\n");
        for (var i in value_mess) {
            if((value_mess[i] == "")&&(i == (value_mess.length - 1))) {}  else {
            var val = document.createTextNode(value_mess[i]);
            text.appendChild(val);
            var br = document.createElement("br");
            text.appendChild(br);
            }
        }
        var date = document.createElement('div');
        date.className = "date";
        text.appendChild(date);
        var val_date = document.createTextNode(msg.date);
        date.appendChild(val_date);
        re_hist.scrollTop = re_hist.scrollHeight;
}
// Message history generation END //


function save_history(namef, name, msg, date){
    var j = {};
        j[name] = {}
        j[name]["msg"] = msg;
        j[name]["date"] = date;
    fs.appendFile(
        file_history_base + namef,
        JSON.stringify(j)+"\n",
        function(err){
            if (err) {                             
                alert("can't save this friend"+ err); 
            }
        }
    );
}




function send_message() {
    if ((input_msg.value != "")){
    if (current[0] == undefined) { 
        alert("haven't current friend");
        return;
    }
    var msg_json = {}
        msg_json[current[1]] = {}
        msg_json[current[1]][my_name] = {};
        msg_json[current[1]][my_name]["msg"] = current[2].encrypt(input_msg.value, "base64");
        msg_json[current[1]][my_name]["date"] = current[2].encrypt(give_date(), "base64");
        //current[2].encrypt(msg_json[current[1]], 'base64');
    var url = "https://" + addr_server + "/send_msg";
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.send(JSON.stringify(msg_json));
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status != 200) {
                alert(xhr.status + ": " + xhr.statusText);
                return;
            } else{
                save_history(current[1], my_name, input_msg.value, give_date());
                my_msg(input_msg.value, give_date());
                input_msg.value = "";
            }
        } 
    }
    }
        //msg_json["date"] = date;
}

function new_msgs(data) {
    for (var i in data) {
        for (var j in data[i]) {
            save_history(i, i, keys.decrypt(data[i][j].msg, "utf8") , keys.decrypt(data[i][j].date, "utf8"));
        }
        if (current[1] == i) {
            for (var j in data[i]) {
                var json_data = {};
                    json_data["msg"] = keys.decrypt(data[i][j].msg, "utf8");
                    json_data["date"] = keys.decrypt(data[i][j].date, "utf8")
                friends_msg(json_data);
            }
        } else { 
            var k = 0;
            for (var j = 0; j < friend_id; j++) {
                if (document.getElementById("name_friend" + j)){
                    if (document.getElementById("name_friend" + j).value == i) {
                        document.getElementById("name_friend" + j).innerHTML = i + " +";
                        k = 1;
                        break;
                    }
                }
            }
            if (k == 0) {
                var url = "https://" + addr_server + "/add_friend";
                var name_json = {};
                name_json["name"] = i;
                var xhr = new XMLHttpRequest();
                xhr.open('POST', url, true);
                xhr.send(JSON.stringify(name_json));
                xhr.onreadystatechange = function() {
                    if (xhr.readyState === 4) {
                        if (xhr.status != 200) {
                            alert(xhr.status + ": " + xhr.statusText);
                            return;
                        }; 
                        if (xhr.status == 200) {
                            //get photo src
                            var fkey = JSON.parse(xhr.responseText);
                            add_friend("new_msg", i, /*document.getElementById("img_new_friend").src*/ fkey["src"], fkey["key"]);
                        }
                    }
                }
            }
        }
    }
}

function online() {
    
    var online_json = {};
    online_json[my_name] = {};
    online_json[my_name]["pass"] = my_pass;
    /*online_json[my_name]["IP"] = ip;
    online_json[my_name]["port"] = port;*/
    //online_json["friends_list"] = [];
    //for (var i in my_friends) {
    //    online_json["friends_list"][i] = my_friends[i];
    //}
    var url = "https://" + addr_server + "/online";
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.send(JSON.stringify(online_json));
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status == 204) {
            } else {
                if (xhr.status == 200) {
                    var new_msg = xhr.responseText;
                    //for (var i in new_msg) {
                        new_msgs(JSON.parse(new_msg));
                    //}
                } else { 
                    alert(xhr.status + ": " + xhr.statusText);
                }
            }
        }
        //online_friends = JSON.parse(xhr.responseText);
        //for (var i in my_friends){
        //    friends.options[i].style.color = "black";
        //    if (online_friends[i] === "on"){
        //        friends.options[i].style.color = "green";   //00CC00   
    }   
}

function get_online_friends() {
    
    var online_friends = {};
        online_friends[my_name] = {}
    for (var i in friends) { online_friends[my_name][i] = friends[i]["id"]}
    var url = "https://" + addr_server + "/online_friends";
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.send(JSON.stringify(online_friends));
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status == 200) {
                var list = JSON.parse(xhr.responseText);
                
                for (var i in list) {
                    if ((Math.abs(Date.now() - list[i])) < (60 * 1000)) { 
                        document.getElementById("state_img_" + i).className = "status on";
                    } else { 
                        document.getElementById("state_img_" + i).className = "status off";
                    } 
                }
            } else { 
                alert(xhr.status + ": " + xhr.statusText);
            }
        }
    }
    
}

function del_history(){
    fs.writeFile(
        file_history_base + current[1],
        "",
        function(err){
            if (err){
                alert("Can't delete history" + err);
            }
        }
    );
    history_msg.removeChild(document.getElementById("re_history"));
    var div = document.createElement('div');
    div.id = "re_history";
    div.className = "replasement";
    history_msg.insertBefore(div, history_msg.children[1]);
    
}

function give_date(){
    var now = new Date();
    var dat = now.getDate();
    var month = now.getMonth() + 1;
    var year = now.getFullYear();
    var days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    var day = days[now.getDay()];
    var hours = now.getHours();
    if(hours<10){hours = "0" + hours}
    var min = now.getMinutes();
    if(min<10){min = "0" + min}
    var sec = now.getSeconds();
    var date = hours + ":" + min + /*":" + sec + " " + day + */ " " + dat + "." + month + "." + year;
    return(date);
}

function change_ava(new_ava){
    
    var exp = new_ava[0].type.split("/")[1];
    var name = my_name + "." + exp;
    fs.writeFile(homedir + path.sep + "photo_src", "images/" + name, function(err){
            if (err){
                alert("Can't change ava" + err);
            }
        });
    var filename = encodeURIComponent(name);
    var url = "https://" + addr_server + "/change_photo?name=" + filename;
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.send(new_ava[0]);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status == 200) {
                fs.readFile(homedir + path.sep + "photo_src", function(err, data){
                    document.getElementById("myava").src = "q";
                    document.getElementById("my_big_ava").src = "q";
                    console.log(document.getElementById("myava").src);
                    document.getElementById("my_big_ava").src = "http:" + addr_apache + addr_photos + data;
                    document.getElementById("myava").src = "http:" + addr_apache + addr_photos + data;
                })
            } else { 
                alert(xhr.status + ": " + xhr.statusText);
            }
        }
    }
    
}

function remove_photo(){
    var name = {}
    name["name"] = my_name;
    var url = "https://" + addr_server + "/remove_photo";
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.send(JSON.stringify(name));
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status == 200) {
                fs.writeFile(homedir + path.sep + "photo_src", "icon.png", function(err){
                    if (err){
                        alert("Can't remove photo" + err);
                        return;
                    }
                });
                console.log("olo");
                document.getElementById("myava").src = "http:" + addr_apache + addr_photos + "icon.png";
                document.getElementById("my_big_ava").src = "http:" + addr_apache + addr_photos + "icon.png";
            } else { 
                alert(xhr.status + ": " + xhr.statusText);
            }
        }
    }
}

    //Функция отображения PopUp
    function PopUpShow(){
        proving_popup.style.display = "block";
    }
    //Функция скрытия PopUp
    function PopUpHide(){
        proving_popup.style.display = "none";
    }
    
function show_profile(){
    var profile = document.getElementById("profile_settings");
    if(profile.className == "profile_settings active"){
        profile.className = "profile_settings";
        document.getElementById("short_profile").className = "profile";
    } else {
        profile.className = "profile_settings active";
        document.getElementById("short_profile").className = "profile active";
    }
}