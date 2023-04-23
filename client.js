const express = require('express');
const bodyParser = require('body-parser');
const stompit = require('stompit');

const app = express();
app.use(bodyParser.json());

// Connection parameters for ActiveMQ
const amqHost = 'localhost';
const amqPort = 61613;
const amqUser = 'admin';
const amqPassword = 'admin';

// Set up connection pool to ActiveMQ
const amqConnectParams = {
  'host': amqHost,
  'port': amqPort,
  'connectHeaders': {
    'host': '/',
    'login': amqUser,
    'passcode': amqPassword,
    'heart-beat': '5000,5000'
  }
};

const amqConnectionPool = new stompit.ConnectFailover([
  amqConnectParams
], {
  'randomize': false,
  'maxReconnects': 0,
  'connectTimeout': 3000
});

 // Create a new client with a unique nickname
 app.post('/client', (req, res) => {
    const { nickname } = req.body;
  
    if (!nickname || typeof nickname !== 'string') {
      res.status(400).send('Nickname must be a non-empty string.');
      return;
    }
  
    if (clients.has(nickname)) {
      res.status(409).send('Nickname already in use. Please choose another nickname.');
      return;
    }
  
    stompit.connect(connectOptions, (error, client) => {
      if (error) {
        console.log('Failed to connect:', error.message);
        res.status(500).send('Failed to connect to ActiveMQ broker.');
        return;
      }
  
      const queueName = `${nickname}-queue`;
  
      client.subscribe({ destination: queueName, ack: 'client-individual' }, (error, message) => {
        if (error) {
          console.log('Failed to subscribe:', error.message);
          res.status(500).send('Failed to create client.');
          return;
        }
  
        console.log(`Client ${nickname} has been created.`);
  
        const newClient = { nickname, queueName, client };
        clients.set(nickname, newClient);
  
        res.status(200).send(`Client ${nickname} has been created.`);
      });
    });
  });

// Subscribe a client to a topic
app.post('/client/:nickname/subscribe', (req, res) => {
    const { nickname } = req.params;
    const { topic } = req.body;
  
    // Check if client exists
    const clientIndex = clients.findIndex(c => c.nickname === nickname);
    if (clientIndex === -1) {
      res.status(404).send(`Client with nickname ${nickname} not found`);
      return;
    }
  
    // Subscribe client to topic
    const client = clients[clientIndex];
    client.stompClient.subscribe(`/topic/${topic}`, (message) => {
      console.log(`Received message from topic ${topic}: ${message.body}`);
      const payload = JSON.parse(message.body);
  
      // Send message to client
      const senderNickname = payload.senderNickname;
      const recipientNickname = client.nickname;
      const messageContent = payload.message;
      const recipientClientIndex = clients.findIndex(c => c.nickname === recipientNickname);
      if (recipientClientIndex !== -1) {
        const recipientClient = clients[recipientClientIndex];
        const recipientSocket = recipientClient.socket;
        recipientSocket.send(JSON.stringify({
          type: 'message',
          senderNickname,
          message: messageContent
        }));
      } else {
        console.log(`Recipient ${recipientNickname} is offline. Storing message for later delivery.`);
        offlineMessages.push({
          senderNickname,
          recipientNickname,
          message: messageContent
        });
      }
    });
  
    res.send(`Client ${nickname} subscribed to topic ${topic}`);
  });
  

  // Send a message from one client to another
  app.post('/client/:senderNickname/send', (req, res) => {
    const { recipientNickname, message } = req.body;
    const { senderNickname } = req.params;
  
    if (!recipientNickname || typeof recipientNickname !== 'string') {
      res.status(400).send('Recipient nickname must be a non-empty string.');
      return;
    }
  
    if (!message || typeof message !== 'string') {
      res.status(400).send('Message must be a non-empty string.');
      return;
    }
  
    if (!clients.has(senderNickname)) {
      res.status(404).send(`Client ${senderNickname} not found.`);
      return;
    }
  
    if (!clients.has(recipientNickname)) {
      // Store the message for delivery when the recipient comes online
      offlineMessages.set(recipientNickname, { senderNickname, message });
  
      console.log(`Client ${recipientNickname} is not online. Message from ${senderNickname} will be delivered later.`);
      res.status(200).send(`Client ${recipientNickname} is not online. Message from ${senderNickname} will be delivered later.`);
      return;
    }
  
    const senderClient = clients.get(senderNickname);
    const recipientClient = clients.get(recipientNickname);
  
    const messageHeaders = {
      'sender': senderNickname,
      'recipient': recipientNickname
    };
  
    const frame = senderClient.client.send({
      destination: `/queue/${recipientNickname}`,
      headers: messageHeaders
    });
  
    frame.write(message);
    frame.end();
  
    console.log(`Message from ${senderNickname} to ${recipientNickname} sent successfully.`);
    res.status(200).send(`Message from ${senderNickname} to ${recipientNickname} sent successfully.`);
  });