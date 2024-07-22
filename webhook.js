// app.js

const express = require("express");
const https = require("https");
const bodyParser = require("body-parser");
const { BranchStatus, EventStatuses, LANGUAGES } = require("./src/config");
const { discordWebhookUrl, Port, WebHookUrl } = require("./src/webconfig");

const log = require("./src/util");

const fs = require("fs");
const language = JSON.parse(
  fs.readFileSync(`./language/${LANGUAGES}.json`, "utf-8")
);

const app = express();
const PORT = Port || 40125;

app.use(bodyParser.json());

// Function to send HTTP POST request to Discord webhook
function sendDiscordWebhook(payload) {
  const params = JSON.stringify(payload);
  const url = new URL(discordWebhookUrl);

  const options = {
    hostname: url.hostname,
    port: 443,
    path: url.pathname + url.search, // Include query string if present
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(params),
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        if (res.statusCode === 204) {
          resolve(responseData);
        } else {
          const error = new Error(`Received status code ${res.statusCode}: ${responseData}`);
          log.error(`${error.message}\nResponse Body: ${responseData}`);
          reject(error);
        }
      });
    });

    req.on("error", (error) => {
      log.error(`Request Error: ${error.message}`);
      reject(error);
    });

    req.write(params);
    req.end();
  });
}

// Function to create embed message for Discord based on GitHub event
function createEmbed(eventType, payload) {
  switch (eventType) {
    case "push":
      if (payload.pusher && payload.repository && payload.commits) {
        const commits = payload.commits;
        const fields = commits.map(commit => ({
          name: commit.message,
          value: `Commit by ${commit.author.name}`,
          inline: false,
        }));

        return {
          title: `Push Event: ${payload.pusher.name}`,
          description: `New push to ${payload.repository.name}`,
          color: 0x7289da,
          fields: fields,
          footer: {
            text: `Repository: ${payload.repository.name}`,
          },
          author: {
            name: payload.pusher.name,
            icon_url: payload.pusher.avatar_url || null,
          },
        };
      }
      break;

    case "issues":
      if (payload.action && payload.issue && payload.repository) {
        return {
          title: `Issue ${payload.action}: ${payload.issue.title}`,
          description: payload.issue.body,
          color: 0x7289da,
          footer: {
            text: `Repository: ${payload.repository.name}`,
          },
          author: {
            name: payload.issue.user.login,
            icon_url: payload.issue.user.avatar_url || null,
          },
          url: payload.issue.html_url,
        };
      }
      break;

    case "issue_comment":
      if (payload.issue && payload.comment && payload.repository) {
        return {
          title: `New comment on issue: ${payload.issue.title}`,
          description: payload.comment.body,
          color: 0x7289da,
          footer: {
            text: `Repository: ${payload.repository.name}`,
          },
          author: {
            name: payload.comment.user.login,
            icon_url: payload.comment.user.avatar_url || null,
          },
          url: payload.comment.html_url,
        };
      }
      break;

    case "pull_request":
      if (payload.action && payload.pull_request && payload.repository) {
        return {
          title: `Pull Request ${payload.action}: ${payload.pull_request.title}`,
          description: payload.pull_request.body
            ? payload.pull_request.body.slice(0, 1024)
            : `🔹No description`,
          color: 0x7289da,
          footer: {
            text: `Repository: ${payload.repository.name}`,
          },
          author: {
            name: payload.pull_request.user.login,
            icon_url: payload.pull_request.user.avatar_url || null,
          },
          url: payload.pull_request.html_url,
        };
      }
      break;

    case "pull_request_review":
      if (payload.action && payload.review && payload.repository) {
        return {
          title: `Pull Request Review ${payload.action}`,
          description: payload.review.body,
          color: 0x7289da,
          footer: {
            text: `Repository: ${payload.repository.name}`,
          },
          author: {
            name: payload.review.user.login,
            icon_url: payload.review.user.avatar_url || null,
          },
          url: payload.review.html_url,
        };
      }
      break;

    case "pull_request_review_comment":
      if (payload.pull_request && payload.comment && payload.repository) {
        return {
          title: `New comment on pull request: ${payload.pull_request.title}`,
          description: payload.comment.body,
          color: 0x7289da,
          footer: {
            text: `Repository: ${payload.repository.name}`,
          },
          author: {
            name: payload.comment.user.login,
            icon_url: payload.comment.user.avatar_url || null,
          },
          url: payload.comment.html_url,
        };
      }
      break;

    case "star":
      if (payload.sender && payload.repository) {
        return {
          title: `Repository ${payload.action} (starred)`,
          description: `${payload.sender.login} ${payload.action} (starred) the repository.`,
          color: 0x7289da,
          footer: {
            text: `Repository: ${payload.repository.name}`,
          },
          author: {
            name: payload.sender.login,
            icon_url: payload.sender.avatar_url || null,
          },
          url: payload.repository.html_url,
        };
      }
      break;

    case "fork":
      if (payload.sender && payload.repository && payload.forkee) {
        return {
          title: `Repository forked`,
          description: `${payload.sender.login} forked the repository.`,
          color: 0x7289da,
          footer: {
            text: `Repository: ${payload.repository.name}`,
          },
          author: {
            name: payload.sender.login,
            icon_url: payload.sender.avatar_url || null,
          },
          url: payload.forkee.html_url,
        };
      }
      break;

    case "create":
      if (payload.ref && payload.ref_type && payload.repository && payload.sender) {
        return {
          title: `Created ${payload.ref_type}: ${payload.ref}`,
          description: `${payload.sender.login} created a new ${payload.ref_type}.`,
          color: 0x7289da,
          footer: {
            text: `Repository: ${payload.repository.name}`,
          },
          author: {
            name: payload.sender.login,
            icon_url: payload.sender.avatar_url || null,
          },
          url: payload.repository.html_url,
        };
      }
      break;

    case "delete":
      if (payload.ref && payload.ref_type && payload.repository && payload.sender) {
        return {
          title: `Deleted ${payload.ref_type}: ${payload.ref}`,
          description: `${payload.sender.login} deleted the ${payload.ref_type}.`,
          color: 0x7289da,
          footer: {
            text: `Repository: ${payload.repository.name}`,
          },
          author: {
            name: payload.sender.login,
            icon_url: payload.sender.avatar_url || null,
          },
          url: payload.repository.html_url,
        };
      }
      break;

    case "release":
      if (payload.action && payload.release && payload.repository) {
        return {
          title: `Release ${payload.action}: ${payload.release.name}`,
          description: payload.release.body,
          color: 0x7289da,
          footer: {
            text: `Repository: ${payload.repository.name}`,
          },
          author: {
            name: payload.release.author.login,
            icon_url: payload.release.author.avatar_url || null,
          },
          url: payload.release.html_url,
        };
      }
      break;

    case "watch":
      if (payload.action && payload.sender && payload.repository) {
        return {
          title: `Repository ${payload.action} (watched)`,
          description: `${payload.sender.login} ${payload.action} (watched) the repository.`,
          color: 0x7289da,
          footer: {
            text: `Repository: ${payload.repository.name}`,
          },
          author: {
            name: payload.sender.login,
            icon_url: payload.sender.avatar_url || null,
          },
          url: payload.repository.html_url,
        };
      }
      break;

    case "member":
      if (payload.action && payload.member && payload.repository) {
        return {
          title: `Member ${payload.action}`,
          description: `${payload.member.login} was ${payload.action} to the repository.`,
          color: 0x7289da,
          footer: {
            text: `Repository: ${payload.repository.name}`,
          },
          author: {
            name: payload.member.login,
            icon_url: payload.member.avatar_url || null,
          },
          url: payload.repository.html_url,
        };
      }
      break;

    default:
      log.error(
        `${language.webhook_default_event_log_1} ${eventType} ${language.webhook_default_event_log_2} ${payload.action || ''} ${language.webhook_default_event_log_3}`
      );
      return null;
  }
}

