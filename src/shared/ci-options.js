export function wantsBuildCi(answers = {}) {
  return answers.buildCi ?? answers.githubActions ?? false
}

export function wantsSecurityChecks(answers = {}) {
  return answers.securityChecks ?? answers.githubActions ?? false
}

export function wantsGitHubAutomation(answers = {}) {
  return wantsBuildCi(answers) || wantsSecurityChecks(answers)
}

export function wantsPullRequestTemplate(answers = {}) {
  return wantsBuildCi(answers) && wantsSecurityChecks(answers)
}
