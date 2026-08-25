<div align="center">

<!-- Anime Header -->

<img src="https://media.tenor.com/EEbyku4nU8gAAAAi/rimuru-spin.gif" width="170" alt="Anime Character"/>
<img src="https://media1.tenor.com/m/ajHV0O5APUMAAAAC/rimuru-rimuru-tempest.gif" width="170" alt="Anime Character"/>
<img src="https://media1.tenor.com/m/T6cnb8csQAMAAAAC/%E3%81%A1%E3%82%87%E3%81%93%E3%81%88%E3%81%84-chocoeiru.gif" width="170" alt="Anime Character"/>

<br>

<img src="https://readme-typing-svg.herokuapp.com?font=Orbitron&size=32&duration=3500&pause=900&color=00BFFF&center=true&vCenter=true&width=750&lines=Mizuki+WhatsApp+Community+Bot;Powered+by+TypeScript+and+Gemini+AI;Admin.+AI.+Media.+Minigames.;Built+for+Modern+WhatsApp+Communities." alt="Mizuki Typing Introduction"/>

<br>

# 🌊 Mizuki — WhatsApp Community Bot

### 🤖 AI Assistant · 🛡️ Group Management · 🎮 Minigames · 🎬 Media Tools

<p>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="WhatsApp"/>
  <img src="https://img.shields.io/badge/Gemini_AI-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white" alt="Gemini AI"/>
</p>

<p>
  <img src="https://img.shields.io/badge/License-MIT-00BFFF?style=flat-square" alt="MIT License"/>
  <img src="https://img.shields.io/badge/Language-English%20%7C%20Malay-7E22CE?style=flat-square" alt="Language Support"/>
  <img src="https://img.shields.io/badge/Status-Active_Development-22C55E?style=flat-square" alt="Development Status"/>
  <img src="https://img.shields.io/badge/Runtime-Node.js_20+-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js Version"/>
  <img src="https://img.shields.io/badge/Release-v1.2.0-00BFFF?style=flat-square" alt="Mizuki v1.2.0"/>
</p>

</div>

---

> Current release: **v1.2.0** — see [CHANGELOG.md](CHANGELOG.md) and
> [release notes](RELEASE_NOTES_v1.2.0.md) for details.

## 🌌 About Mizuki

**Mizuki** is an open-source WhatsApp community bot built with TypeScript and powered by Gemini AI.

It provides group administration tools, artificial intelligence, polls, media conversion, privacy controls, and simple minigames inside WhatsApp groups.

```text
╭──────────────────────────────────────────╮
│              MIZUKI SYSTEM               │
├──────────────────────────────────────────┤
│  🛡️ Group Administration                 │
│  🧠 Gemini AI Assistant                  │
│  📊 Interactive Polls                    │
│  🎬 Media Conversion                     │
│  🎮 Community Minigames                  │
│  🌐 English and Malay Support            │
╰──────────────────────────────────────────╯
```

> Mizuki is designed for modern WhatsApp communities that need administration, automation, entertainment, and AI assistance in one bot.

---

## ✨ Main Features

<table>
<tr>
<td width="50%" valign="top">

### 🛡️ Administration

Manage WhatsApp groups through structured admin commands.

* Remove group members
* Promote members
* Demote administrators
* Tag all members
* Delete messages
* Record administrative actions

</td>
<td width="50%" valign="top">

### 🧠 Gemini AI

Communicate with Mizuki using natural language.

* Direct AI conversations
* User-specific context
* Group-specific context
* Rolling conversation memory
* Memory deletion and opt-out
* Per-group personality controlled by admins

</td>
</tr>

<tr>
<td width="50%" valign="top">

### 🎬 Media Tools

Convert and process WhatsApp media.

* Image to sticker
* Sticker to image
* Media to video
* Video to animated WebP sticker
* Sticker pack and author metadata
* Controlled processing queue
* Processing status reactions

</td>
<td width="50%" valign="top">

### 🎮 Community Tools

Add simple interactive features to groups.

* Poll creation
* Coin flipping
* Dice rolling
* Group information
* Member information
* Bot information and uptime

</td>
</tr>
</table>

---

## ⌨️ Commands

The command prefix can be changed using `BOT_PREFIX` inside the `.env` file.

The examples below use:

```env
BOT_PREFIX=!m
```

A space between the prefix and command is required, for example `!m help`.

### 🛡️ Admin Commands