// Function to check BranchStatus and event status
function checkBranchStatus(eventType) {
  if (!BranchStatus) {
    log.info(`${language.webhook_BranchStatus_log_info}`);
  }

  if (EventStatuses.hasOwnProperty(eventType) && EventStatuses[eventType]) {
    return true;
  } else {
    log.warn(
      `${language.webhook_BranchStatus_log_warn_1} ${eventType} ${language.webhook_BranchStatus_log_warn_2}`
    );
    return false;
  }
}

// Route to handle GitHub webhook events
app.post("/webhook", (req, res) => {
  const eventType = req.headers["x-github-event"];
  const payload = req.body;

  if (checkBranchStatus(eventType)) {
    const embed = createEmbed(eventType, payload);

    if (embed) {
      // Send embed data to Discord webhook
      sendDiscordWebhook(embed)
        .then(() => {
          log.success(
            `${language.webhook_eventType_log_1} ${eventType} ${language.webhook_eventType_log_2}`
          );
          res.status(200).send(`${language.webhook_eventType_status_1}`);
        })
        .catch((error) => {
          log.error(
            `${language.webhook_eventType_log_3} ${eventType} ${language.webhook_eventType_log_4}`,
            error
          );
          res.status(500).send(`${language.webhook_eventType_status_2}`);
        });
    } else {
      res.status(200).send(`${language.webhook_eventType_status_3}`);
    }
  } else {
    res.status(200).send(`${language.webhook_eventType_status_4}`);
  }
});

// Route to handle GitHub webhook ping event
app.get("/webhook", (req, res) => {
  log.debug(`${language.webhook_ping_received}`);
  res.status(200).send(`${language.webhook_ping_status}`);
});

// Start server
app.listen(PORT, () => {
  console.log(`online`);
  log.debug(`${language.select_language} [ ${LANGUAGES === "eng" ? "English" : "Nederlands"} ]`);
  log.debug(`${language.webhook_start_running}: [ ${PORT} ]`);
  log.debug(
    `${language.webhook_start_listening} [ ${WebHookUrl}:${PORT}/webhook ]`
  );
});
