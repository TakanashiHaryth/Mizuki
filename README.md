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
</p>

</div>

---

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
* Customizable personality

</td>
</tr>

<tr>
<td width="50%" valign="top">

### 🎬 Media Tools

Convert and process WhatsApp media.

* Image to sticker
* Sticker to image
* Media to video
* Media to GIF
* Metadata validation
* Controlled processing queue

</td>
<td width="50%" valign="top">

### 🎮 Community Tools

Add simple interactive features to groups.

* Poll creation
* Coin flipping
* Dice rolling
* Group information
* Member information
* Bot status and uptime

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

### 🛡️ Admin Commands

| Command     | Description                                         |
| ----------- | --------------------------------------------------- |
| `!mkick`    | Remove a mentioned or replied member from the group |
| `!mpromote` | Promote a member to group administrator             |
| `!mdemote`  | Remove administrator privileges from a member       |
| `!mtagall`  | Mention all group members                           |
| `!mdelete`  | Delete a replied message                            |

### 🌐 General Commands

| Command        | Description                                 |
| -------------- | ------------------------------------------- |
| `!mhelp`       | Display the command menu                    |
| `!mping`       | Check the bot response time                 |
| `!muptime`     | Display the bot uptime                      |
| `!minfobot`    | Display information about Mizuki            |
| `!minfogroup`  | Display information about the current group |
| `!minfomember` | Display information about a group member    |
| `!mowner`      | Display information about the bot owner     |
| `!mprivacy`    | Display the AI memory and privacy policy    |

### 🧠 AI Commands

| Command             | Description                           |
| ------------------- | ------------------------------------- |
| `Mizuki, [message]` | Talk directly to Mizuki               |
| `!mai [message]`    | Send a prompt to Gemini AI            |
| `!mforgetme`        | Delete personal AI memory and opt out |

### 📊 Utility Commands

| Command                                   | Description            |
| ----------------------------------------- | ---------------------- |
| `!mpoll Question \| Option 1 \| Option 2` | Create a WhatsApp poll |

Example:

```text
!mpoll Which game should we play? | MLBB | Genshin | HSR
```

### 🎮 Minigame Commands

| Command      | Description         |
| ------------ | ------------------- |
| `!mflipcoin` | Flip a virtual coin |
| `!mdice`     | Roll a virtual dice |

### 🎬 Media Commands

| Command     | Description                              |
| ----------- | ---------------------------------------- |
| `!msticker` | Convert an image or video into a sticker |
| `!mimg`     | Convert a sticker into an image          |
| `!mtovideo` | Convert supported media into a video     |
| `!mtogif`   | Convert supported media into a GIF       |

---

## 🧰 Technology Stack

<div align="center">

### Core Development

<p>
  <img src="https://skillicons.dev/icons?i=typescript,nodejs,mysql,docker&theme=dark" alt="Core Technologies"/>
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
| pino              | Structured application logging |
| Docker            | Containerized deployment       |

---

## 📋 Requirements

Before installing Mizuki, make sure the system has:

* Node.js 20 or newer
* npm
* MySQL 8 or MariaDB
* ffmpeg
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
```

> Never commit the real `.env` file to GitHub.

Keep `.env.example` inside the repository because it acts as a safe configuration template for other developers.

### 4. Configure Mizuki's Personality

Edit:

```text
personality.md
```

This file controls Mizuki's:

* Personality
* Communication style
* Preferred language
* Behavioral guidelines
* Response format
* Character identity

### 5. Create the Database

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

### 6. Run Database Migrations

```powershell
npm run migrate
```

### 7. Run Tests

```powershell
npm test
```

### 8. Start Mizuki

```powershell
npm run dev
```

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

The QR code does not need to be scanned again as long as:

* The `auth_state/` folder remains available
* The linked WhatsApp session is still active
* The account has not logged out
* WhatsApp has not invalidated the session

---

## 📁 Project Structure

```text
Mizuki/
├── auth_state/              # WhatsApp authentication session
├── dist/                    # Compiled production files
├── migrations/              # Database migration files
├── src/
│   ├── commands/            # Bot command handlers
│   ├── config/              # Environment and bot configuration
│   ├── database/            # Database connection and repositories
│   ├── events/              # WhatsApp event handlers
│   ├── services/            # AI, media and application services
│   ├── utils/               # Shared utility functions
│   └── index.ts             # Application entry point
├── tests/                   # Automated tests
├── .env.example             # Safe environment template
├── .gitignore
├── personality.md           # Mizuki personality configuration
├── SECURITY.md              # Security checklist
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
!mprivacy
```

Users can delete their memory and opt out using:

```text
!mforgetme
```

### Rate Limiting

AI and media commands use per-user limits to reduce:

* Spam
* API abuse
* Excessive Gemini API usage
* High CPU usage
* High memory usage
* Repeated media processing

### Media Validation

Media files are checked:

1. Using metadata before download
2. Again after the download is complete
3. Before being processed by sharp or ffmpeg

ffmpeg and sharp tasks are processed through a queue with limited concurrency.

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
