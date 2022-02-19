'use strict';

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
		knownUsers = JSON.parse(data.toString());
		for(let user of Object.keys(knownUsers).map(x=>knownUsers[x])) {
			if ('messages' in user) delete user['messages'];
		}
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
	if (!(user in knownUsers)) knownUsers[user] = {};
	knownUsers[user].lastseen = dateTime[0];
	
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
	name : "redirect clash of code",
	check : function(user, message) { return message.indexOf("https://www.codingame.com/clashofcode/clash") >= 0 && message.indexOf("report") == -1 },
	do : function(user, message) { return "hey " + user + ", dont paste those links here.  Use the channel #clash" }
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

/*
handlers.push({
	name : "teach definition",
	check : function (user, message) {
		const parts = message.split(/ +/);
		return (parts.length >= 4 && parts[2] == "=" && parts[0].toLowerCase() == "antiwonto");
	},
	do : function(user, message) {
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
		const parts = message.toLowerCase().split(/ +/);
		return (parts.length == 3 && parts[0] == "antiwonto" && parts[1] == "undefine" && parts[2] in knownDefinitions && !('removed' in knownDefinitions[parts[2]]));
	},
	do : function(user, message) {

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
*/

handlers.push({
	name : "share definition",
	check : function (user, message) {
		const term = cleanDefinitionTerm(message).replace(/whati?s?/,"");
		return ((message in knownUsers) || (term in knownDefinitions && !('removed' in knownDefinitions[term])));
	},
	do : function(user, message) {
		if (message in knownUsers) {
			return "That's a user!  Did you know that they have " + knownUsers[message].tacos + " tacos?";
		}
		const term = cleanDefinitionTerm(message).replace(/whati?s?/,"");
		return "'" + knownDefinitions[term].term + "' was defined as ' " + knownDefinitions[term].value + " ' by " + knownDefinitions[term].user;
	}
})



handlers.push({
	quietSince : Date.now(),
	quietCooldown : 60 * 60 * 1000, // 60 minutes
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
	name : "say hi",
	check : function(user, message) { 
		let m = " "+message.toLowerCase() + " ";
		return !!m.match("[^a-z0-1](yo|hi|hey|hello)[^a-z0-1]") && !!m.match("[^a-z0-1]antiwonto") && m.length < 30;
	},
	do : function(user, message) { return "hey " + user +". I'm a bot :robot:" }
});

handlers.push({
	name : "award taco",
	check : function awardTacoCheck(user, message) {
		const msg = message.split(/ +/);
		if (!!message.toLowerCase().match(":taco:") && msg.length >= 2 && msg.length <= 5) {
			for(let other of msg) {
				if (other in knownUsers) {
					return true;
				}
			}
		}
		return false
	},
	do : function awardTacoDo(user, message) {
		if (user in knownUsers && "tacoGiven" in knownUsers[user] && knownUsers[user].tacoGiven == dateTimeZ()[0]) {
			return "sorry " + user + " but you can only award tacos once per day";
		}

		const words = message.split(/ +/).filter(x=>x!=":taco:");
		for(let other of words) {
			if (other == user) {
				knownUsers[user].tacoGiven = dateTimeZ()[0];
				return "You used your taco giving ability for the day to discover that you cannot give tacos to yourself";
			}
			if (other in knownUsers) {
				if (!(user in knownUsers)) {
					trackUser(user, message);
				}
				if (!('tacos' in knownUsers[other])) knownUsers[other].tacos = 0;
				knownUsers[other].tacos += 10;
				if (!('tacos' in knownUsers[user])) knownUsers[user].tacos = 0;
				knownUsers[user].tacos += 1;
				knownUsers[user].tacoGiven = dateTimeZ()[0];
				return user + " has awarded " + other + " 10 tacos. " + other + " now has " + knownUsers[other].tacos + " taco. " + user + " now has " + knownUsers[user].tacos + " taco";
			}
		}
		return "sorry " + user + ", that user can not be found to award tacos to";
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


loadKnownUsers();

exports.save = saveKnownUsers;
exports.track = trackUser;
exports.knownUsers = function() { return knownUsers; };
exports.handlers = handlers;
