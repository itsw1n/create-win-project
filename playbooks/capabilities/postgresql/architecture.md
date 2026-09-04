# PostgreSQL Architecture

PostgreSQL is the durable source of truth. Application operations own transaction boundaries;
database constraints protect invariants under concurrency. Keep one authoritative migration history,
use connection pooling deliberately, and isolate privileged maintenance from normal application roles.
