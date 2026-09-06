const json = (value) => `${JSON.stringify(value, null, 2)}\n`

export function capabilityPackFiles(answers, stack) {
  const files = {}
  if (answers.uploads === 'object-storage') {
    files['config/capabilities/uploads.json'] = json({
      visibility: 'private', authorizeEveryOperation: true, maximumBytes: 10_485_760,
      acceptedTypes: [], generatedObjectNames: true, verifySignature: true,
      quarantineBeforeUse: true, malwareScanRequired: true, abandonedUploadCleanupHours: 24,
    })
    files['docs/capabilities/uploads.md'] = '# Private uploads\n\nAuthorize initiation, completion, download, and deletion. Validate declared type and file signature, generate object names, enforce size limits, quarantine until scanning succeeds, and remove abandoned or rejected objects. Tests must cover unauthorized access, oversize and signature rejection, quarantine, scan failure, and cleanup.\n'
  }
  if (answers.backgroundJobs === 'queue') {
    files['config/capabilities/queue.json'] = json({
      adapter: stack.backendKey === 'laravel' ? 'laravel-queue' : 'spring-task',
      attempts: 5, timeoutSeconds: 30, exponentialBackoff: true,
      idempotencyRequired: true, failedJobStore: true, correlationIds: true,
    })
    files['docs/capabilities/queue.md'] = '# Durable background jobs\n\nJobs require stable idempotency keys, bounded exponential retry with jitter, explicit timeouts, a failed-job store, correlation IDs, metrics, and an operator replay procedure. Tests cover duplicate delivery, timeout, retry exhaustion, and safe replay.\n'
  }
  if (answers.offline && answers.offline !== 'none') {
    files['config/capabilities/offline.json'] = json({
      mode: answers.offline, owner: 'mobile-client', containsSensitiveData: false,
      keyNamespace: `${answers.projectName}:v1`, ttlSeconds: 3600,
      invalidation: answers.offline === 'sync' ? 'server-version-and-user-signout' : 'ttl-and-user-signout',
      conflictPolicy: answers.offline === 'sync' ? 'server-authoritative-with-explicit-user-resolution' : 'not-applicable',
    })
    files['docs/capabilities/offline.md'] = `# Offline ${answers.offline}\n\nThe mobile client owns this store. Namespace keys by user and schema version, purge on sign-out, exclude secrets, enforce TTL, expose offline/stale/synchronizing/error states, and test reconnect behavior. ${answers.offline === 'sync' ? 'Synchronize through idempotent server operations and surface conflicts; never silently overwrite divergent user data.' : 'This is a measured read cache, not a source of truth.'}\n`
  }
  return files
}
