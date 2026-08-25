# Security Policy

## Overview

Pi-IOT is designed for **localhost-only** use. The MQTT broker binds exclusively to `127.0.0.1` — nothing is reachable from the LAN or internet by design.

---

## What Is and Isn't in the Repo

| File | In repo? | Reason |
|------|----------|--------|
| `mosquitto.conf.example` | ✅ Yes | Safe template — no credentials, localhost-only binding |
| `mosquitto.conf` | ❌ No (gitignored) | Your local runtime config — copy from example |
| `smartDevices/CLI_Version/devices.example.json` | ✅ Yes | Placeholder structure only |
| `smartDevices/CLI_Version/devices.json` | ❌ No (gitignored) | Contains real Tuya keys, device IDs, LAN IPs |
| `.env.example` | ✅ Yes (if present) | Placeholder keys only |
| `.env` / `.env.*` | ❌ No (gitignored) | Real credentials |

---

## Secrets Policy

### Never commit:
- Tuya device IDs (the 22-character `"id"` field, `bf`-prefixed)
- Tuya local encryption keys (`"key": "..."`) — used to encrypt all local device traffic
- LAN IP addresses of physical devices
- MAC addresses, UUIDs, serial numbers
- Any API tokens or passwords

### CI enforcement:
Every push to `main` and every PR is scanned automatically by [gitleaks](https://github.com/gitleaks/gitleaks) via GitHub Actions (`.github/workflows/secret-scan.yml`). PRs that introduce credentials will **fail the build and be blocked**.

### Scan locally before pushing:
```bash
# Install gitleaks (one-time)
winget install gitleaks          # Windows
brew install gitleaks            # macOS

# Scan full repo history
gitleaks detect --source . --log-opts="--all"

# Scan only staged changes (use as a pre-commit check)
gitleaks protect --staged
```

---

## Mosquitto Localhost Invariant

Every listener in `mosquitto.conf` **must** be explicitly bound to `127.0.0.1`.

```properties
# CORRECT — loopback only, LAN cannot reach this
listener 1883 127.0.0.1
listener 9001 127.0.0.1

# WRONG — binds to all interfaces, LAN-accessible
listener 1883
listener 9001

# WRONG — binds to all IPv6 interfaces, not just loopback
listener 1883    (results in :::1883)
```

**DO NOT remove `127.0.0.1` from any listener unless you ALSO:**
1. Set `allow_anonymous false`
2. Add a `password_file` with user credentials
3. Add an `acl_file` with topic-level permissions
4. Enable TLS (`certfile` / `keyfile` / `cafile`)

### Legacy Mosquitto (<1.6)
If you cannot upgrade, use the top-level directive instead:
```properties
bind_address 127.0.0.1
```
This applies globally to **all** listeners. You cannot have separate bind addresses per listener, but the security guarantee is the same.

### Runtime enforcement
`run.ps1` enforces the invariant automatically: after Mosquitto starts, it inspects `netstat` for any `LISTENING` binding on ports 1883/9001 that is not `127.0.0.1` or `[::1]` (IPv6 loopback). If found, it kills Mosquitto and exits with an error. Allowed bindings are:

```
127.0.0.1:1883    127.0.0.1:9001
[::1]:1883        [::1]:9001
```

Everything else — `0.0.0.0:1883`, `192.168.x.x:1883`, `:::1883` — causes a hard failure.

---

## If You Accidentally Commit Secrets

> ⚠️ **Removing secrets from git history does NOT make previously leaked credentials safe — you must rotate them FIRST, before touching git.**

### Step 1: Rotate immediately (do this first)
- **Tuya local keys:** Log into [iot.tuya.com](https://iot.tuya.com) → your device → reset local key. The old key is now invalid regardless of what's in git.
- **Any other tokens/passwords:** Invalidate them via their platform before proceeding.

### Step 2: Purge from history
```bash
# Install git-filter-repo (pip, one-time)
pip install git-filter-repo

# Remove the file from ALL branches and ALL commits
git filter-repo --path smartDevices/CLI_Version/devices.json --invert-paths

# To remove multiple files at once:
git filter-repo \
  --path smartDevices/CLI_Version/devices.json \
  --path .env \
  --invert-paths
```

### Step 3: Force-push all branches and tags
```bash
git push origin --force --all
git push origin --force --tags
```

### Step 4: Coordinate with collaborators
After a force-push, every existing clone has diverged history. Notify collaborators before pushing, then they must:
```bash
git fetch origin
git reset --hard origin/main
```
Or simply re-clone the repo.

### Step 5: Verify clean
```bash
# Confirm the file is totally gone from history
git log --all --full-history -- smartDevices/CLI_Version/devices.json
# Should return nothing

# Re-run gitleaks on full history
gitleaks detect --source . --log-opts="--all"
```

---

## Git History Audit Commands

```bash
# List all branches (local + remote)
git branch -a

# All files ever committed (unique, sorted)
git log --all --name-only --pretty=format: | sort -u | grep -v '^$'

# Grep all history for credential-like patterns
git grep -i "local_key\|api_key\|password\|secret\|token" $(git rev-list --all)

# Full gitleaks scan (most thorough)
gitleaks detect --source . --log-opts="--all"
```

What counts as a "secret" in this project:

> The examples below are **fabricated placeholders**. Never paste a real value
> into this file, an issue, or a commit message — including "just the first few
> characters". Documenting a secret is still leaking it.

| Pattern | Shape (fake example) | Risk |
|---------|----------------------|------|
| Tuya `"key"` value | 16 chars, mixed punctuation — `"aA0!bB1@cC2#dD3$"` | **Critical** — full device takeover from the LAN |
| Tuya `"id"` value | 22 chars, `bf` prefix — `"bf00000000000000000000"` | High — combined with the key |
| LAN IP of device | `"192.0.2.10"` (RFC 5737 doc range) | Medium — network topology |
| MAC address | `"00:00:5e:00:53:00"` (RFC 7042 doc range) | Medium — device fingerprint |
| UUID / serial | 16 hex chars — `"0000000000000000"` | Medium — cloud API identifiers |

---

## Release / Distribution

**Do not ship `.git/` in release zips.** The `.git/` directory contains the full commit history, which could expose sensitive metadata, old configs, or intermediate states.

Always exclude when packaging:
```
.git/
devices.json
mosquitto.conf
.env
node_modules/
dist/
__pycache__/
*.log
*.db
```

```powershell
# PowerShell: clean zip for distribution
$exclude = @('.git','node_modules','dist','__pycache__','devices.json','mosquitto.conf','.env','*.log','*.db')
Get-ChildItem -Recurse | Where-Object { $exclude -notcontains $_.Name } | Compress-Archive -DestinationPath pi-iot-release.zip
```

---

## Reporting a Vulnerability

This is a personal/educational project. If you find a security issue, please open a [GitHub Issue](https://github.com/NicGroenewald/PI-IOT/issues) describing the finding.
