#!/usr/bin/env python3
"""Import a batch of player portraits into Tier One.

Usage: python3 games/tier-one/v3/tools/import_player_art.py <folder-or-zip>
Files must be named <player-id>.png (and optionally <player-id>-react.png), e.g. p-erling-haaland.png.
Writes web/public/art/players/<id>.webp (512px, transparent) and adds manifest entries under "player":
  "<id>": "players/<id>.webp", "<id>@joy": "players/<id>-react.webp" (the reaction is also used for confident).
"""
import json, os, sys, tempfile, zipfile
from PIL import Image, ImageFile
ImageFile.LOAD_TRUNCATED_IMAGES = True
HERE = os.path.dirname(os.path.abspath(__file__))
ART = os.path.join(HERE, '..', 'web', 'public', 'art')
WORLD = json.load(open(os.path.join(HERE, '..', 'web', 'src', 'data', 'world.json')))
IDS = {p['id'] for p in WORLD['players']}

def main(src):
    if zipfile.is_zipfile(src):
        tmp = tempfile.mkdtemp(); zipfile.ZipFile(src).extractall(tmp); src = tmp
    files = [os.path.join(r, f) for r, _, fs in os.walk(src) for f in fs if f.lower().endswith(('.png', '.webp', '.jpg', '.jpeg'))]
    os.makedirs(os.path.join(ART, 'players'), exist_ok=True)
    mpath = os.path.join(ART, 'manifest.json'); m = json.load(open(mpath)); m.setdefault('player', {})
    done, unknown = 0, []
    for f in sorted(files):
        stem = os.path.splitext(os.path.basename(f))[0].lower()
        react = stem.endswith('-react'); pid = stem[:-6] if react else stem
        if pid not in IDS: unknown.append(os.path.basename(f)); continue
        im = Image.open(f).convert('RGBA')
        w, h = im.size
        if h > w: im = im.crop((0, 0, w, w))  # a tall image (e.g. with a caption band below): keep the top square, the face
        elif w > h: x = (w - h) // 2; im = im.crop((x, 0, x + h, h))
        im = im.resize((512, 512), Image.LANCZOS)
        out = 'players/' + pid + ('-react' if react else '') + '.webp'
        im.save(os.path.join(ART, out), 'WEBP', quality=86, method=6)
        if react: m['player'][pid + '@joy'] = out; m['player'][pid + '@confident'] = out
        else: m['player'][pid] = out
        done += 1
    json.dump(m, open(mpath, 'w'), indent=1, ensure_ascii=False)
    # the playable roster is exactly the players with art (owner, 3.9.6): keep api/tier-one/v3/_lib/art-roster.mjs in step
    ids = sorted(k for k in m['player'] if '@' not in k)
    rp = os.path.join(HERE, '..', '..', '..', '..', 'api', 'tier-one', 'v3', '_lib', 'art-roster.mjs')
    head = open(rp).readline() if os.path.exists(rp) else '// the playable roster: players with painted art\n'
    open(rp, 'w').write(head + 'export default ' + json.dumps(ids, indent=0) + ';\n')
    print('roster file updated:', len(ids), 'players; now run: cd games/tier-one/v3/web && node scripts/build-world.mjs')
    print(f'imported {done} images; manifest has {len([k for k in m["player"] if "@" not in k])} players')
    if unknown: print('not in the roster (check the file name):', ', '.join(unknown))

if __name__ == '__main__':
    if len(sys.argv) != 2: print(__doc__); sys.exit(1)
    main(sys.argv[1])
