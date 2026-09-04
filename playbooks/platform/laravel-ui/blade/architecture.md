# Blade Architecture

Blade is Laravel's server-rendered presentation adapter. Small uses Controller → Eloquent → View;
Medium moves meaningful workflows into Actions/Services; Large aligns views with modular-monolith
ownership. Templates never own queries, authorization, transactions, or business workflows.
