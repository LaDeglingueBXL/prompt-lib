# scripts/deploy.py
# Usage : python deploy.py
# Prérequis : pip install Pillow --break-system-packages

import json
import shutil
import sys
from datetime import datetime
from pathlib import Path

# ── CONFIG ──────────────────────────────────────────────────────────────────
PROJECT_ROOT   = Path(__file__).resolve().parent.parent
EXPORT_FILE    = PROJECT_ROOT / 'export_data.json'
ORIGINALS_DIR  = PROJECT_ROOT / 'assets' / 'originals'
THUMBS_DIR     = PROJECT_ROOT / 'assets' / 'thumbs'
DRIVE_ROOT     = Path(r'H:\Mon Drive\prompt-lib')
THUMB_WIDTH    = 300
THUMB_QUALITY  = 75
# ────────────────────────────────────────────────────────────────────────────

def generate_thumbs():
    try:
        from PIL import Image
    except ImportError:
        print('⚠️  Pillow non installé — thumbs ignorées.')
        print('   Lance : pip install Pillow --break-system-packages')
        return

    THUMBS_DIR.mkdir(parents=True, exist_ok=True)
    originals = list(ORIGINALS_DIR.glob('*'))
    if not originals:
        print('   Aucun original trouvé — thumbs ignorées.')
        return

    count = 0
    for src in originals:
        if src.suffix.lower() not in ('.jpg', '.jpeg', '.png', '.webp'):
            continue
        dst = THUMBS_DIR / (src.stem + '.jpg')
        if dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
            continue  # Thumb à jour
        try:
            with Image.open(src) as img:
                img = img.convert('RGB')
                ratio = THUMB_WIDTH / img.width
                new_h = int(img.height * ratio)
                img = img.resize((THUMB_WIDTH, new_h), Image.LANCZOS)
                img.save(dst, 'JPEG', quality=THUMB_QUALITY)
            count += 1
        except Exception as e:
            print(f'   ⚠️  {src.name} : {e}')
    print(f'   {count} thumb(s) générée(s).')

def copy_to_drive(data):
    DRIVE_ROOT.mkdir(parents=True, exist_ok=True)

    # data.json
    dst_json = DRIVE_ROOT / 'data.json'
    dst_json.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'   data.json → {dst_json}')

    # thumbs
    drive_thumbs = DRIVE_ROOT / 'thumbs'
    drive_thumbs.mkdir(exist_ok=True)
    copied = 0
    if THUMBS_DIR.exists():
        for thumb in THUMBS_DIR.glob('*.jpg'):
            shutil.copy2(thumb, drive_thumbs / thumb.name)
            copied += 1
    print(f'   {copied} thumb(s) copiée(s) → {drive_thumbs}')

def main():
    if not EXPORT_FILE.exists():
        print('❌ export_data.json introuvable.')
        print('   Clique sur "Déployer" dans l\'app d\'abord.')
        sys.exit(1)

    print(f'📂 Lecture de {EXPORT_FILE.name}...')
    data = json.loads(EXPORT_FILE.read_text(encoding='utf-8'))
    entries = len(data.get('entries', []))
    briques = len(data.get('briques', []))
    print(f'   {entries} entrée(s), {briques} brique(s).')

    print('🖼  Génération des thumbs...')
    generate_thumbs()

    print('☁️  Copie vers Google Drive...')
    copy_to_drive(data)

    print(f'\n✅ Déploiement terminé — {datetime.now().strftime("%H:%M:%S")}')
    print(f'   Google Drive synchronisera automatiquement.')

if __name__ == '__main__':
    main()