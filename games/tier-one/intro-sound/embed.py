#!/usr/bin/env python3
"""Swap the intro soundtrack embedded in tier-one/index.html (BOOT_SND, base64 MP3) for a newly rendered one.
Usage: python3 embed.py intro.wav   (needs ffmpeg on PATH or $FFMPEG; encodes MP3 192 kbps, which every browser/WebView plays)"""
import base64, os, re, subprocess, sys, tempfile
here = os.path.dirname(os.path.abspath(__file__))
html = os.path.join(here, '..', '..', '..', 'tier-one-classic', 'index.html')
mp3 = os.path.join(tempfile.mkdtemp(), 'snd.mp3')
subprocess.check_call([os.environ.get('FFMPEG', 'ffmpeg'), '-loglevel', 'error', '-y', '-i', sys.argv[1], '-c:a', 'libmp3lame', '-b:a', '192k', mp3])
b64 = base64.b64encode(open(mp3, 'rb').read()).decode()
s = open(html, encoding='utf-8').read()
s, n = re.subn(r"var BOOT_SND='[A-Za-z0-9+/=]*';", "var BOOT_SND='" + b64 + "';", s)
assert n == 1, n
open(html, 'w', encoding='utf-8').write(s)
print('embedded', len(b64), 'base64 chars')
