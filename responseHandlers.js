'use strict';

const SUPER_USERS = { '811622@chat.codingame.com' : 'Scarfield',
  '4081634@chat.codingame.com' : 'Wontonimo',
  '1540478@chat.codingame.com' : 'struct',
  "3136787@chat.codingame.com" : "jacek" };

const fs = require('fs');
const solver = require('./solver.js');

function dateTimeZ() { return new Date().toISOString().split('T'); }
function rot13(s) { return s.replace(/[a-zA-Z]/g,function(c){return String.fromCharCode((c<="Z"?90:122)>=(c=c.charCodeAt(0)+13)?c:c-26);}); }


let knownDefinitions = {};

function loadKnownDefinitions() {
	fs.readFile('knownDefinitions.json', 'utf-8', (err, data) => {
		if (err) { throw err; }
		knownDefinitions = JSON.parse(data.toString());
	});
}
loadKnownDefinitions();

function addDefinitions(term, definition, user) {
	knownDefinitions[term.toLowerCase()] = {term:term, value:definition, user:user};
	try {
		console.log("[SAVING] started knownDefinitions");
		fs.writeFileSync('knownDefinitions.json', JSON.stringify(knownDefinitions, null, 2));
		console.log("[SAVING] finished knownDefinitions");
	} catch (error) {
		console.error(err);
	}
}

function removeDefinitions(term, user) {
	knownDefinitions[term.toLowerCase()].removed = true;
	try {
		console.log("[SAVING] started knownDefinitions");
		fs.writeFileSync('knownDefinitions.json', JSON.stringify(knownDefinitions, null, 2));
		console.log("[SAVING] finished knownDefinitions");
	} catch (error) {
		console.error(err);
	}
}

let knownUsers = {};

function loadKnownUsers() {
	fs.readFile('users.json', 'utf-8', (err, data) => {
		if (err) { throw err; }
		let badUsers = [];
		knownUsers = JSON.parse(data.toString());
		for(let userName of Object.keys(knownUsers)) {
			let user = knownUsers[userName];
			// if ('messages' in user) delete user['messages'];
			if ('tacos' in user) {
				if (isNaN(user.tacos)) {
					user.tacos = 1;
					console.log("Updating " + userName + " to have " + user.tacos + " tacos")
				}
			} else {
				user.tacos = 1;
				console.log("Updating " + userName + " to have " + user.tacos + " tacos")
			}
		}
		// for(let userName of badUsers) delete knownUsers[userName];
	});
}

function saveKnownUsers() {
	try {
		console.log("[SAVING] started knownUsers");
		fs.writeFileSync('users.json', JSON.stringify(knownUsers));
		console.log("[SAVING] finished knownUsers");
	} catch (error) {
		console.error(err);
	}
}

function appendLogFile(dateTime, user, message) {
	const fs = require('fs');
	fs.appendFileSync('logs/date-'+dateTime[0]+'.json', JSON.stringify({time:dateTime[1],user:user,text:message}) + "\n");
}

function trackUser(user, message) {
	let dateTime = dateTimeZ();
	if (!(user in knownUsers)) knownUsers[user] = {tacos: 0, lastseen: dateTime[0], tacoGiven: ""};
	
	if (!('tacoGiven' in knownUsers[user])) knownUsers[user].tacoGiven = "";

	appendLogFile(dateTime, user, message)
}

let handlers = [];


handlers.push({
	name : "identify bad words",
	badwords : rot13('phag avttre avtre avtte snt snttbg nff nffubyr shpx shpxre shpxvat cravf chffl onyyf fuvg gheq gjng shpxsnpr onqjbeq').split(" ").map(x=>" "+x),
	check : function badLanguage(user, message) {
		let padded = " " + message.toLowerCase().replace(/[^a-z ]/,"") + " "
		for (let word of this.badwords) {
			if (padded.indexOf(word + " ") >= 0) return true;
			if (padded.indexOf(word + "s ") >= 0) return true;
			if (padded.indexOf(word + "'s ") >= 0) return true;
		}
		return false;
	},
	do : function(user, message) { 
		return user + " be respectful and watch your language\nhttps://www.codingame.com/playgrounds/40701/help-center/code-of-conduct"
	}
});

