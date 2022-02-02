/*eslint-env es6, node*/
"use strict";

const xmpp = require('simple-xmpp'),
      config = require('./config.json'),
      Stanza = require('node-xmpp-client').Stanza;

let queueTimer = null,
    queue = [],
    killed = false,
    readyToRespond = false;


let kill = (code) => {
  if (killed) { return; }
  killed = true;
  console.log('[INFO] Closing process');
  clearInterval(queueTimer);
  setTimeout(() => process.exit(code), 1000);
};

function startQueueTimer() {
  clearInterval(queueTimer);
  queueTimer = setInterval(function() {
    if (queue.length) {
        xmpp.conn.send(queue[0]);
        queue.shift();
    } else {
      clearInterval(queueTimer)
    }
  }, 4000);
}

let sendMessage = function(conference, message) {
    try {
      queue = [];
      let stanza = new Stanza('message', {
        to: conference,
        type: 'groupchat',
        id: config.nickname + new Date().getTime()
      });
      stanza.c('body').t(message);  

      queue.push(stanza);
      startQueueTimer();
    } catch (e) {
      console.log('[ERROR]', e);
    }
}

const responseHandlers = [
  {
    name : "clash of code",
    check : function(message) { return message.indexOf("https://www.codingame.com/clashofcode/clash") >= 0 },
    do : function(user) { return "hey " + user + ", dont paste those links here.  Use the channel #clash" }
  },
  {
    name : "hi wontonimo",
    check : function(message) { return message.toLowerCase().match("(hi|hey|hello) *wontonimo.?") },
    do : function(user) { return "hey there " + user }
  }
]



// **************  XMPP CODE *****************

xmpp.on('online', data => {
  console.log('[INFO] Online:', data);
  config.groupchats.forEach(groupchat => {
    xmpp.join(groupchat + '@' + config.muc + '/' + config.nickname);
  });
  console.log("[Online] paused readyToRespond");
  setTimeout(()=> { 
    readyToRespond = true;
    console.log("[Online] enabled readyToRespond");
  }, 5000);
});

xmpp.on('chat', function(from, message) {
  console.log("[Personal Received] " + from + " : '" + message + "'");
  //xmpp.send(from, 'echo: ' + message);
});

xmpp.on('groupchat', (conference, from, message, stamp, delay) => {
  console.log("[Group Received] " + from + " : '" + message + "'");
  if (readyToRespond) {
    for (let handler of responseHandlers) {
      if (handler.check(message)) {
        console.log("[Matched response] " + handler.name)
        sendMessage(conference, "[automated] " + handler.do(from));
        break;
      } else {
        // console.log("[Skipped response] " + handler.name)
      }
    }
  }
});

xmpp.on('error', error => {
  console.log('[ERROR] XMPP Error', error);
});

xmpp.on('close', data => {
  console.log('[ERROR] Connection closed:', data);
  kill(1);
});

xmpp.connect({
  jid: config.jid,
  password: config.password,
  host: config.host,
  port: config.port
});



process.on('exit', kill);
process.on('SIGINT', kill);
process.on('SIGUSR1', kill);
process.on('SIGUSR2', kill);
process.on('uncaughtException', kill);