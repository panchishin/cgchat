/*eslint-env es6, node*/
"use strict";

const xmpp = require('simple-xmpp'),
      config = require('./config.json'),
      Stanza = require('node-xmpp-client').Stanza;

let queueTimer,
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


let sendMessage = function(conference, message) {
    try {
      let stanza = new Stanza('message', {
        to: conference,
        type: 'groupchat',
        id: config.nickname + new Date().getTime()
      });
      stanza.c('body').t(message);  
      queue.push(stanza);
    } catch (e) {
      console.log('[ERROR]', e);
    }
}






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
  xmpp.send(from, 'echo: ' + message);
});

xmpp.on('groupchat', (conference, from, message, stamp, delay) => {
  if (readyToRespond) {
    console.log("[Received] " + conference + " : " + from + " : '" + message + "'");
    if (message == "antiwonto tell me about mcts") {
      sendMessage(conference, from + " I dont know about mcts")
    }
    // I nominate 5DN1L for a golden taco award

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

queueTimer = setInterval(function() {
  if (queue.length) {
      xmpp.conn.send(queue[0]);
      queue.shift();
  }
}, 4000);

process.on('exit', kill);
process.on('SIGINT', kill);
process.on('SIGUSR1', kill);
process.on('SIGUSR2', kill);
process.on('uncaughtException', kill);