handlers.push({
	searches : {
		"exec(bytes": "that looks like python golf compression.  It's legit, and acceptable to use.  You may be interested in this tool https://clemg.github.io/pythongolfer/",
		"golf compression":"talking aboutt golf Compression? ruby like eval'杓敶恿...栅'.encode(‘UCS-2BE’).b , js lie eval(’’+Buffer('杓敶恿...栅','ucs2') , python like exec(bytes('杓敶恿...栅','u16')[2:])",
		"https://www.codingame.com/clashofcode/clash": "dont paste those links here.  Use the channel #clash",
		"teach me": "looking for some intro tutorials on programming?  This isn't the place probably.  Try codecademy.com , 'The Coding Train' on youtube, or first levels in codewars.com"
	},
	name : "common phrase responses",
	check : function(user, message) { 
		for(let key of Object.keys(this.searches)){
			if (message.indexOf(key) >= 0) return 1;
		}
		return 0;
	},
	do : function(user, message) { 
		for(let key of Object.keys(this.searches)){
			if (message.indexOf(key) >= 0) return "hey " + user + " " + this.searches[key];
		}
		return "woops, I'm confused";
	}
});

handlers.push({
	name : "lmgtfy",
	check : function lmgtfyCheck(user, message) {
		let parts = message.split(" ");
		return (parts.length >= 3 && 
			user in knownUsers &&
			('tacos' in knownUsers[user]) && 
			knownUsers[user].tacos > 1 && 
			parts[0] == "lmgtfy");
	},
	do : function lmgtfyDo(user, message) {
		let parts = message.split(" ");
		if (!(parts[1] in knownUsers)) {
			return "try 'lmgtfy [username] search'";
		}
		return "hey " + parts[1] + " let me google that for you https://letmegooglethat.com/?q=" + parts.slice(2).join("+"); 
	}
});

function cleanDefinitionTerm(term) {
	return term.toLowerCase().replace(/[^\-\+0-9a-z:_\]\[]/g,"")
}


handlers.push({
	name : "teach definition",
	check : function (user, message) {
		if (!(user in SUPER_USERS)) return false;
		const parts = message.split(/ +/);
		return (parts.length >= 4 && parts[2] == "=" && parts[0].toLowerCase() == "antiwonto");
	},
	do : function(user, message) {
		user = SUPER_USERS[user];
		
		// must be a known user
		if (!(user in knownUsers)) { return "Sorry "+user+" but I have to get to know you more before you can make definitions"};
		const tacos = 'tacos' in knownUsers[user] ? knownUsers[user].tacos : 0;
		// must have at least 30 tacos
		if (tacos < 30) { return "Sorry "+user+" but you need 30 tacos to make definitions.  You have " + tacos + " tacos"};
		// can't already be defined
		const parts = message.split(/ +/);
		const term = cleanDefinitionTerm(parts[1]);
		const definition = parts.slice(3).join(" ");
		if (term in knownDefinitions) { 
			if ('removed' in knownDefinitions[term]) {
				return "Sorry "+user+" but that term cannot be defined";
			} else {
				return "Sorry "+user+" but there is already a definition for that";
			}
		}
		if (Object.keys(knownUsers).map(x=>x.toLowerCase()).indexOf(term.toLowerCase()) >= 0) {
			knownUsers[user].tacos -= 5;
			return user+" you have spent 5 tacos to discover you cannot define a user name";
		}

		addDefinitions(term, definition, user);
		knownUsers[user].tacos -= 5;
		return "Thank you for spending 5 tacos to teach me about '" + term + "'. You now have " + knownUsers[user].tacos + " tacos";		
	}
})

