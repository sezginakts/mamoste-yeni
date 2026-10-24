# Pasaparola motorunu (DKAB-Kitap-Hatti/pasaparola/mamoste.py çıktısı) Windows Defender'ın yanlış alarmından kurtarır.
#
# Sorun: motorda 404 KB'lık base64 alkış sesi (ALKIS_WAV) + atob/Uint8Array çözme döngüsü vardı. Bu kalıp Defender'ın
# makine öğrenmesi modeline "gizlenmiş betik" gibi görünüyor (Trojan:Script/ObfusScript.A!ml) ve dosya karantinaya alınıyordu.
# Düzeltme: alkış oyunda çalınan ilk ~4 saniyeye kırpılır, 16 kHz 8 bit mono WAV'a indirilir (~90 KB base64) ve
# çözme döngüsü yerine tarayıcının kendi yolu kullanılır: fetch('data:audio/wav;base64,…') → decodeAudioData.
#
# Kullanım:  python tools/etkinlik/pasaparola_duzelt.py [girdi.js]
#   girdi verilmezse git'teki son sürüm (HEAD:src/data/activities/pasaparolaEngine.js) okunur.
#   Çıktı: src/data/activities/pasaparolaEngine.js
# DKAB'dan yeni motor üretildiğinde bu betikten geçirilmeden projeye konmamalı.
import base64, io, json, os, subprocess, sys, wave, struct

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'src', 'data', 'activities', 'pasaparolaEngine.js')
KEEP_S = 4.2      # oyun en fazla ~3 sn çalıyor, 0.45 sn'den başlıyor
RATE = 16000

if len(sys.argv) > 1:
    src = open(sys.argv[1], encoding='utf-8').read()
else:
    src = subprocess.run(['git', 'show', 'HEAD:src/data/activities/pasaparolaEngine.js'], cwd=ROOT, capture_output=True, check=True).stdout.decode('utf-8')

head, body = src.split('export default ', 1)
html = json.loads(body.rstrip().rstrip(';'))

key = "const ALKIS_WAV='"
i = html.index(key) + len(key)
j = html.index("'", i)
wav = wave.open(io.BytesIO(base64.b64decode(html[i:j])))
ch, sw, rate, n = wav.getnchannels(), wav.getsampwidth(), wav.getframerate(), wav.getnframes()
assert ch == 1 and sw == 2, (ch, sw)
frames = wav.readframes(min(n, int(rate * KEEP_S)))
samples = struct.unpack('<%dh' % (len(frames) // 2), frames)
step = rate / RATE
small = bytes(max(0, min(255, int(samples[int(k * step)] / 256) + 128)) for k in range(int(len(samples) / step)))
buf = io.BytesIO()
w = wave.open(buf, 'wb')
w.setnchannels(1); w.setsampwidth(1); w.setframerate(RATE); w.writeframes(small); w.close()
html = html[:i] + base64.b64encode(buf.getvalue()).decode('ascii') + html[j:]
html = html.replace('24 kHz mono WAV, base64.', '16 kHz 8 bit mono WAV, base64 (tools/etkinlik/pasaparola_duzelt.py).')

old = "if(!alkisKayit&&typeof ALKIS_WAV!=='undefined'){const b=atob(ALKIS_WAV),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);ac.decodeAudioData(u.buffer,x=>alkisKayit=x,()=>{})}"
new = "if(!alkisKayit&&typeof ALKIS_WAV!=='undefined'){alkisKayit=1;fetch('data:audio/wav;base64,'+ALKIS_WAV).then(r=>r.arrayBuffer()).then(a=>ac.decodeAudioData(a,x=>alkisKayit=x,()=>alkisKayit=null)).catch(()=>alkisKayit=null)}"
if old in html:
    html = html.replace(old, new)
elif new not in html:
    sys.exit('Alkış çözme kodu bulunamadı; motor değişmiş olabilir.')
# alkis(): yüklenirken (alkisKayit === 1) çalma
html = html.replace("function alkis(sure=3,g=.6){if(!ac||!alkisKayit)return;", "function alkis(sure=3,g=.6){if(!ac||!alkisKayit||alkisKayit===1)return;")

out = head + 'export default ' + json.dumps(html, ensure_ascii=False) + ';\n'
open(OUT, 'w', encoding='utf-8', newline='\n').write(out)
print('yazıldı', OUT, round(len(out) / 1024), 'KB (önce', round(len(src) / 1024), 'KB)')
