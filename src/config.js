// config.js

module.exports = {
  // discordWebhookUrl: 'https://discord.com/api/webhooks/1214883073196294175/tkeHsxe_vc6PZeq9VUSBISNqTMS0ccxwky0hm-iycU-Cmgo5KFdhhssznlUA0iQsU0o_'
  /* 
  main discord webhook
  "https://discord.com/api/webhooks/1263780912152313917/bdFN6XnNtSO7-ez_R-rAl51J6lEE_m7hnbVaaYqWeLtAdUOS-WxhCXlcNGN70Z_54abb"
  */
  discordWebhookUrl: "https://discord.com/api/webhooks/1214883073196294175/tkeHsxe_vc6PZeq9VUSBISNqTMS0ccxwky0hm-iycU-Cmgo5KFdhhssznlUA0iQsU0o_",
  WebHookUrl: "http://node-01.l3g3clan.nl",
  Port: 40126,
  BranchStatus: true,
  EventStatuses: {
    push: true,
    pull_request: true,
    issues: true,
    issue_comment: true,
    pull_request_review: true,
    pull_request_review_comment: true,
    star: true,
    fork: true,
    create: true,
    delete: true,
    release: true,
    watch: true,
    member: true,
    membership: true,
    public: true,
    repository: true,
    status: true,
    deployment: true,
    deployment_status: true,
    team_add: true,
    commit_comment: true,
    merge_group: true,
    // Add other events as needed
  },
};