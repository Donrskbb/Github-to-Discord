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
    path: url.pathname + url.search,
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
  const githubLogoUrl = "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png";

  let embed = {
    title: '',
    description: '',
    color: 0x7289da,
    footer: { text: '' },
    author: { name: '', icon_url: githubLogoUrl },
    url: null,
    fields: []
  };

  switch (eventType) {
    case "push":
      if (payload.pusher && payload.repository && payload.commits && payload.commits.length > 0) {
        embed.title = `Push Event: ${payload.pusher.name}`;
        embed.description = `New push to **${payload.repository.name}**\n\n**Commits:**`;
        embed.fields = payload.commits.map(commit => ({
          name: `[${commit.id.slice(0, 7)}](${payload.repository.html_url}/commit/${commit.id}) ${commit.message}`,
          value: `\`\`\`Author: ${commit.author.name}\`\`\``,
          inline: false,
        }));
        embed.footer.text = `Repository: ${payload.repository.name}`;
        embed.author.name = payload.pusher.name;
        embed.author.icon_url = payload.pusher.avatar_url || githubLogoUrl;
        embed.url = payload.repository.html_url;
        break;
      }
      return null;

    case "issues":
      if (payload.action && payload.issue && payload.repository) {
        embed.title = `Issue ${payload.action}: ${payload.issue.title}`;
        embed.description = `${payload.issue.body ? payload.issue.body : "No description provided."}\n\n**Issue:** [#${payload.issue.number}](${payload.issue.html_url})`;
        embed.footer.text = `Repository: ${payload.repository.name}`;
        embed.author.name = payload.issue.user.login;
        embed.author.icon_url = payload.issue.user.avatar_url || githubLogoUrl;
        embed.url = payload.issue.html_url;
        break;
      }
      return null;

    case "issue_comment":
      if (payload.issue && payload.comment && payload.repository) {
        embed.title = `New comment on issue: ${payload.issue.title}`;
        embed.description = `${payload.comment.body ? payload.comment.body : "No comment body."}\n\n**Comment:** [#${payload.comment.id}](${payload.comment.html_url})`;
        embed.footer.text = `Repository: ${payload.repository.name}`;
        embed.author.name = payload.comment.user.login;
        embed.author.icon_url = payload.comment.user.avatar_url || githubLogoUrl;
        embed.url = payload.comment.html_url;
        break;
      }
      return null;

    case "pull_request":
      if (payload.action && payload.pull_request && payload.repository) {
        embed.title = `Pull Request ${payload.action}: ${payload.pull_request.title}`;
        embed.description = `${payload.pull_request.body ? payload.pull_request.body.slice(0, 1024) : "🔹No description"}\n\n**Pull Request:** [#${payload.pull_request.number}](${payload.pull_request.html_url})`;
        embed.footer.text = `Repository: ${payload.repository.name}`;
        embed.author.name = payload.pull_request.user.login;
        embed.author.icon_url = payload.pull_request.user.avatar_url || githubLogoUrl;
        embed.url = payload.pull_request.html_url;
        break;
      }
      return null;

    case "pull_request_review":
      if (payload.action && payload.review && payload.repository) {
        embed.title = `Pull Request Review ${payload.action}`;
        embed.description = `${payload.review.body ? payload.review.body : "No review body."}\n\n**Review:** [#${payload.review.id}](${payload.review.html_url})`;
        embed.footer.text = `Repository: ${payload.repository.name}`;
        embed.author.name = payload.review.user.login;
        embed.author.icon_url = payload.review.user.avatar_url || githubLogoUrl;
        embed.url = payload.review.html_url;
        break;
      }
      return null;

    case "pull_request_review_comment":
      if (payload.pull_request && payload.comment && payload.repository) {
        embed.title = `New comment on pull request: ${payload.pull_request.title}`;
        embed.description = `${payload.comment.body ? payload.comment.body : "No comment body."}\n\n**Comment:** [#${payload.comment.id}](${payload.comment.html_url})`;
        embed.footer.text = `Repository: ${payload.repository.name}`;
        embed.author.name = payload.comment.user.login;
        embed.author.icon_url = payload.comment.user.avatar_url || githubLogoUrl;
        embed.url = payload.comment.html_url;
        break;
      }
      return null;

    case "star":
      if (payload.sender && payload.repository) {
        embed.title = `Repository ${payload.action} (starred)`;
        embed.description = `${payload.sender.login} ${payload.action} (starred) the repository.`;
        embed.footer.text = `Repository: ${payload.repository.name}`;
        embed.author.name = payload.sender.login;
        embed.author.icon_url = payload.sender.avatar_url || githubLogoUrl;
        embed.url = payload.repository.html_url;
        break;
      }
      return null;

    case "fork":
      if (payload.sender && payload.repository && payload.forkee) {
        embed.title = `Repository forked`;
        embed.description = `${payload.sender.login} forked the repository.`;
        embed.footer.text = `Repository: ${payload.repository.name}`;
        embed.author.name = payload.sender.login;
        embed.author.icon_url = payload.sender.avatar_url || githubLogoUrl;
        embed.url = payload.forkee.html_url;
        break;
      }
      return null;

    case "create":
      if (payload.ref && payload.ref_type && payload.repository && payload.sender) {
        embed.title = `Created ${payload.ref_type}: ${payload.ref}`;
        embed.description = `${payload.sender.login} created a new ${payload.ref_type}.`;
        embed.footer.text = `Repository: ${payload.repository.name}`;
        embed.author.name = payload.sender.login;
        embed.author.icon_url = payload.sender.avatar_url || githubLogoUrl;
        embed.url = payload.repository.html_url;
        break;
      }
      return null;

    case "delete":
      if (payload.ref && payload.ref_type && payload.repository && payload.sender) {
        embed.title = `Deleted ${payload.ref_type}: ${payload.ref}`;
        embed.description = `${payload.sender.login} deleted the ${payload.ref_type}.`;
        embed.footer.text = `Repository: ${payload.repository.name}`;
        embed.author.name = payload.sender.login;
        embed.author.icon_url = payload.sender.avatar_url || githubLogoUrl;
        embed.url = payload.repository.html_url;
        break;
      }
      return null;

    case "release":
      if (payload.action && payload.release && payload.repository) {
        embed.title = `Release ${payload.action}: ${payload.release.name}`;
        embed.description = `${payload.release.body ? payload.release.body : "No release body."}\n\n**Release:** [#${payload.release.id}](${payload.release.html_url})`;
        embed.footer.text = `Repository: ${payload.repository.name}`;
        embed.author.name = payload.release.author.login;
        embed.author.icon_url = payload.release.author.avatar_url || githubLogoUrl;
        embed.url = payload.release.html_url;
        break;
      }
      return null;

    case "watch":
      if (payload.action && payload.sender && payload.repository) {
        embed.title = `Repository ${payload.action} (watched)`;
        embed.description = `${payload.sender.login} ${payload.action} (watched) the repository.`;
        embed.footer.text = `Repository: ${payload.repository.name}`;
        embed.author.name = payload.sender.login;
        embed.author.icon_url = payload.sender.avatar_url || githubLogoUrl;
        embed.url = payload.repository.html_url;
        break;
      }
      return null;

    case "member":
      if (payload.action && payload.member && payload.repository) {
        embed.title = `Member ${payload.action}`;
        embed.description = `${payload.member.login} was ${payload.action} to the repository.`;
        embed.footer.text = `Repository: ${payload.repository.name}`;
        embed.author.name = payload.member.login;
        embed.author.icon_url = payload.member.avatar_url || githubLogoUrl;
        embed.url = payload.repository.html_url;
        break;
      }
      return null;

    default:
      console.error(
        `Unsupported event type: ${eventType} with action ${payload.action || ""}`
      );
      return null;
  }

  if (!embed.title && !embed.description) {
    console.error("Embed title and description are both empty.");
    return null;
  }

  return embed;
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
      sendDiscordWebhook({ embeds: [embed] })
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