| Command     | Description                                         |
| ----------- | --------------------------------------------------- |
| `!m kick`    | Remove a mentioned or replied member from the group |
| `!m promote` | Promote a member to group administrator             |
| `!m demote`  | Remove administrator privileges from a member       |
| `!m tagall`  | Mention all group members                           |
| `!m delete`  | Delete a replied message                            |
| `!m personality [sifat]` | View or change Mizuki's personality for the group |

### 🌐 General Commands

| Command        | Description                                 |
| -------------- | ------------------------------------------- |
| `!m help`       | Display the command menu                    |
| `!m ping`       | Check the bot response time                 |
| `!m infobot`    | Display Mizuki information and uptime       |
| `!m infogroup`  | Display information about the current group |
| `!m infomember` | Display information about a group member    |
| `!m owner`      | Display information about the bot owner     |
| `!m privacy`    | Display the AI memory and privacy policy    |

### 🧠 AI Commands

| Command             | Description                           |
| ------------------- | ------------------------------------- |
| `Mizuki, [message]` | Talk directly to Mizuki               |
| `!m ai [message]`    | Send a prompt to Gemini AI            |
| `!m forgetme`        | Delete personal AI memory and opt out |

### 📊 Utility Commands

| Command                                   | Description            |
| ----------------------------------------- | ---------------------- |
| `!m poll Question \| Option 1 \| Option 2` | Create a WhatsApp poll |

Example:

```text
!m poll Which game should we play? | MLBB | Genshin | HSR
```

### 🎮 Minigame Commands

| Command      | Description         |
| ------------ | ------------------- |
| `!m flipcoin` | Flip a virtual coin |
| `!m dice`     | Roll a virtual dice |

### 🎬 Media Commands

| Command     | Description                              |
| ----------- | ---------------------------------------- |
| `!m sticker` | Convert an image into a sticker          |
| `!m img`     | Convert a sticker into an image          |
| `!m tovideo` | Convert a GIF into an MP4 video          |
| `!m togif`   | Convert a video into an animated sticker |
| `!m yt <link>` | Download a public YouTube video (prefers up to 720p, with a compatible fallback) |
| `!m tt <link>` | Download a public TikTok HD video or every picture from a photo post |
| `!m ig <link>` | Download an Instagram video or multi-picture post |
| `!m x <link>` | Download a public X/Twitter video (prefers up to 720p, with a compatible fallback) |
| `!m yt audio <link>` | Download MP3 audio; `audio` also works with tt/ig/x |

`!m uptime` remains available as a backwards-compatible alias for `!m infobot`.
Media commands react with `⏳` while processing, then `✅` or `❌`.

---

## 🧰 Technology Stack

<div align="center">

### Core Development

<p>
  <img src="https://skillicons.dev/icons?i=typescript,nodejs,mysql&theme=dark" alt="Core Technologies"/>
</p>

### Media and AI

<p>
  <img src="https://img.shields.io/badge/Baileys-WhatsApp_Web_API-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="Baileys"/>
  <img src="https://img.shields.io/badge/Google_Gen_AI-SDK-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white" alt="Google Gen AI"/>
  <img src="https://img.shields.io/badge/FFmpeg-Media_Processing-007808?style=for-the-badge&logo=ffmpeg&logoColor=white" alt="FFmpeg"/>
  <img src="https://img.shields.io/badge/Sharp-Image_Processing-99CC00?style=for-the-badge&logo=sharp&logoColor=white" alt="Sharp"/>
</p>

</div>

| Technology        | Purpose                        |
| ----------------- | ------------------------------ |
| TypeScript        | Primary programming language   |
| Node.js           | Bot runtime                    |
| Baileys           | WhatsApp Web connection        |
| MySQL / MariaDB   | Persistent data storage        |
| Google Gen AI SDK | Gemini AI integration          |
| sharp             | Image processing               |
| ffmpeg            | Video and GIF processing       |
| node-webpmux      | WhatsApp sticker metadata      |
| pino              | Structured application logging |

---

## 📋 Requirements

Before installing Mizuki, make sure the system has:

* Node.js 20 or newer
* npm
* MySQL 8 or MariaDB
* ffmpeg
* yt-dlp
* gallery-dl
* Git
* A Gemini API key
* A dedicated WhatsApp number

MySQL included with XAMPP can also be used for local development.

> A dedicated WhatsApp number is strongly recommended. Do not test an unofficial WhatsApp bot using an important personal or business account.

