# Cümleleri Microsoft neural sesi (Aria) ile mp3 olarak üretir.
# Çalıştır:  pip install edge-tts   ->   python generate-audio.py
#
# ÖNEMLİ (kayma hatası düzeltmesi):
#   Eski sürüm "dosya varsa atla" diyordu. Bir cümlenin metni değişince ama id'si
#   aynı kalınca (ör. can-2..can-10) ESKİ ses dosyası kalıyor, metin ile ses kayıyordu.
#   Bu sürüm her mp3'ün hangi metinden üretildiğini assets/audio/manifest.json içinde tutar.
#   Metin değiştiyse sesi yeniden üretir. Kaynak her zaman src/data/patterns.js'tir.
#   Sonunda src/utils/audioMap.js'i (AUDIO_MAP + AUDIO_TEXT) yeniden yazar.
import asyncio
import json
import os
import re

import edge_tts

VOICE = "en-US-AriaNeural"
RATE = "-8%"  # hafif yavaş -> shadowing için anlaşılır
OUT_DIR = os.path.join("assets", "audio")
MANIFEST = os.path.join(OUT_DIR, "manifest.json")
PATTERNS = os.path.join("src", "data", "patterns.js")
AUDIO_MAP = os.path.join("src", "utils", "audioMap.js")
CONCURRENCY = 6

SENT_RE = re.compile(r"id:\s*'([a-z]+-\d+)',\s*level:\s*\d+,\s*en:\s*(['\"])(.*?)\2,\s*tr:")


def load_sentences():
    src = open(PATTERNS, encoding="utf-8").read()
    items = [{"id": m.group(1), "en": m.group(3).replace("\\'", "'")} for m in SENT_RE.finditer(src)]
    ids = [i["id"] for i in items]
    dups = {x for x in ids if ids.count(x) > 1}
    if dups:
        raise SystemExit(f"HATA: tekrar eden id'ler: {sorted(dups)}")
    return items


def load_manifest():
    try:
        return json.load(open(MANIFEST, encoding="utf-8"))
    except FileNotFoundError:
        return {}


async def synth(sem, item, manifest):
    sid, text = item["id"], item["en"]
    path = os.path.join(OUT_DIR, f"{sid}.mp3")
    if os.path.exists(path) and os.path.getsize(path) > 0 and manifest.get(sid) == text:
        return sid, "atlandı"
    async with sem:
        for attempt in range(3):
            try:
                tmp = path + ".tmp"
                await edge_tts.Communicate(text, VOICE, rate=RATE).save(tmp)
                if os.path.getsize(tmp) > 0:
                    os.replace(tmp, path)
                    manifest[sid] = text
                    return sid, "yeniden üretildi"
            except Exception as e:
                if attempt == 2:
                    return sid, f"HATA: {e}"
                await asyncio.sleep(1.5)
    return sid, "boş"


def write_audio_map(items, manifest):
    lines = [
        "// OTOMATIK ÜRETİLDİ — generate-audio.py. Elle düzenleme.",
        "// AUDIO_MAP: cümle id -> gömülü neural ses (Aria) mp3. Metro static require gerektirir.",
        "// AUDIO_TEXT: her mp3'ün HANGİ METİNDEN üretildiği. tts.js metin uyuşmazsa mp3'ü çalmaz.",
        "export const AUDIO_MAP = {",
    ]
    ok = [i for i in items if os.path.exists(os.path.join(OUT_DIR, f"{i['id']}.mp3"))]
    for i in ok:
        lines.append(f"  \"{i['id']}\": require('../../assets/audio/{i['id']}.mp3'),")
    lines += ["};", "", "export const AUDIO_TEXT = {"]
    for i in ok:
        lines.append(f"  \"{i['id']}\": {json.dumps(manifest.get(i['id'], ''), ensure_ascii=False)},")
    lines.append("};")
    open(AUDIO_MAP, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")


async def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    items = load_sentences()
    manifest = load_manifest()
    sem = asyncio.Semaphore(CONCURRENCY)
    results = await asyncio.gather(*[synth(sem, it, manifest) for it in items])
    json.dump(manifest, open(MANIFEST, "w", encoding="utf-8"), ensure_ascii=False, indent=1, sort_keys=True)
    write_audio_map(items, manifest)
    made = [s for s, r in results if r == "yeniden üretildi"]
    errs = [(s, r) for s, r in results if r not in ("atlandı", "yeniden üretildi")]
    print(f"Toplam {len(items)} cümle | yeniden üretilen: {len(made)} | hata: {len(errs)}")
    if made:
        print("  Yenilenen:", ", ".join(made))
    for s, r in errs:
        print("  ", s, r)


if __name__ == "__main__":
    asyncio.run(main())
