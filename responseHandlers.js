const fs = require('fs');

let knownUsers = {};

function loadKnownUsers() {
	fs.readFile('users.json', 'utf-8', (err, data) => {
		if (err) { throw err; }
		knownUsers = JSON.parse(data.toString());
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

function trackUser(user, message) {
	if (!(user in knownUsers)) knownUsers[user] = {};
	knownUsers[user].lastseen = yyyymmdd();

	if (!('messages' in knownUsers[user])) knownUsers[user].messages = [];
	knownUsers[user].messages.unshift({text:message, day:yyyymmdd()});

	knownUsers[user].messages = knownUsers[user].messages.slice(0,10);
}

function yyyymmdd() { return new Date().toISOString().split('T')[0]; }


function unknownUserCheck(user, message) {
	return (!(user in knownUsers));
}

function unknownUserDo(user, message) {
	return "Welcome " + user + ", have't seen you before\nA friendly reminder to be respectful";
}

function knownUserCheck(user, message) {
	if (user in knownUsers && 'lastseen' in knownUsers[user] && knownUsers[user].lastseen != yyyymmdd()) {
		knownUsers[user] == yyyymmdd();
		return true;
	}
	return false;
}
function knownUserDo(user, message) {
	return "Hey " + user + ", first time seeing you online today";
}

const badWords = "cunt fag faggot ass asshole fuck fucker fucking penis pussy balls shit turd twat fuckface badword".split(" ").map(x=>" "+x);
function badLanguage(user, message) {
	let padded = " " + message.toLowerCase().replace(/[^a-z ]/,"") + " "
	for (let word of badWords) {
		if (padded.indexOf(word + " ") >= 0) return true;
		if (padded.indexOf(word + "s ") >= 0) return true;
		if (padded.indexOf(word + "'s ") >= 0) return true;
	}
	return false;
}

function repeatingSelf(user, message) {
	return (user in knownUsers && 
		"messages" in knownUsers[user] && 
		knownUsers[user].messages.length > 2 && 
		message == knownUsers[user].messages[0].text &&
		yyyymmdd() == knownUsers[user].messages[0].day &&
		message != knownUsers[user].messages[1].text);
}


loadKnownUsers();

exports.save = saveKnownUsers;
exports.track = trackUser;
exports.knownUsers = function() { return knownUsers; };
exports.handlers = {
	// "unknown user" : {
	// 	check : unknownUserCheck,
	// 	do : unknownUserDo
	// },
	"naughty language" : {
		check : badLanguage,
		do : function(user, message) { return user + " be respectful and watch your language\nhttps://www.codingame.com/playgrounds/40701/help-center/code-of-conduct" }
	},
	"user looping" : {
		check : repeatingSelf,
		do : function(user, message) { return user + " please don't repeat yourself"}
	},
	"clash of code" : {
		check : function(user, message) { return message.indexOf("https://www.codingame.com/clashofcode/clash") >= 0 && message.indexOf("report") == -1 },
		do : function(user, message) { return "hey " + user + ", dont paste those links here.  Use the channel #clash" }
	},
	"hello" : {
		check : function(user, message) { 
			let m = " "+message.toLowerCase() + " ";
			return !!m.match("[^a-z0-1](yo|hi|hey|hello)[^a-z0-1]") && !!m.match("[^a-z0-1]antiwonto") && m.length < 30;
		},
		do : function(user, message) { return "hey " + user +". I'm a bot :robot:" }
	}
};