### Check Node.js

```powershell
node --version
npm --version
```

### Check ffmpeg

```powershell
ffmpeg -version
```

After installing ffmpeg using `winget`, close and reopen PowerShell before running the version command.

### Install and check yt-dlp

```powershell
winget install --exact --id yt-dlp.yt-dlp
yt-dlp --version
```

Close and reopen PowerShell after installation if `yt-dlp` is not immediately recognized.

### Install and check gallery-dl

```powershell
winget install --exact --id mikf.gallery-dl
gallery-dl --version
```

`gallery-dl` handles TikTok/Instagram/X posts containing several pictures or videos.
Some posts are hidden behind platform login. To explicitly allow a dedicated
browser session, set `GALLERY_DL_COOKIES_BROWSER=opera` (or `chrome`/`edge`/`firefox`)
in `.env`. Do not use an important personal account for automated downloads.
Any group member who can use a social command can request media visible to that
browser session, so keep this setting blank unless the bot runs in a trusted group.
On Windows, close the selected browser fully if Mizuki reports that its cookies
database is locked, then retry the command.

### Optional free TikTok API fallbacks

TikTok may reject both local downloaders with a JavaScript challenge and HTTP
403. Mizuki uses this order for `!m tt`: `yt-dlp/gallery-dl → SocialKit → TikWM`.
Local tools stay first so successful downloads do not consume API credits.
Create a free SocialKit API key at https://www.socialkit.dev/ and add it to `.env`:

```env
SOCIALKIT_API_KEY=your_socialkit_key_here
TIKWM_FALLBACK_ENABLED=true
```

SocialKit offers a free tier at the time of writing, but its limits and pricing may
change; check the provider dashboard before relying on it. Mizuki requests 720p MP4
(or MP3 for `!m tt audio`), validates the temporary provider URL, and still enforces
its configured media size and duration limits. The provider receives the public
TikTok link submitted by the WhatsApp user. Keep this key private and never commit
`.env`. Successful fallback requests from group members may consume the shared
provider quota; leave `SOCIALKIT_API_KEY` blank if you do not want to use a
third-party service. If SocialKit is unavailable or its quota is exhausted,
TikWM is tried automatically without an API key. Set `TIKWM_FALLBACK_ENABLED=false`
to disable it. Both providers receive the public TikTok link submitted by the user.
`DOWNLOAD_TIMEOUT_MS` is one overall deadline shared by local tools and both APIs,
so a failed provider cannot restart the full timeout for the next fallback.

---

## 🚀 Installation

### 1. Clone the Repository

```powershell
git clone https://github.com/TakanashiHaryth/Mizuki.git
cd Mizuki
```

### 2. Install Dependencies

```powershell
npm install
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env`.

```powershell
Copy-Item .env.example .env
```

On Linux or macOS:

```bash
cp .env.example .env
```

Open `.env` and configure the required values:

```env
BOT_PREFIX=!m

GEMINI_API_KEY=your_gemini_api_key

DB_HOST=localhost
DB_PORT=3306
DB_NAME=mizuki_bot
DB_USER=mizuki
DB_PASSWORD=your_strong_password

LOG_RETENTION_DAYS=90

MYSQL_BIN_DIR=C:\xampp\mysql\bin
DB_BACKUP_DIR=backups
DB_BACKUP_RETENTION_DAYS=30

STICKER_PACK_NAME=Mizuki
STICKER_AUTHOR=Mizuki Bot
```

> Never commit the real `.env` file to GitHub.

Keep `.env.example` inside the repository because it acts as a safe configuration template for other developers.

### 4. Create the Database

Log in to MySQL and run:

```sql
CREATE DATABASE mizuki_bot
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

CREATE USER 'mizuki'@'localhost'
IDENTIFIED BY 'your_strong_password';

GRANT ALL PRIVILEGES
ON mizuki_bot.*
TO 'mizuki'@'localhost';

FLUSH PRIVILEGES;
```

Do not use the MySQL `root` account for production hosting.

### 5. Run Database Migrations

```powershell
npm run migrate
```

### 6. Run Tests

```powershell
npm test
```

### 7. Start Mizuki

```powershell
npm run dev
```

### 8. Configure Mizuki's Personality

Personality is stored in MySQL for each group and can only be changed by a
group admin:

```text
!m personality
!m personality ceria, lembut dan suka bergurau
!m personality reset
```

