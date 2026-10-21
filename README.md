# Buzzer Showdown

Build a quiz buzzer web app with the following features:

Player side:

A full-screen big red buzzer button

On press, play a custom audio file (host uploads the sound)

Show the player's name (entered on join)

After buzzing, the button locks (disabled) until host resets

Host side (separate view or admin toggle):

Create a game room with a short code (e.g. 4 chars)

See a live list of who buzzed and in what order (with millisecond timestamps)

Upload a custom buzzer sound (MP3/WAV) — this is what plays for all players

Upload optional "correct" and "wrong" sound effects

Reset all buzzers between rounds

Simple scoreboard: add/subtract points per player

Technical requirements:

Real-time via Socket.IO or Supabase Realtime

Players join via a URL with the room code (e.g. /room/ABCD)

Works on mobile browsers (responsive, big touch targets)

No login required — just enter a name to join

Dark theme, game show aesthetic, big bold text

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://buzzer-showdown.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b1523367-aac5-48f6-8e50-92e0cb000ad1).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
