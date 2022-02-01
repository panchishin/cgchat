/*eslint-env es6, node*/

"use strict";

const { exception } = require('console');
// *****************************
// Requires

const xmpp = require('simple-xmpp'),
      config = require('./config.json'),
      fs = require('fs'),
      moment = require('moment'),
      _ = require('underscore'),
      Stanza = require('node-xmpp-client').Stanza,
      path = require('path'),
      spawn = require('cross-spawn');

// *****************************
// Globals

let cores = {},
    queueTimer,
    queue = [],
    killed = false;

// *****************************
// Functions

let kill = (code) => {
  if (killed) {
    return;
  }

  killed = true;

  console.log('[INFO] Closing process');

  clearInterval(queueTimer);

  config.groupchats.forEach(groupchat => {
    if (cores[groupchat]) {
      cores[groupchat].kill();
      cores[groupchat] = undefined;
    }
  });

  setTimeout(() => process.exit(code), 1000);
};

let sendMessage = function(conference, message) {
    try {
      let stanza = new Stanza('message', {
        to: conference + '@' + config.muc,
        type: 'groupchat',
        id: config.nickname + new Date().getTime()
      });
      stanza.c('body').t(message);  
      queue.push(stanza);
    } catch (e) {
      console.log('[ERROR]', e);
    }
}

// *****************************
// Main

config.groupchats = config.groupchats.map(groupchat => groupchat.toLowerCase());

xmpp.on('online', data => {
  console.log('[INFO] Online:', data);
  fs.readdir(config.data, (error, files) => {
    config.groupchats.forEach(groupchat => {
      xmpp.join(groupchat + '@' + config.muc + '/' + config.nickname);
    });
  });
});

xmpp.on('groupchat', (conference, from, message, stamp, delay) => {
  console.log("[Received] " + conference + " : " + from + " : '" + message + "'");
  // if (from.toLowerCase() != config.nickname.toLowerCase()) {
  // }
  if (message == "tell me about cats") {
    sendMessage("csb", from + " I dont know about cats")
  }
});

xmpp.on('error', error => {
  console.log('[ERROR] XMPP Error', error);
});

xmpp.on('close', data => {
  console.log('[ERROR] Connection closed:', data);
  kill(1);
});

console.log('[INFO] Connecting to', config.host + ':' + config.port);

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

// sendMessage("csb", "counting")
// sendMessage("csb", "one")
// sendMessage("csb", "two")
// sendMessage("csb", "three")