The built-in default identifies Mizuki as a cheerful, helpful WhatsApp
assistant for group admins. No personality setting is required in `.env` and no
`personality.md` file is used.

Scan the QR code using:

```text
WhatsApp
└── Settings
    └── Linked devices
        └── Link a device
```

The authentication session is stored inside:

```text
auth_state/
```

Run only one Mizuki process for each `auth_state/` directory. Mizuki creates an
ignored `.mizuki.lock` file and blocks duplicate startup automatically to avoid
WhatsApp `440 conflict / replaced` reconnect loops.

The QR code does not need to be scanned again as long as:

* The `auth_state/` folder remains available
* The linked WhatsApp session is still active
* The account has not logged out
* WhatsApp has not invalidated the session

---

## 💾 MySQL Backup and Restore

Mizuki detects XAMPP MySQL tools in `C:\xampp\mysql\bin` automatically. If XAMPP
is installed elsewhere, set `MYSQL_BIN_DIR` inside `.env`.

```powershell
# Create and list compressed backups
npm run db:backup
npm run db:list

# Verify backup integrity and check all database tables
npm run db:verify -- latest
npm run db:check

# Restore the latest backup
npm run db:restore -- latest --yes
```

Backups use `.sql.gz` with a SHA-256 checksum. Before a restore, Mizuki creates a
`pre-restore` backup automatically. Stop the bot before restoring data.

The `backups/` directory contains private user data and must never be uploaded to
GitHub or public cloud storage.

---

## 📁 Project Structure

```text
Mizuki/
├── auth_state/              # Private WhatsApp session (ignored)
├── backups/                # Private MySQL backups (ignored)
├── dist/                   # Compiled output (ignored)
├── src/
│   ├── connection/         # Baileys session and reconnect logic
│   ├── data/               # Migration, database and repositories
│   ├── handlers/           # Admin, AI, general, media and utility commands
│   ├── llm/                # Gemini adapter
│   ├── media/              # Image, video and sticker processing
│   ├── router/             # Parser and command routing
│   ├── services/           # Permissions, limits, logging and queues
│   ├── tools/              # MySQL backup/restore CLI
│   ├── config.ts           # Environment configuration
│   └── index.ts            # Application entry point
├── tests/                  # Automated tests
├── .env.example            # Safe environment template
├── .gitignore
├── CHANGELOG.md
├── SECURITY.md             # Security checklist
├── package.json
├── tsconfig.json
└── README.md
```

> The exact project structure may change as Mizuki continues to develop.

---

## 🌐 Multilingual Support

Mizuki currently supports:

* 🇬🇧 English
* 🇲🇾 Malay

The active language can be selected according to the user's preference.

```text
User Language
     │
     ▼
Language Detection / Preference
     │
     ├── English Response
     │
     └── Malay Response
```

Additional languages can be added through the bot's translation or language configuration system.

---

## 🔐 Security and Privacy

Mizuki handles WhatsApp authentication, user-generated content, AI memory, and database information. Security must not be treated as optional.

### Protected Files

The following files and directories must remain excluded from Git:

```gitignore
.env
.env.*
auth_state/
backups/
dist/
logs/
node_modules/
```

### WhatsApp Authentication

The `auth_state/` folder provides access to the connected WhatsApp session.

Never:

* Upload it to GitHub
* Share it with another person
* Store it in public cloud storage
* Send it through Discord or WhatsApp
* Include it inside public deployment archives

On Linux, Mizuki sets session folders and files to:

```text
Folder permission: 0700
File permission:   0600
```

On Windows, access depends on the Windows account ACL configuration.

### AI Memory

AI memory is:

* Isolated by user
* Isolated by WhatsApp group
* Stored as a rolling context window
* Limited to required conversational context
* Deletable by the user

Users can inspect the privacy policy using:

```text
!m privacy
```

Users can delete their memory and opt out using:

```text
!m forgetme
```

### Rate Limiting and Media Queue

AI commands use per-user limits to reduce:

* Spam
* API abuse
* Excessive Gemini API usage

Media conversion commands have no per-user usage limit. By default, Mizuki
processes one conversion at a time while later requests wait in a bounded queue.
This resource guard can be configured or disabled in `.env`:

