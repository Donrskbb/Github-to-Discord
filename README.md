# Github-to-Discord
Get a Discord webhook message when a Github event is requested

## 1. `createEmbed` function: 
Added to create the appropriate embed message based on the event type.

## 2. Event Handling:
- `push:` Handles push events, includes commit message and author.
- `issues:` Handles issue events (opened, closed, etc.), includes issue title and body.
- `issue_comment:` Handles issue comment events, includes comment body.
- `pull_request:` Handles pull request events, includes PR title and body.
- `pull_request_review:` Handles pull request review events, includes review body.
- `pull_request_review_comment:` Handles comments on pull requests, includes comment body.
- `star:` Handles repository starring events.
- `fork:` Handles repository forking events.
