export function springApiCompose(template) {
  return template
    .replace(/\n  frontend:\n[\s\S]*?(?=\n  backend:\n)/, '')
    .replace('context: ./backend', 'context: .')
    .replace('./backend:/app', '.:/app')
}

export function springApiMakefile() {
  return '.PHONY: dev test build\n\ndev:\n\t./mvnw spring-boot:run\n\ntest:\n\t./mvnw --batch-mode test\n\nbuild:\n\t./mvnw --batch-mode package -DskipTests\n'
}

export function springSetupGuide(answers, stack, validation) {
  const databaseStart = answers.docker
    ? 'docker compose up -d db'
    : '# Start PostgreSQL on the host and set its connection values in .env'
  const prerequisites = `- Java ${stack.profile.runtimes.java}\n- Maven ${stack.profile.runtimes.maven} or Docker for the generated launcher\n- PostgreSQL ${stack.profile.runtimes.postgres}${answers.docker ? ' or Docker Compose' : ''}`
  if (stack.frontendKey === 'no-frontend') {
    return `# Local Setup Guide\n\n## Prerequisites\n\n${prerequisites}\n\n## Install and start\n\nFrom the project root:\n\n\`\`\`bash\ncp .env.example .env\n${databaseStart}\nset -a; . ./.env; set +a\n./mvnw spring-boot:run  # use mvnw.cmd on Windows\n\`\`\`\n\n## Validate\n\n\`\`\`bash\n./mvnw --batch-mode test\n./mvnw --batch-mode package -DskipTests\n\`\`\`\n`
  }
  const clientDirectory = stack.frontendKey === 'react' ? 'frontend/' : ''
  const clientEnv = stack.frontendKey === 'nextjs' ? 'cp .env.example .env.local\n' : ''
  return `# Local Setup Guide\n\n## Prerequisites\n\n- Node.js ${stack.profile.runtimes.nodeMinimum} or newer with npm ${stack.profile.runtimes.npmMinimum} or newer (tested on Node.js ${stack.profile.runtimes.node})\n${prerequisites}\n\n## Start the database and backend\n\nFrom the project root:\n\n\`\`\`bash\ncp .env.example .env\n${databaseStart}\nset -a; . ./.env; set +a\ncd backend\n./mvnw spring-boot:run  # use mvnw.cmd on Windows\n\`\`\`\n\n## Start the frontend\n\nIn another terminal from the project root:\n\n\`\`\`bash\n${clientDirectory ? `cd ${clientDirectory}\n` : ''}${clientEnv}${clientDirectory ? 'cp .env.example .env\n' : ''}npm install\nnpm run dev\n\`\`\`\n\n## Validate\n\nFrom \`backend/\`, run \`./mvnw --batch-mode test\`. From \`${clientDirectory || '.'}\`, run:\n\n\`\`\`bash\n${validation}\n\`\`\`\n\nCommit the generated package lockfile before enabling CI.\n`
}
