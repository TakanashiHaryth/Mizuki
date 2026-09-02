# Changelog

All important changes to Mizuki will be recorded in this file.

## [1.2.1] - 2026-09-02

### Changed

- Persistent storage has moved from MySQL/MariaDB to PostgreSQL using the `pg`
  driver, parameterized queries and `DATABASE_URL` support for 24/7 hosting.
- Database backup and restore commands now use `pg_dump` and `psql`; local
  connection settings use the standard PostgreSQL `PG*` variables.

### Compatibility

- Run `npm install` and `npm run migrate` against a PostgreSQL database before
  starting this version. Existing MySQL data is not copied automatically.

## [1.2.0] - 2026-08-25

### Added

- Admin command `!m personality` to view, change and reset Mizuki's properties separately for each group.
- Single-instance protection to prevent WhatsApp session conflicts when two Mizuki processes are started simultaneously.
- Media commands `!m yt`, `!m tt`, `!m ig` and `!m x` to download public videos or MP3 audio using the `audio` option.
- Support for multiple photos/videos in a single Instagram or X post, with the old `!m instagram` alias retained internally.
- Support for all available photos from TikTok photo posts via `!m tt`, without altering the existing HD video path.
- Media command `!m status` to prepare a video or video document as an HD MP4 that can be forwarded to WhatsApp Status. Compatible sources are remuxed without re-encoding.
- Optional SocialKit fallback for TikTok videos/audio when the local downloader fails or is blocked, using the free-tier key from `.env`.
- TikWM fallback without an API key after SocialKit fails or free credits run out, including support for videos, audio and multiple image posts.

### Changed

- All commands now require a space after the prefix, for example `!m help`; compact forms like `!mhelp` are no longer considered commands.
- Personality is now stored in MySQL and is no longer read from `.env` or `personality.md`.
- The default Mizuki identity is a WhatsApp assistant bot to help admins, with a cheerful, helpful and cheerful personality.
- AI input and response text no longer have Mizuki-level length caps. Gemini uses the lightest thinking mode on models that support it, with OpenRouter's free-model router available as an automatic fallback.
- The MP4 format selector now has a fallback for media without 720p resolution metadata,
  avoiding the `Requested format is not available` error.
- Media conversion no longer has a per-user usage limit. A limited queue
  remains active by default and can be configured or disabled via `.env`.
- Animated stickers use configurable FFmpeg FPS, compression level and threads, with a lighter profile for long videos.
- Reaction processing is now used for media commands only.

### Fixed

- Gemini errors `429`, `499`, cancellation and timeout now provide specific user messages and no longer let commands wait indefinitely.
- TikTok audio requests that require a login are now routed to the fallback API.
- TikTok short-links now try both local extractors before the API so that carousel photo links are not mistaken for a single video.
- Empty carousel responses, invalid provider URLs, redirects and empty files are now rejected with a clear error.

### Security

- Status video downloads and FFmpeg output now have hard byte caps and processing deadlines; extreme dimensions/FPS are rejected and embedded metadata/chapters are removed.
- Download URLs are checked using HTTPS and a host allowlist before the media provider is downloaded; provider redirects are blocked.
- JSON and third-party media responses have size, count, duration and timeout limits.
- A single deadline is shared by the entire downloader chain so that subsequent fallbacks do not restart the full wait time.
- Query tracking and fragments are stripped before the TikTok link is sent to the API.

### Compatibility

- `npm run migrate` is required to add the `groups.personality` column.
- `personality.md`, `PERSONALITY_FILE`, `BOT_PERSONA` and `MEDIA_RATE_LIMIT_*` settings are deprecated.
- The social command requires `yt-dlp`, `gallery-dl` and `ffmpeg`; the TikWM fallback does not require an API key, while SocialKit remains optional.

## [1.1.0] - 2026-08-03

### Added

- Local MySQL backup system via `db:backup`, `db:list`, `db:verify`, `db:check`
  and `db:restore`.
- SQL backups are compressed as `.sql.gz` and given an SHA-256 checksum.
- Automatic safety backup before the restore process and 30-day backup retention.
- Animated WhatsApp stickers in WebP format via the `!m togif` command.
- Adaptive compression of animated stickers to stay under the 500 KB limit.
- `pack name` and `author` metadata for regular and animated stickers.
- `⏳`, `✅` and `❌` status reactions for AI and media processes.

### Changed

- `!m infobot` now also displays the complete uptime in days, hours, minutes, and seconds.
- `!m uptime` has been removed from the menu but is kept as an alias for `!m infobot`.
- `!m togif` output is converted from an MP4 video with `gifPlayback` into a real animated WebP sticker.
- The bot version is now read directly from `package.json` so the version number is consistent.

### Security

- The `backups/` folder is excluded from Git because the dumps contain user data.
- The MySQL password is passed to the XAMPP tool via a temporary options file and not on the command line.
- Restores now require `--yes` confirmation; files with a bad checksum will be rejected.

### Compatibility

- No database changes are required for v1.1.0.
- Node.js 20+, MySQL/MariaDB and ffmpeg are still required.
