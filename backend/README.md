# Spotlit API

Backend for the Spotlit NN1.dev toolkit.

## Tech
- Express
- Typescript
- FFMPEG

## Local Development
### Prerequisites
- FFMPEG available in PATH
- Node.js 18+ installed
- pnpm installed

### Setup
```bash
pnpm install
pnpm dev
```

## Notes
### Filters used on final interview audio
- highpass - cuts low-end noise and desk rumble
- afftdn - reduces background noise
- acompressor - evens out volume differences between segments
- acrossfade - slightly smooths transitions between segments
- loudnorm - normalises loudness to the quiter broadcast standard