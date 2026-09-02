# Mizuki v1.2.0 — Release Notes

<div align="center">

<img src="https://readme-typing-svg.herokuapp.com?font=Orbitron&size=30&duration=3500&pause=900&color=00BFFF&center=true&vCenter=true&width=720&lines=Mizuki+v1.2.0;Per-Group+Personality;Social+Media+Downloader;Smarter+AI+and+Media+Processing" alt="Mizuki v1.2.0"/>

# 🌊 Mizuki v1.2.0

### 🧠 Group Personality · 📥 Social Downloader · ⚡ Smarter AI · 🎬 Better Media

![Release](https://img.shields.io/badge/Release-v1.2.0-00BFFF?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge\&logo=typescript\&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini_AI-8E75B2?style=for-the-badge\&logo=googlegemini\&logoColor=white)

</div>

---

## 🌌 What's New

Mizuki `v1.2.0` introduces **per-group personalities**, social media download commands, layered TikTok fallbacks, improved Gemini AI controls, and more configurable media processing.

```text
╭──────────────────────────────────────────╮
│             MIZUKI v1.2.0               │
├──────────────────────────────────────────┤
│  🧠 Per-Group Personality               │
│  📥 Social Media Downloader             │
│  ⚡ Improved AI Controls                │
│  🎬 Configurable Media Processing       │
│  🛡️ Downloader Safety Improvements      │
╰──────────────────────────────────────────╯
```

---

## 🧠 Per-Group Personality

Group admins can now view, change, or reset Mizuki's personality directly from WhatsApp:

```text
!m personality
!m personality cheerful, gentle and playful
!m personality reset
```

Each group's personality is stored in MySQL.

`personality.md`, `PERSONALITY_FILE`, and `BOT_PERSONA` are no longer used.

Mizuki's default identity remains a cheerful and helpful WhatsApp assistant designed to support group administrators.

---

## 📥 Social Media Downloader

New commands:

```text
!m yt <link>
!m tt <link>
!m ig <link>
!m x <link>
```

Audio mode is also supported:

```text
!m yt audio <link>
!m tt audio <link>
!m ig audio <link>
!m x audio <link>
```

Supported platforms:

| Platform    | Support                          |
| ----------- | -------------------------------- |
| YouTube     | Video & Audio                    |
| TikTok      | Video, Audio & Multi-Media Posts |
| Instagram   | Video, Audio & Multi-Media Posts |
| X / Twitter | Video & Audio                    |

Video downloads prefer formats up to **720p**, with compatible fallback formats used when necessary.

TikTok uses the following fallback chain:

```text
yt-dlp / gallery-dl
        ↓
    SocialKit
        ↓
      TikWM
```

Local downloaders are attempted first to avoid unnecessary SocialKit API usage.

SocialKit requires:

```env
SOCIALKIT_API_KEY=your_api_key
```

TikWM does not require an API key and is enabled by default.

To disable it:

```env
TIKWM_FALLBACK_ENABLED=false
```

---

## ⚡ Improved AI

Gemini AI handling has been improved with:

* Uncapped input and output text at the application level
* Automatic OpenRouter free-model fallback when configured
* Configurable request timeout
* Lightweight thinking mode on supported models
* Different messages for rate limits, cancellation, and timeout errors
* More controlled AI responses

---

## 🎬 Media Processing

Media processing is now more flexible:

* `!m status` prepares a video or video document as an HD MP4 for forwarding to `My status`
* Compatible H.264/AAC MP4 sources are remuxed without re-encoding
* Status processing enforces size, duration, resolution, FPS and timeout guards and removes embedded metadata
* No per-user limit for media conversions
* One media job processed at a time by default
* Bounded processing queue
* Configurable animated sticker FPS
* Configurable WebP compression
* Configurable FFmpeg threads
* Resolution automatically adjusted based on video duration
* Processing reactions are now used only for media commands

---

## 🛡️ Downloader Reliability & Safety

This release also improves downloader security and stability:

* Single-instance protection prevents multiple processes from sharing the same `auth_state/`
* Social downloads run sequentially with randomized delays
* One shared deadline is used across local tools and fallback APIs
* Provider URLs require HTTPS and approved hosts
* Redirects are rejected
* File sizes, carousel counts, media duration, and API responses are limited
* Tracking parameters are removed before TikTok links are sent to providers

---

## 📋 Additional Requirements

Social download commands require:

```powershell
yt-dlp --version
gallery-dl --version
ffmpeg -version
```

SocialKit is optional.

TikWM works without an API key.

If browser cookies are required for login-protected content, use a dedicated account and only enable this functionality in trusted groups.

---

## 🚀 Upgrade Guide

Stop the previous Mizuki process, then run:

```powershell
git pull
npm install
npm run migrate
npm test
npm run dev
```

`npm run migrate` is required because `v1.2.0` adds:

```text
groups.personality
```

The migration is safe to run again because an existing column will be skipped.

Also review `.env.example` for new AI, downloader, FFmpeg, and media queue configuration options.

Never commit:

```text
.env
auth_state/
browser cookies
database backups
```

---

## 🔄 Behavior Changes

* Personality is now configured per group by administrators.
* Markdown-based personality configuration is no longer used.
* `MEDIA_RATE_LIMIT_*`, `PERSONALITY_FILE`, and `BOT_PERSONA` are deprecated.
* Commands now require a space after the prefix.

Correct:

```text
!m help
!m ping
!m yt <link>
```

No longer recognized:

```text
!mhelp
!mping
```

Backward-compatible aliases remain available:

```text
!m uptime    → !m infobot
!m instagram → !m ig
```

---

<div align="center">

## 🌙 Mizuki v1.2.0

> **More personality. More media. Better control.**

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12,20,24&height=110&section=footer" width="100%" alt="Footer"/>

**Admin · Automate · Download · Communicate**

</div>
