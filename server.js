const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const stompit = require('stompit');

const client = require('./client');

const app = express();
app.use(express.static('public')); // Serve static files from the "public" folder

const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));

// app.use(express.static(path.join(__dirname, 'public')));

const connectOptions = {
  host: 'localhost',
  port: 61613,
  connectHeaders: {
    host: '/',
    login: 'admin',
    passcode: 'admin'
  }
};

const subscriptionOptions = {
  destination: '/queue/myqueue',
  ack: 'client-individual'
};

stompit.connect(connectOptions, function(error, client) {
  if (error) {
    console.log('Failed to connect:', error.message);
    return;
  }

  console.log('Connected to ActiveMQ');

  const subscribeHeaders = {
    destination: subscriptionOptions.destination,
    ack: subscriptionOptions.ack
  };

  client.subscribe(subscribeHeaders, function(error, message) {
    if (error) {
      console.log('Failed to subscribe:', error.message);
      return;
    }

    message.readString('utf-8', function(error, body) {
      if (error) {
        console.log('Failed to read message:', error.message);
        return;
      }

      console.log('Received message:', body);
      message.ack();
    });
  });
});

app.get('/', (req, res) => {
  const sendHeaders = {
    destination: subscriptionOptions.destination,
    'content-type': 'text/plain'
  };

  res.sendFile(path.join(__dirname, 'index.html'));

  stompit.connect(connectOptions, function(error, client) {
    if (error) {
      console.log('Failed to connect:', error.message);
      return;
    }

    console.log('Connected to ActiveMQ');

    // client.send(sendHeaders, sendMessage, function(error) {
    //   if (error) {
    //     console.log('Failed to send message:', error.message);
    //     return;
    //   }

    //   console.log('Sent message:', sendMessage.body);
    //   res.send('Message sent!');
    // });
  });
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});

app.post('/queue', (req, res) => {
    const queueName = req.body.name;

    if (!queueName) {
        res.status(400).send('Queue name not provided.');
        return;
    }

    stompit.connect(connectOptions, (error, client) => {
        if (error) {
        console.log('Failed to connect:', error.message);
        res.status(500).send('Failed to connect to ActiveMQ broker.');
        return;
        }

        const headers = {
        destination: `/queue/${queueName}`,
        persistent: 'true',
        'content-type': 'text/plain'
        };

        const frame = client.send(headers);

        frame.write('');

        frame.end();

        console.log(`Created queue ${queueName}`);

        res.status(201).send(`Queue ${queueName} created.`);
    });
});


app.get('/queue/:name/size', (req, res) => {
    const queueName = req.params.name;
  
    stompit.connect(connectOptions, (error, client) => {
      if (error) {
        console.log('Failed to connect:', error.message);
        res.status(500).send('Failed to connect to ActiveMQ broker.');
        return;
      }
  
      const headers = {
        destination: `/queue/${queueName}`,
        receipt: 'queue-size-receipt',
        'activemq.prefetchSize': 0,
        'activemq.browser': 'true'
      };
  
      const frame = client.send(headers);
  
      frame.end();
  
      client.subscribe({ destination: 'queue-size-receipt', ack: 'client-individual' }, (error, message) => {
        if (error) {
          console.log('Failed to subscribe:', error.message);
          res.status(500).send('Failed to get queue size.');
          return;
        }
  
        let count = 0;
  
        message.readString('utf-8', (error, body) => {
          if (error) {
            console.log('Failed to read message:', error.message);
            res.status(500).send('Failed to get queue size.');
            return;
          }
  
          const lines = body.trim().split('\n');
  
          for (const line of lines) {
            const messageParts = line.trim().split(':');
  
            if (messageParts[0] === 'message-count') {
              count = parseInt(messageParts[1]);
              break;
            }
          }
  
          console.log(`Queue ${queueName} has ${count} messages`);
  
          res.status(200).send(`Queue ${queueName} has ${count} messages.`);
        });
  
        client.ack(message);
      });
    });
  });

app.delete('/queue/:name', (req, res) => {
    const queueName = req.params.name;
  
    stompit.connect(connectOptions, (error, client) => {
      if (error) {
        console.log('Failed to connect:', error.message);
        res.status(500).send('Failed to connect to ActiveMQ broker.');
        return;
      }
  
      const headers = {
        destination: `/queue/${queueName}`,
        persistent: 'true',
        'content-type': 'text/plain',
        receipt: 'queue-delete-receipt'
      };
  
      const frame = client.send(headers);
  
      frame.write('');
  
      frame.end();
  
      client.subscribe({ destination: 'queue-delete-receipt', ack: 'client-individual' }, (error, message) => {
        if (error) {
          console.log('Failed to subscribe:', error.message);
          res.status(500).send('Failed to remove queue.');
          return;
        }
  
        message.readString('utf-8', (error, body) => {
          if (error) {
            console.log('Failed to read message:', error.message);
            res.status(500).send('Failed to remove queue.');
            return;
          }
  
          console.log(`Deleted queue ${queueName}`);
  
          res.status(200).send(`Queue ${queueName} deleted.`);
        });
  
        client.ack(message);
      });
    });
  });

// Add a topic
app.post('/topic/:name', (req, res) => {
    const topicName = req.params.name;
  
    stompit.connect(connectOptions, (error, client) => {
      if (error) {
        console.log('Failed to connect:', error.message);
        res.status(500).send('Failed to connect to ActiveMQ broker.');
        return;
      }
  
      const headers = {
        destination: `/topic/${topicName}`,
        'activemq.prefetchSize': 0,
        'activemq.exclusive': 'false',
        'activemq.durable': 'false',
        'activemq.subscriptionName': 'my-subscription',
        persistent: 'true'
      };
  
      const frame = client.send(headers);
  
      frame.end();
  
      console.log(`Topic ${topicName} has been created.`);
  
      res.status(200).send(`Topic ${topicName} has been created.`);
    });
  });
  
  // Remove a topic
  app.delete('/topic/:name', (req, res) => {
    const topicName = req.params.name;
  
    stompit.connect(connectOptions, (error, client) => {
      if (error) {
        console.log('Failed to connect:', error.message);
        res.status(500).send('Failed to connect to ActiveMQ broker.');
        return;
      }
  
      const headers = {
        destination: `/topic/${topicName}`,
        receipt: 'delete-topic-receipt',
        persistent: 'true'
      };
  
      const frame = client.send(headers);
  
      frame.end();
  
      client.subscribe({ destination: 'delete-topic-receipt', ack: 'client-individual' }, (error, message) => {
        if (error) {
          console.log('Failed to subscribe:', error.message);
          res.status(500).send('Failed to remove topic.');
          return;
        }
  
        console.log(`Topic ${topicName} has been removed.`);
  
        res.status(200).send(`Topic ${topicName} has been removed.`);
  
        client.ack(message);
      });
    });
  });