```env
# Smooth animated stickers (8-30 FPS)
ANIMATED_STICKER_FPS=30
ANIMATED_STICKER_COMPRESSION_LEVEL=4

# Resource controls
MEDIA_QUEUE_ENABLED=true
MEDIA_MAX_CONCURRENT=1
MEDIA_MAX_QUEUE=8
FFMPEG_THREADS=0

# Random pacing between social downloads
DOWNLOAD_DELAY_MIN_SECONDS=5
DOWNLOAD_DELAY_MAX_SECONDS=10
```

The default `ANIMATED_STICKER_FPS=30` gives the smoothest motion; use `24` for
a size/quality balance. Set `MEDIA_QUEUE_ENABLED=false` to bypass the queue.
`FFMPEG_THREADS=0` allows FFmpeg to choose all available CPU threads; use a
positive number such as `2` to reduce CPU use. Disabling the queue can cause
several conversions to consume CPU and memory simultaneously. Social downloads
remain serial and wait a random 5-10 seconds after the previous job before
starting, even if the conversion queue is disabled. Set both download delay
values to `0` to disable only the pause.

### Media Validation

Media files are checked:

1. Using metadata before download
2. Again after the download is complete
3. Before being processed by sharp or ffmpeg

When enabled, ffmpeg and sharp tasks are processed through the configured queue.

### Log Retention

Old command usage logs and administrative action logs are removed according to:

```env
LOG_RETENTION_DAYS=90
```

The default retention period is 90 days.

Before pushing the project to GitHub, follow the security checklist in [SECURITY.md](SECURITY.md).

---

## ⚠️ WhatsApp Notice

This project uses **Baileys**, an unofficial WhatsApp Web library.

It is not an official WhatsApp Business API integration.

Because of this:

* WhatsApp updates may break some functionality
* Linked sessions may expire
* Commands may stop working after protocol changes
* The connected WhatsApp account may be restricted
* The connected WhatsApp account may be banned

Use a dedicated WhatsApp number and avoid:

* Spam
* Mass unsolicited messages
* Aggressive automation
* Repeated group actions
* Rapid command execution
* Bulk messaging
* Abusive mention commands
* Unapproved promotional messages

The developers and contributors are not responsible for account restrictions caused by improper usage.

---

## 🗺️ Development Roadmap

* [x] WhatsApp connection through Baileys
* [x] TypeScript command system
* [x] Group administration tools
* [x] Basic group information commands
* [x] Gemini AI integration
* [x] AI memory controls
* [x] Poll creation
* [x] Media conversion
* [x] Simple minigames
* [x] English and Malay support
* [ ] Web-based administration dashboard
* [ ] Command permission configuration
* [ ] Custom welcome and goodbye messages
* [ ] Warning and moderation system
* [ ] Scheduled group announcements
* [ ] Anti-link protection
* [ ] Anti-spam protection
* [ ] Additional minigames
* [ ] Plugin-based command system
* [ ] PostgreSQL support
* [ ] Official WhatsApp API compatibility research

---

## 🤝 Contributing

Contributions are welcome.

### Contribution Workflow

1. Fork the repository
2. Create a new branch
3. Make the required changes
4. Add or update tests
5. Run the test suite
6. Commit the changes
7. Push the branch
8. Open a pull request

```powershell
git checkout -b feature/new-feature
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature
```

Use clear commit messages such as:

```text
feat: add warning command
fix: prevent duplicate poll options
docs: improve installation guide
refactor: separate media processing service
test: add admin permission tests
```

---

## 🐛 Bug Reports

When reporting a bug, include:

* Operating system
* Node.js version
* Mizuki version or commit
* Error message
* Relevant logs
* Steps to reproduce the problem
* Expected result
* Actual result

Do not include:

* Gemini API keys
* Database passwords
* `.env` contents
* WhatsApp authentication files
* Personal WhatsApp numbers
* Private group messages

---

## 📜 License

Mizuki is licensed under the [MIT License](LICENSE).

```text
MIT License

You may use, modify, distribute, and build upon this project
according to the conditions of the MIT License.
```

---

## 👨‍💻 Developer

<div align="center">

### Built by TakanashiHaryth

<p>
  <a href="https://github.com/TakanashiHaryth">
    <img src="https://img.shields.io/badge/GitHub-TakanashiHaryth-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/>
  </a>
</p>

> “Life is like a GitHub repository. No progress happens until you make a commit.”

</div>

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12,20,24&height=120&section=footer" width="100%" alt="Footer"/>

### Thanks for visiting Mizuki.

**Admin · Automate · Communicate · Protect**

⭐ Star the repository if Mizuki is useful to your community.

</div>
