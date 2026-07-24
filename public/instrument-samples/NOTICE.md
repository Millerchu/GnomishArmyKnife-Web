# Instrument sample notices

The runtime samples in this directory are derived exclusively from works
published under the Creative Commons CC0 1.0 Universal public-domain
dedication. Attribution is not required by CC0, but the source trail is kept
here so the assets remain auditable.

## Guitar

- Source: FreePats, “Spanish classical guitar”, version 2019-06-18
- Creator: Roberto / FreePats
- Source page: https://freepats.zenvoid.org/Guitar/acoustic-guitar.html
- License: https://creativecommons.org/publicdomain/zero/1.0/
- Downloaded archive SHA-256:
  `903916921a21662d2237ade7f0e98e55de93cb7b86da219e4e10f4ad385b8f5e`
- Processing: selected E2, A2, D3, G3, B3, E4, A4 and E5 recordings;
  removed leading silence; limited each decay to at most three seconds;
  added a short tail fade; converted to mono 44.1 kHz, 72 kbps MP3.

## Ukulele

- Source: Wikimedia Commons, “C Major Scale Ukulele.ogg”
- Source page: https://commons.wikimedia.org/wiki/File:C_Major_Scale_Ukulele.ogg
- License: https://creativecommons.org/publicdomain/zero/1.0/
- Downloaded source SHA-256:
  `648283431488eb37aa9735fe316967efbf2007ddaab48a6a567fae649f3f9883`
- Processing: segmented the C4, E4, G4, A4 and C5 plucks; removed leading
  silence; added a short tail fade; converted to mono 44.1 kHz, 72 kbps MP3.

## Guzheng

- Source: Freesound, “GUZHENG - instrument- Single Note”
- Creator: nanliu_music
- Source page: https://freesound.org/people/nanliu_music/sounds/847157/
- License: https://creativecommons.org/publicdomain/zero/1.0/
- Downloaded high-quality preview SHA-256:
  `5e0204e3f110922f9dc19b0f24d029406ec0bc0e0ae2eaa80e27682952eacacf`
- Processing: isolated the two A3 plucks as strong and soft layers, removed
  leading silence, pitch-mapped them to nine roots spanning D2–D6, limited
  long decays to 3.2 seconds, added a short tail fade, and converted to mono
  44.1 kHz, 72 kbps MP3.

## Piano

- Source: native Web Audio oscillator synthesis; no downloaded or embedded
  audio asset is used.
- Processing: each struck key combines a fundamental with short, decaying
  harmonic partials at runtime. This avoids adding a copyright-bearing piano
  sample library while retaining low-latency touch response.

The listed sample processing was performed with FFmpeg 8.1.1. Runtime volume,
pitch variation, and the piano synthesis are applied non-destructively through
the Web Audio API.
