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

let language_select = LANGUAGES;
if (LANGUAGES === "eng") {
  language_select = "English";
} else if (LANGUAGES === "nl") {
  language_select = "Nederlands";
}

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
          reject(new Error(`Received status code ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.write(params);
    req.end();
  });
}

// Function to create embed message for Discord based on GitHub event
function createEmbed(eventType, payload) {
  let embeds = [];

  switch (eventType) {
    case "push":
      if (payload.pusher && payload.repository && payload.commits) {
        const commits = payload.commits;

        for (let i = 0; i < commits.length; i += 25) {
          const commitBatch = commits.slice(i, i + 25);
          const fields = commitBatch.map((commit) => ({
            name: commit.message,
            value: `Commit by ${commit.author.name}`,
            inline: false,
          }));

          embeds.push({
            title: `Push Event: ${payload.pusher.name}`,
            description: `New push to ${payload.repository.name}`,
            color: 0x7289da,
            fields: fields,
            footer: {
              text: `Repository: ${payload.repository.name}`,
            },
            author: {
              name: payload.pusher.name,
            },
          });
        }
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
            : `🔹No description`, // Truncate body
          color: 0x7289da,
          footer: {
            text: `Repository: ${payload.repository.name}`,
          },
          author: {
            name: payload.pull_request.user.login,
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
          },
          url: payload.forkee.html_url,
        };
      }
      break;

    case "create":
      if (
        payload.ref &&
        payload.ref_type &&
        payload.repository &&
        payload.sender
      ) {
        return {
          title: `Created ${payload.ref_type}: ${payload.ref}`,
          description: `${payload.sender.login} created a new ${payload.ref_type}.`,
          color: 0x7289da,
          footer: {
            text: `Repository: ${payload.repository.name}`,
          },
          author: {
            name: payload.sender.login,
          },
          url: payload.repository.html_url,
        };
      }
      break;

    case "delete":
      if (
        payload.ref &&
        payload.ref_type &&
        payload.repository &&
        payload.sender
      ) {
        return {
          title: `Deleted ${payload.ref_type}: ${payload.ref}`,
          description: `${payload.sender.login} deleted the ${payload.ref_type}.`,
          color: 0x7289da,
          footer: {
            text: `Repository: ${payload.repository.name}`,
          },
          author: {
            name: payload.sender.login,
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
          },
          url: payload.repository.html_url,
        };
      }
      break;

    case "member":
      if (payload.action && payload.member && payload.repository) {
        return {
          title: `Member ${payload.action}`,
          description: `${payload.member.login} was ${payload.action} the repository.`,
          color: 0x7289da,
          footer: {
            text: `Repository: ${payload.repository.name}`,
          },
          author: {
            name: payload.member.login,
          },
          url: payload.repository.html_url,
        };
      }
      break;

    case "membership":
      if (
        payload.action &&
        payload.scope &&
        payload.member &&
        payload.repository
      ) {
        return {
          title: `Membership ${payload.action}`,
          description: `${payload.member.login} was ${payload.action} to the ${payload.scope} of the repository.`,
          color: 0x7289da,
          footer: {
            text: `Repository: ${payload.repository.name}`,
          },
          author: {
            name: payload.member.login,
          },
          url: payload.repository.html_url,
        };
      }
      break;

    case "public":
      if (payload.repository && payload.sender) {
        return {
          title: `Repository public`,
          description: `The repository was made public by ${payload.sender.login}.`,
          color: 0x7289da,
          footer: {
            text: `Repository: ${payload.repository.name}`,
          },
          author: {
            name: payload.sender.login,
          },
          url: payload.repository.html_url,
        };
      }
      break;

    case "repository":
      if (payload.action && payload.repository && payload.sender) {
        return {
          title: `Repository ${payload.action}`,
          description: `The repository was ${payload.action} by ${payload.sender.login}.`,
          color: 0x7289da,
          footer: {
            text: `Repository: ${payload.repository.name}`,
          },
          author: {
            name: payload.sender.login,
          },
          url: payload.repository.html_url,
        };
      }
      break;

    case "status":
      if (
        payload.context &&
        payload.state &&
        payload.description &&
        payload.repository &&
        payload.sender
      ) {
        return {
          title: `Status ${payload.state}`,
          description: `The status of a commit changed to ${payload.state}.`,
          color: 0x7289da,
          fields: [
            {
              name: "Description",
              value: payload.description,
            },
            {
              name: "Context",
              value: payload.context,
            },
          ],
          footer: {
            text: `Repository: ${payload.repository.name}`,
          },
          author: {
            name: payload.sender.login,
          },
          url: payload.target_url,
        };
      }
      break;

    case "deployment":
      if (payload.deployment && payload.repository && payload.sender) {
        return {
          title: `Deployment created`,
          description: `A deployment was created by ${payload.sender.login}.`,
          color: 0x7289da,
          fields: [
            {
              name: "Environment",
              value: payload.deployment.environment,
            },
          ],
          footer: {
            text: `Repository: ${payload.repository.name}`,
          },
          author: {
            name: payload.sender.login,
          },
          url: payload.deployment.url,
        };
      }
      break;

    case "deployment_status":
      if (
        payload.deployment_status &&
        payload.deployment &&
        payload.repository &&
        payload.sender
      ) {
        return {
          title: `Deployment status: ${payload.deployment_status.state}`,
          description: `The deployment status was updated to ${payload.deployment_status.state} by ${payload.sender.login}.`,
          color: 0x7289da,
          fields: [
            {
              name: "Description",
              value: payload.deployment_status.description,
            },
            {
              name: "Environment",
              value: payload.deployment.environment,
            },
          ],
          footer: {
            text: `Repository: ${payload.repository.name}`,
          },
          author: {
            name: payload.sender.login,
          },
          url: payload.deployment_status.target_url,
        };
      }
      break;

    case "team_add":
      if (payload.team && payload.repository && payload.sender) {
        return {
          title: `Team added`,
          description: `A team was added to the repository by ${payload.sender.login}.`,
          color: 0x7289da,
          footer: {
            text: `Repository: ${payload.repository.name}`,
          },
          author: {
            name: payload.sender.login,
          },
          url: payload.repository.html_url,
        };
      }
      break;

    case "commit_comment":
      if (payload.comment && payload.repository && payload.sender) {
        return {
          title: `Commit comment created`,
          description: `A comment was added to a commit by ${payload.sender.login}.`,
          color: 0x7289da,
          footer: {
            text: `Repository: ${payload.repository.name}`,
          },
          author: {
            name: payload.sender.login,
          },
          url: payload.comment.html_url,
        };
      }
      break;

    case "merge_group":
      if (
        payload.action &&
        payload.merge_group &&
        payload.repository &&
        payload.sender
      ) {
        return {
          title: `Merge group ${payload.action}`,
          description: `A merge group was ${payload.action} by ${payload.sender.login}.`,
          color: 0x7289da,
          footer: {
            text: `Repository: ${payload.repository.name}`,
          },
          author: {
            name: payload.sender.login,
          },
          url: payload.merge_group.url,
        };
      }
      break;

    // Add more cases as needed for other events

    default:
      log.error(
        `${language.webhook_default_event_log_1} ${eventType} ${language.webhook_default_event_log_2} ${payload.action} ${language.webhook_default_event_log_3}`
      );
  }

  if (embeds.length === 0) {
     return log.error(
      `${language.webhook_default_event_log_4} ${eventType} ${language.webhook_default_event_log_5} ${payload.action} ${language.webhook_default_event_log_6}`
    );;
  }

  return { embeds: embeds };
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
  log.debug(`${language.select_language} [ ${language_select} ]`);
  log.debug(`${language.webhook_start_running}: [ ${PORT} ]`);
  log.debug(
    `${language.webhook_start_listening} [ ${WebHookUrl}:${PORT}/webhook ]`
  );
  // Pterodactyl online event
  log.debug(`online`);
});