<div align="center">

<img src="https://readme-typing-svg.herokuapp.com?font=Orbitron&size=28&duration=3500&pause=900&color=FF4D6D&center=true&vCenter=true&width=650&lines=Mizuki+Security+Protocol;Protect+Secrets+and+Sessions;Never+Commit+Credentials" alt="Mizuki Security"/>

# 🔐 Mizuki — Security Guide

![Security](https://img.shields.io/badge/Security-Required-FF4D6D?style=for-the-badge)
![Secrets](https://img.shields.io/badge/Secrets-Never_Commit-DC2626?style=for-the-badge)
![Audit](https://img.shields.io/badge/Dependencies-npm_audit-CB3837?style=for-the-badge\&logo=npm)

</div>

---

## ✅ Before Publishing to GitHub

Run these commands from the project directory:

```powershell
npm test
npm audit
git status --short
git check-ignore -v .env auth_state\creds.json node_modules dist
```

Make sure these files and directories are not committed:

```text
.env
auth_state/
node_modules/
dist/
logs/
```

Keep `.env.example`, but only use placeholder values.

---

## 🔑 Secret Protection

Never place API keys, passwords, session files, or private data inside:

* Source code
* GitHub issues
* Screenshots
* Logs
* Public cloud storage
* Documentation examples

Use environment variables or the hosting platform's secret manager.

```typescript
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is missing.");
}
```

Never hardcode secrets:

```typescript
// Never do this
const apiKey = "real_api_key";
```

---

## 🚨 If a Secret Was Exposed

Assume any uploaded secret has been compromised.

### Gemini API Key

1. Revoke the old API key.
2. Generate a new key.
3. Update `.env` and hosting secrets.
4. Restart Mizuki.

### WhatsApp Session

1. Open WhatsApp.
2. Go to **Settings > Linked devices**.
3. Log out the Mizuki session.
4. Delete the affected `auth_state/` folder.
5. Start Mizuki and scan a new QR code.

### Database Password

1. Change the database password.
2. Update `.env` and hosting secrets.
3. Restart Mizuki.

```sql
ALTER USER 'mizuki'@'localhost'
IDENTIFIED BY 'new_strong_password';

FLUSH PRIVILEGES;
```

Deleting a secret from the latest commit does not remove it from Git history. Rotate the secret even after cleaning the repository history.

---

## 📱 WhatsApp Session Security

Baileys stores WhatsApp session credentials inside:

```text
auth_state/
```

These files can provide access to the connected WhatsApp account.

Never:

```text
❌ Upload auth_state/ to GitHub
❌ Share creds.json
❌ Attach session files to bug reports
❌ Store sessions in public folders
```

On Linux, use restricted permissions:

```bash
chmod 700 auth_state
find auth_state -type f -exec chmod 600 {} \;
```

For production hosting, store `auth_state/` in a private persistent volume.

---

## 🗄️ Database Security

Use a dedicated database account instead of `root`.

```sql
CREATE USER 'mizuki'@'localhost'
IDENTIFIED BY 'your_strong_password';

GRANT SELECT, INSERT, UPDATE, DELETE
ON mizuki_bot.*
TO 'mizuki'@'localhost';

FLUSH PRIVILEGES;
```

Additional permissions may be required temporarily when running database migrations.

Do not expose MySQL directly to the public internet.

---

## 📦 Dependency Security

Run before every release:

```powershell
npm test
npm audit
npm outdated
```

Commit `package-lock.json` to keep installations reproducible.

Do not blindly run:

```powershell
npm audit fix --force
```

It may install breaking dependency versions. Review vulnerabilities and test updates before deployment.

---

## 📁 Recommended `.gitignore`

```gitignore
.env
.env.*
!.env.example

auth_state/
node_modules/
dist/
logs/
*.log
```

---

## 🧾 Logging Safety

Logs must not contain:

* API keys
* Database passwords
* WhatsApp session credentials
* Access tokens
* Full private messages
* Full phone numbers

Use redaction where possible:

```typescript
const logger = pino({
  redact: {
    paths: [
      "password",
      "apiKey",
      "token",
      "session",
      "*.password",
      "*.token",
    ],
    censor: "[REDACTED]",
  },
});
```

---

## 🧠 AI Privacy

Mizuki's AI memory should be:

* Isolated by user and group
* Limited to required context
* Protected from public logs
* Deletable by the user

Users can view the privacy policy with:

```text
!m privacy
```

Users can delete their memory and opt out with:

```text
!m forgetme
```

---

## 🛡️ Release Checklist

* [ ] Tests pass
* [ ] `npm audit` has been reviewed
* [ ] `.env` is ignored
* [ ] `auth_state/` is ignored
* [ ] `.env.example` contains placeholders only
* [ ] No credentials exist in source code
* [ ] Logs contain no sensitive information
* [ ] Database uses a dedicated account
* [ ] Production secrets use private environment settings
* [ ] WhatsApp session storage is private and persistent

---

## 🐛 Reporting Security Issues

Do not report security vulnerabilities through public GitHub issues.

Use GitHub's private security advisory feature when available.

Never include real API keys, passwords, session files, phone numbers, or private messages in a report.

---

<div align="center">

### 🧬 Mizuki Security Protocol

> **Protect the secret. Protect the session. Protect the community.**

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=0,2,3,24&height=110&section=footer" width="100%" alt="Security Footer"/>

</div>
