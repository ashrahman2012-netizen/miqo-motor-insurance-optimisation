# MIQOS CC-2 — Local Trusted Broker

CC-2 is the first live backend for the MIQOS Collaboration Control Centre.

## Security boundary

- binds only to `127.0.0.1`;
- GitHub is read-only;
- OpenAI/model use is optional and analysis-only;
- repository mutations are disabled;
- approved mutating roadmap actions are recorded as `BLOCKED_CC2_MUTATIONS_DISABLED` until CC-3;
- the browser HTML never receives GitHub/OpenAI credentials;
- exact-head validation is required before an action packet is accepted;
- `SYNTHETIC_ONLY` is mandatory.

## Endpoints

- `GET /api/status`
- `GET /api/roadmap`
- `GET /api/github/status`
- `POST /api/actions/execute`
- `GET /api/actions/:id`

Compatibility alias: `GET /api/github/snapshot`.

## Recommended Windows setup

Use a separate worktree so the Control Centre does not disturb the desktop remediation worktree:

```powershell
$Repo = "C:\Users\ashra\Desktop\B. Project Folder\MIQOS - MPV\miqo-desktop-g3"
$Control = "C:\Users\ashra\Desktop\B. Project Folder\MIQOS - MPV\miqo-control-centre"
$Git = "C:\Program Files\Git\cmd\git.exe"

& $Git -C $Repo fetch origin miqo/control-centre-v1
& $Git -C $Repo worktree add $Control miqo/control-centre-v1
Set-Location $Control
npm run control-centre:broker
```

Expected startup:

```text
MIQOS CC-2 Local Trusted Broker
Listening: http://127.0.0.1:4300
Repository: ashrahman2012-netizen/miqo-motor-insurance-optimisation
Target branch: miqo/desktop-uat-remediation
GitHub: CONNECTED (...)
OpenAI/model: NOT_CONFIGURED or CONFIGURED_ANALYSIS_ONLY
Mutations: DISABLED (CC-2 read-only)
```

Keep that terminal open. In Control Centre V2 leave the broker URL as:

`http://127.0.0.1:4300`

and press **Connect**.

## GitHub authentication

For the public MIQOS repository, CC-2 can use public read-only GitHub API access.

For higher rate limits, authenticate locally. Never put a token in the HTML.

Token discovery order:

1. `MIQOS_GITHUB_TOKEN`
2. `GITHUB_TOKEN`
3. `GH_TOKEN`
4. `gh auth token` when GitHub CLI is installed/authenticated
5. public read-only API

No GitHub write request exists in CC-2.

## Optional OpenAI analysis

Set `OPENAI_API_KEY` locally to enable the allow-listed `MODEL_REVIEW` action. The key remains inside the broker process and is never returned to the browser.

Optional model override:

```powershell
$env:MIQOS_OPENAI_MODEL = "<approved OpenAI API model id>"
```

CC-2 model use is analysis-only; it receives no repository mutation tool. The broker does not hard-code a model ID so the API model can be selected explicitly and updated without changing broker code.

## Tests

```powershell
npm run test:control-centre:broker
```

The test suite validates:

- loopback status/roadmap endpoints;
- explicit human approval;
- stale-head rejection;
- read-only action receipts;
- mutation blocking;
- fail-closed optional model configuration.

## Runtime action ledger

Action receipts are persisted at:

`data/control-centre-broker/actions.json`

The repository ignores `data/`, so runtime receipts are not committed accidentally.
