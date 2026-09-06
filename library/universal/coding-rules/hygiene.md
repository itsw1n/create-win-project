# Code hygiene

## No Debug Code in Commits

Remove temporary logging, breakpoints, fixtures, bypasses, and commented-out implementations. Retain structured operational logging only when it has defined level, fields, privacy handling, and ownership.

## One Thing Per File

A file should have one clear reason to change. Keep tightly coupled helpers beside their owner, but split unrelated components, routes, services, or policies. Do not create one-line files merely to satisfy this rule.
