// app.js

const express = require("express");
const https = require("https");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
const { BranchStatus, EventStatuses, LANGUAGES } = require("./src/config");
const { discordWebhookUrl, Port, WebHookUrl } = require("./src/webconfig");
const log = require("./src/util");
const fs = require("fs");
const language = JSON.parse(
  fs.readFileSync(`./language/${LANGUAGES}.json`, "utf-8")
);

let language_select = LANGUAGES === "eng" ? "English" : "Nederlands";
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

// Function to get GitHub user profile image
async function getGitHubUserAvatar(username) {
  try {
    const response = await fetch(`https://api.github.com/users/${username}`);
    const user = await response.json();
    return user.avatar_url;
  } catch (error) {
    console.error(`Error fetching avatar for ${username}:`, error);
    return null;
  }
}

// Function to create embed message for Discord based on GitHub event
async function createEmbed(eventType, payload) {
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
              icon_url: await getGitHubUserAvatar(payload.pusher.name),
            },
          });
        }
      }
      break;

    case "issues":
      if (payload.action && payload.issue && payload.repository) {
        const avatarUrl = await getGitHubUserAvatar(payload.issue.user.login);
        return {
          title: `Issue ${payload.action}: ${payload.issue.title}`,
          description: payload.issue.body,
          color: 0x7289da,
          footer: {
            text: `Repository: ${payload.repository.name}`,
          },
          author: {
            name: payload.issue.user.login,
            icon_url: avatarUrl,
          },
          url: payload.issue.html_url,
        };
      }
      break;

    case "issue_comment":
      if (payload.issue && payload.comment && payload.repository) {
        const avatarUrl = await getGitHubUserAvatar(payload.comment.user.login);
        return {
          title: `New comment on issue: ${payload.issue.title}`,
          description: payload.comment.body,
          color: 0x7289da,
          footer: {
            text: `Repository: ${payload.repository.name}`,
          },
          author: {
            name: payload.comment.user.login,
            icon_url: avatarUrl,
          },
          url: payload.comment.html_url,
        };
      }
      break;

    case "pull_request":
      if (payload.action && payload.pull_request && payload.repository) {
        const avatarUrl = await getGitHubUserAvatar(payload.pull_request.user.login);
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
            icon_url: avatarUrl,
          },
          url: payload.pull_request.html_url,
        };
      }
      break;

    case "pull_request_review":
      if (payload.action && payload.review && payload.repository) {
        const avatarUrl = await getGitHubUserAvatar(payload.review.user.login);
        return {
          title: `Pull Request Review ${payload.action}`,
          description: payload.review.body,
          color: 0x7289da,
          footer: {
            text: `Repository: ${payload.repository.name}`,
          },
          author: {
            name: payload.review.user.login,
            icon_url: avatarUrl,
          },
          url: payload.review.html_url,
        };
      }
      break;

    case "pull_request_review_comment":
      if (payload.pull_request && payload.comment && payload.repository) {
        const avatarUrl = await getGitHubUserAvatar(payload.comment.user.login);
        return {
          title: `New comment on pull request: ${payload.pull_request.title}`,
          description: payload.comment.body,
          color: 0x7289da,
          footer: {
            text: `Repository: ${payload.repository.name}`,
          },
          author: {
            name: payload.comment.user.login,
            icon_url: avatarUrl,
          },
          url: payload.comment.html_url,
        };
      }
      break;

    case "star":
      if (payload.sender && payload.repository) {
        const avatarUrl = await getGitHubUserAvatar(payload.sender.login);
        return {
          title: `Repository ${payload.action} (starred)`,
          description: `${payload.sender.login} ${payload.action} (starred) the repository.`,
          color: 0x7289da,
          footer: {
            text: `Repository: ${payload.repository.name}`,
          },
          author: {
            name: payload.sender.login,
            icon_url: avatarUrl,
          },
          url: payload.repository.html_url,
        };
      }
      break;

    case "fork":
      if (payload.sender && payload.repository && payload.forkee) {
        const avatarUrl = await getGitHubUserAvatar(payload.sender.login);
        return {
          title: `Repository forked`,
          description: `${payload.sender.login} forked the repository.`,
          color: 0x7289da,
          footer: {
            text: `Repository: ${payload.repository.name}`,
          },
          author: {
            name: payload.sender.login,
            icon_url: avatarUrl,
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
        const avatarUrl = await getGitHubUserAvatar(payload.sender.login);
        return {
          title: `Created ${payload.ref_type}: ${payload.ref}`,
          description: `${payload.sender.login} created a new ${payload.ref_type}.`,
          color: 0x7289da,
          footer: {
            text: `Repository: ${payload.repository.name}`,
          },
          author: {
            name: payload.sender.login,
            icon_url: avatarUrl,
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
        const avatarUrl = await getGitHubUserAvatar(payload.sender.login);
        return {
          title: `Deleted ${payload.ref_type}: ${payload.ref}`,
          description: `${payload.sender.login} deleted the ${payload.ref_type}.`,
          color: 0x7289da,
          footer: {
            text: `Repository: ${payload.repository.name}`,
          },
          author: {
            name: payload.sender.login,
            icon_url: avatarUrl,
          },
          url: payload.repository.html_url,
        };
      }
      break;

    case "release":
      if (payload.action && payload.release && payload.repository) {
        const avatarUrl = await getGitHubUserAvatar(payload.release.author.login);
        return {
          title: `Release ${payload.action}: ${payload.release.name}`,
          description: payload.release.body,
          color: 0x7289da,
          footer: {
            text: `Repository: ${payload.repository.name}`,
          },
          author: {
            name: payload.release.author.login,
            icon_url: avatarUrl,
          },
          url: payload.release.html_url,
        };
      }
      break;

    default:
      console.error(`Unhandled event type: ${eventType}`);
  }

  return { embeds: embeds };
}

// Function to check branch status
function checkBranchStatus(eventType) {
  return BranchStatus.includes(eventType);
}

app.post("/webhook", async (req, res) => {
  const eventType = req.headers["x-github-event"];
  const payload = req.body;

  if (checkBranchStatus(eventType)) {
    const embed = await createEmbed(eventType, payload);

    if (embed) {
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

// Start server
app.listen(PORT, () => {
  // Pterodactyl online event
  console.log(`online`);
  
  // Webhook Online event data
  log.debug(`${language.select_language} [ ${language_select} ]`);
  log.debug(`${language.webhook_start_running}: [ ${PORT} ]`);
  log.debug(
    `${language.webhook_start_listening} [ ${WebHookUrl}:${PORT}/webhook ]`
  );

});