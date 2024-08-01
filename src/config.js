// config.js

module.exports = {
  LANGUAGES: "eng",
  BranchStatus: true,
  EventStatuses: {
    push: true,
    push_id: false,
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
    ping: true,
    // Add other events as needed
  },
};
