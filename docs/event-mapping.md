# Event Mapping: OpenCode SSE → OpenWorker WS

| OpenCode SSE Event | OpenWorker WS Event | Transformation |
|---|---|---|
| session.status (busy) | turn_start | First busy → emit turn_start |
| message.part.updated (text) | assistant_delta | Incremental diff |
| message.part.updated (reasoning) | reasoning_delta | Incremental diff |
| message.part.updated (tool-invocation, call) | tool_proposed | Extract toolName + args |
| permission.asked | permission_required | Map to approval card |
| tool.execute.before | tool_started | Direct mapping |
| tool.execute.after | tool_finished | Map result → preview |
| session.idle | turn_end + turn_done | Finalize turn |
| session.error | error | Map error message |

## Notes

- **Incremental delta**: OpenCode sends full text in `message.part.updated`. The event-bridge-handler maintains `prevText` state and computes the diff to produce `assistant_delta` events.
- **Turn lifecycle**: A turn starts on first `session.status: busy` and ends on `session.idle`. The handler resets delta state between turns.
- **Permission flow**: `permission.asked` maps to `permission_required`. The approval-handler creates an Inbox item and waits for resolution before responding to OpenCode.
