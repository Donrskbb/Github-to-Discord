// webhook.js

const express = require('express');
const https = require('https');
const bodyParser = require('body-parser');
const { discordWebhookUrl } = require('./config');
const log = require('./util')

const app = express();
const PORT = process.env.PORT || 40125;

app.use(bodyParser.json());

// Function to send HTTP POST request to Discord webhook
function sendDiscordWebhook(payload) {
  const params = JSON.stringify(payload);
  const url = new URL(discordWebhookUrl);

  const options = {
    hostname: url.hostname,
    port: 443,
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(params)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        resolve(responseData);
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(params);
    req.end();
  });
}

// Function to create embed message for Discord based on GitHub event
function createEmbed(eventType, payload) {
  switch (eventType) {
    case 'push':
      return {
        title: 'New Push Event',
        description: `New push by ${payload.pusher.name} to ${payload.repository.full_name}`,
        color: 0x7289da,
        fields: [
          {
            name: 'Commit Message',
            value: payload.head_commit.message
          }
        ],
        footer: {
          text: `Repository: ${payload.repository.full_name}`
        },
        author: {
          name: payload.pusher.name
        }
      };

    case 'issues':
      return {
        title: `Issue ${payload.action}: ${payload.issue.title}`,
        description: payload.issue.body,
        color: 0x7289da,
        footer: {
          text: `Repository: ${payload.repository.full_name}`
        },
        author: {
          name: payload.issue.user.login
        },
        url: payload.issue.html_url
      };

    case 'issue_comment':
      return {
        title: `New comment on issue: ${payload.issue.title}`,
        description: payload.comment.body,
        color: 0x7289da,
        footer: {
          text: `Repository: ${payload.repository.full_name}`
        },
        author: {
          name: payload.comment.user.login
        },
        url: payload.comment.html_url
      };

    case 'pull_request':
      return {
        title: `Pull Request ${payload.action}: ${payload.pull_request.title}`,
        description: payload.pull_request.body,
        color: 0x7289da,
        footer: {
          text: `Repository: ${payload.repository.full_name}`
        },
        author: {
          name: payload.pull_request.user.login
        },
        url: payload.pull_request.html_url
      };

    case 'pull_request_review':
      return {
        title: `Pull Request Review ${payload.action}`,
        description: payload.review.body,
        color: 0x7289da,
        footer: {
          text: `Repository: ${payload.repository.full_name}`
        },
        author: {
          name: payload.review.user.login
        },
        url: payload.review.html_url
      };

    case 'pull_request_review_comment':
      return {
        title: `New comment on pull request: ${payload.pull_request.title}`,
        description: payload.comment.body,
        color: 0x7289da,
        footer: {
          text: `Repository: ${payload.repository.full_name}`
        },
        author: {
          name: payload.comment.user.login
        },
        url: payload.comment.html_url
      };

    case 'star':
      return {
        title: `Repository ${payload.action}`,
        description: `${payload.sender.login} ${payload.action}d the repository.`,
        color: 0x7289da,
        footer: {
          text: `Repository: ${payload.repository.full_name}`
        },
        author: {
          name: payload.sender.login
        },
        url: payload.repository.html_url
      };

    case 'fork':
      return {
        title: `Repository forked`,
        description: `${payload.sender.login} forked the repository.`,
        color: 0x7289da,
        footer: {
          text: `Repository: ${payload.repository.full_name}`
        },
        author: {
          name: payload.sender.login
        },
        url: payload.forkee.html_url
      };

    // Add more cases as needed for other events

    default:
      return null;
  }
}

// Route to handle GitHub webhook events
app.post('/webhook', (req, res) => {
  const eventType = req.headers['x-github-event'];
  const payload = req.body;

  const embed = createEmbed(eventType, payload);

  if (embed) {
    // Send embed data to Discord webhook
    sendDiscordWebhook({ embeds: [embed] })
      .then(() => {
        log.success(`Successfully sent ${eventType} event to Discord`);
        res.status(200).send('Message sent to Discord');
      })
      .catch(error => {
        log.error(`Error sending ${eventType} event to Discord`, error);
        res.status(500).send('Error sending message to Discord');
      });
  } else {
    res.status(200).send('Event ignored');
  }
});

// Route to handle GitHub webhook ping event
app.get('/webhook', (req, res) => {
  log.debug('Received GitHub webhook ping');
  res.status(200).send('Webhook is configured correctly');
});

// Start server
app.listen(PORT, () => {
  log.info(`online`)
  log.info('Server is running on port ' + PORT);
  log.info('Webhook receiver listening at http://0.0.0.0:' + PORT + '/webhook');
});