handlers.push({
	name : "remove definition",
	check : function (user, message) {
		if (!(user in SUPER_USERS)) return false;
		const parts = message.toLowerCase().split(/ +/);
		return (parts.length == 3 && parts[0] == "antiwonto" && parts[1] == "undefine" && parts[2] in knownDefinitions && !('removed' in knownDefinitions[parts[2]]));
	},
	do : function(user, message) {
		user = SUPER_USERS[user];

		// must be a known user
		if (!(user in knownUsers)) { return "Sorry "+user+" but I have to get to know you more before you can remove definitions"};
		const tacos = 'tacos' in knownUsers[user] ? knownUsers[user].tacos : 0;
		// can't already be defined
		const parts = message.toLowerCase().split(/ +/);
		const term = parts[2];

		if (Object.keys(knownUsers).map(x=>x.toLowerCase()).indexOf(term.toLowerCase()) >= 0) {
			removeDefinitions(term, user);
			knownUsers[user].tacos += 20;
			return "Thank you for notifying me of that.  Here is 20 tacos for the discovery!";
		}
		// must have at least 30 tacos
		if (tacos < 50) { return "Sorry "+user+" but you need 50 tacos to remove a definition.  You have " + tacos + " tacos"};

		removeDefinitions(term, user);
		knownUsers[user].tacos -= 1;
		return "Thank you for spending 1 tacos to remove that term.  It is removed forever.";
	}
})


handlers.push({
	name : "share definition",
	check : function (user, message) {
		const term = cleanDefinitionTerm(message).replace(/whati?s?/,"");
		return (term in knownDefinitions && !('removed' in knownDefinitions[term]));
	},
	do : function(user, message) {
		const term = cleanDefinitionTerm(message).replace(/whati?s?/,"");
		return "'" + knownDefinitions[term].term + "' was defined as ' " + knownDefinitions[term].value + " '";
	}
})



handlers.push({
	quietSince : Date.now(),
	quietCooldown : 30 * 60 * 1000, // 60 minutes
	name : "welcome known user",
	check : function knownUserCheck(user, message) {
		const quiet = (Date.now() - this.quietSince > this.quietCooldown);
		this.quietSince = Date.now();
		if (quiet && user in knownUsers && 'lastseen' in knownUsers[user] && knownUsers[user].lastseen != dateTimeZ()[0]) {
			knownUsers[user] == dateTimeZ()[0];
			return true;
		}
		return false;
	},
	do : function knownUserDo(user, message) {
		if (!('tacos' in knownUsers[user])) knownUsers[user].tacos = 0;
		knownUsers[user].tacos += 1;
		return "Hey " + user + ", here is a :taco: for loggin in today while it is quiet.  You now have " + knownUsers[user].tacos + " tacos";
	}
});


handlers.push({
	lastUnknownUserTime : Date.now(),
	lastUnknownUserCooldown : 30 * 60 * 1000, // 30 minutes
	name : "welcome new user",
	check : (user, message) => (!(user in knownUsers) && (Date.now() - this.lastUnknownUserTime > this.lastUnknownUserCooldown)),
	do : function(user, message) {
		this.lastUnknownUserTime = Date.now();
		return "Welcome " + user + ", have't seen you before\nA friendly reminder to be respectful";
	}
});

handlers.push({
	name : "what can the bot do",
	check : function(user, message) {
		message = message.toLowerCase();
		return message.indexOf("what") >= 0 && message.indexOf("antiwonto") >= 0 && message.indexOf("do") >= 0 && message.length < 50;
	},
	do : function(user, message) {
		return "Here are the commands I know : " + Object.keys(handlers).map(x=>handlers[x].name).join(", ");
	}
});


handlers.push({
	name : "solve equation",
	check : function(user, message) {
		if (solver.isQuestion(message)) {
			try {
				solver.solveQuestion(message);
				return true;
			} catch(e) {

			}
		};
		return false;
	},
	do : function(user, message) {
		return "x = " + solver.solveQuestion(message);
	}
});

function namedUser(message) {
	const msg = message.split(/ +/);
	for(let other of msg) {
		if (other in knownUsers) {
			return other;
		}
	}
	return "";
}

handlers.push({
	name : "award taco",
	check : function awardTacoCheck(user, message) {
		const msg = message.split(/ +/);
		if (!!message.toLowerCase().match(":taco:") && msg.length >= 2 && msg.length <= 5) {
			return namedUser(message) != "";
		}
		return false
	},
	do : function awardTacoDo(user, message) {
		if (!(user in knownUsers)) {
			trackUser(user, message);
		}

		if ("tacoGiven" in knownUsers[user] && knownUsers[user].tacoGiven == dateTimeZ()[0]) {
			return "sorry " + user + " but you can only award tacos once per day";
		}

		if (knownUsers[user].tacos < 3) {
			return "Sorry " + user + " but you need 3 tacos to give tacos.  You have " + knownUsers[user].tacos + " now.  Get someone to give you more tacos first"
		}

		let other = namedUser(message);
		if (other == user) {
			knownUsers[user].tacoGiven = dateTimeZ()[0];
			return "You used your taco giving ability for the day to discover that you cannot give tacos to yourself";
		}
		if (other in knownUsers) {
			if (!('tacos' in knownUsers[other])) knownUsers[other].tacos = 0;
			let award = Math.min(10, knownUsers[other].tacos+1, knownUsers[user].tacos);
			knownUsers[other].tacos += award;
			if (!('tacos' in knownUsers[user])) knownUsers[user].tacos = 0;
			knownUsers[user].tacos += 1;
			knownUsers[user].tacoGiven = dateTimeZ()[0];
			return user + " has awarded " + other + " "+award+" tacos. " + other + " now has " + knownUsers[other].tacos + " taco. " + user + " now has " + knownUsers[user].tacos + " taco";
		}
		return "sorry " + user + ", that user can not be found to award tacos to";
	}
});

let tacos_on_floor = 0;
let last_to_take_tacos = "";

handlers.push({
	name : "throw tacos",
	check : function(user, message) { 
		let m = " "+message.toLowerCase() + " ";
		return !!m.match("[^a-z0-1]throw[^a-z0-1]") && !!m.match("[^a-z0-1]taco") && m.length < 30 && 'tacos' in knownUsers[user] && knownUsers[user].tacos > 0;
	},
	do : function(user, message) {
		let thrown_tacos = Math.min(knownUsers[user].tacos,10);
		knownUsers[user].tacos -= thrown_tacos;
		tacos_on_floor += thrown_tacos - 1;
		return user + " has thrown " + thrown_tacos + " :taco:s on the floor for the taking but 1 was eaten by a software bugs!";
	}
});


let attributes = ['Strength','Dexterity','Intelligence','Style','Charm','Swag'];
function randAttribute() {
	return attributes[Math.floor(Math.random()*attributes.length)];
}


handlers.push({
	name : "eat tacos",
	check : function(user, message) { 
		let m = " "+message.toLowerCase() + " ";
		return !!m.match("[^a-z0-1]eat[^a-z0-1]") && !!m.match("[^a-z0-1]taco") && m.length < 30 && user in knownUsers && 'tacos' in knownUsers[user] && knownUsers[user].tacos > 0;
	},
	do : function(user, message) {
		if (knownUsers[user].tacos < 10) {
			return "you need at least 10 tacos to make a proper meal";
		}
		let eaten_tacos = Math.min(knownUsers[user].tacos,10);
		knownUsers[user].tacos -= eaten_tacos;
		let attribute = randAttribute();
		if (!(attribute in knownUsers[user])) { knownUsers[user][attribute] = 0}
		knownUsers[user][attribute] += 1;
		last_to_take_tacos = user;
		return user + " has eaten " + eaten_tacos + " :taco: and your " + attribute + " is now " + knownUsers[user][attribute] +".  You have " + knownUsers[user].tacos + " left";
	}
});

handlers.push({
	name : "huntdown tacos",
	check : function(user, message) { 
		let m = message.toLowerCase();
		return !!m.match("^huntdown.*taco");
	},
	do : function(user, message) {
		for(let name of Object.keys(knownUsers)) {
			if ('tacos' in knownUsers[name] && knownUsers[name].tacos >= 50) {
				return "Looks like " + name + " has " + knownUsers[name].tacos + " tacos";
			}
		}
		return "Cant find anyone with enough tacos";
	}
});

handlers.push({
	name : "shakedown tacos",
	check : function(user, message) { 
		let m = " "+message.toLowerCase() + " ";
		return !!m.match("[^a-z0-1]shakedown[^a-z0-1]") && namedUser(message) != "";
	},
	do : function(user, message) {
		// need to use tacos to shake other and other needs tacos
		if (!('tacos' in knownUsers[user])) return "you need to have :taco:s to do a shakedown";
		if (knownUsers[user].tacos < 3) return "you need at least 3 :taco:s to do a shakedown";

		let other = namedUser(message);
		if (other == "") return "name another user in your shakedown";
		if (!('tacos' in knownUsers[other])) return other + " needs to have :taco:s to do a shakedown";
		if (knownUsers[other].tacos < 50) return other + " needs at least 50 :taco:s to do a shakedown";

		// compare some stat
		let attribute = randAttribute();
		let user_val = attribute in knownUsers[user] ? knownUsers[user][attribute] : 0;
		let other_val = attribute in knownUsers[other] ? knownUsers[other][attribute] : 0;

		// calculate fallout
		last_to_take_tacos = user;
		if (user_val+Math.random()*4 > other_val+Math.random()*4) {
			knownUsers[other].tacos -= 10;
			tacos_on_floor += 9;
			
			if (user_val > other_val) {
				return "Using your superior " + attribute + " of " + user_val + " you shake 10 :taco:s off of " + other + ".  9 fall on the floor, 1 got crushed, and you lost 1";
			} else {
				return "Although your " + attribute + " of " + user_val + " is inferior you luck out and shake 10 :taco:s off of " + other + ".  9 fall on the floor, 1 got crushed, and you lost 1";
			}
		} else {
			tacos_on_floor += 2;
			knownUsers[user].tacos -= 3;
			
			if (user_val > other_val) {
				return "Using your superior " + attribute + " of " + user_val + " you still fail, dropping 3 tacos and crushing 1";
			} else {
				return "Your " + attribute + " of " + user_val + " is inferior and you drop 3 tacos and 1 got crushed";
			}
		}
	}
});



handlers.push({
	name : "take tacos",
	check : function(user, message) { 
		let m = " "+message.toLowerCase() + " ";
		return !!m.match("[^a-z0-1]take[^a-z0-1]") && !!m.match("[^a-z0-1]taco") && m.length < 30;
	},
	do : function(user, message) {
		if (tacos_on_floor <= 0) {
			return "aww, there are no tacos to take";
		}
		if (last_to_take_tacos == user) {
			return "sorry " + user + " but you have to give someone else a turn";
		}
		if (!('tacos' in knownUsers[user])) {
			knownUsers[user].tacos = 0;
		}
		let taken_tacos = Math.min(knownUsers[user].tacos+1, Math.max(Math.round(tacos_on_floor/2), Math.min(2, tacos_on_floor)));
		if (!(user in knownUsers)) {
			trackUser(user, message);
		}
		knownUsers[user].tacos += taken_tacos;
		tacos_on_floor -= taken_tacos;
		last_to_take_tacos = user;
		return user + " has taken " + taken_tacos + " :taco:s off the floor and now has " + knownUsers[user].tacos + ".  There are " + tacos_on_floor + " left";
	}
});


handlers.push({
	name : "say hi",
	check : function(user, message) { 
		let m = " "+message.toLowerCase() + " ";
		return !!m.match("[^a-z0-1](yo|hi|hey|hello)[^a-z0-1]") && !!m.match("[^a-z0-1]antiwonto") && m.length < 30;
	},
	do : function(user, message) { return "hey " + user +". I'm a bot :robot:" }
});


loadKnownUsers();

exports.SUPER_USERS = SUPER_USERS;
exports.save = saveKnownUsers;
exports.track = trackUser;
exports.knownUsers = function() { return knownUsers; };
exports.handlers = handlers;
