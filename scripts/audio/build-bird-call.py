"""Reproduce the rights-cleared rail excerpt without modifying its pitch or timing."""
import urllib.request, json, subprocess, hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
source_url='https://static.inaturalist.org/sounds/1185828.wav?1724652137'
raw=ROOT/'assets/source/rail-238018928.wav';raw.parent.mkdir(parents=True,exist_ok=True)
expected_source_sha256='86da4e48a2793a114ba42371c858b317bcb596bd9fbd16ae02fe6192a46f7332'
if not raw.exists():urllib.request.urlretrieve(source_url,raw)
actual_source_sha256=hashlib.sha256(raw.read_bytes()).hexdigest()
if actual_source_sha256!=expected_source_sha256:raise RuntimeError('Original rail recording SHA-256 mismatch; refusing changed source')
output=ROOT/'public/assets/audio/buff-banded-rail-call.wav';output.parent.mkdir(parents=True,exist_ok=True)
# Full first isolated harmonic call, plus 150ms fade margins; road rumble attenuated.
filters='highpass=f=1000,lowpass=f=10000,loudnorm=I=-24:TP=-9:LRA=7,volume=-3dB,afade=t=in:st=0:d=0.08,afade=t=out:st=0.92:d=0.13'
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss','2.40','-t','1.05','-i',str(raw),'-af',filters,'-ar','48000','-ac','1','-c:a','pcm_s16le',str(output)],check=True)
record={'id':'buff-banded-rail-call','localPath':'public/assets/audio/buff-banded-rail-call.wav','sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'creator':'John Cull (iNaturalist user bbdown)','originUrl':'https://www.inaturalist.org/observations/238018928','licenseIdOrTerms':'CC0-1.0','licenseUrl':'https://creativecommons.org/publicdomain/zero/1.0/','attribution':'Buff-banded Rail, John Cull (bbdown), Mount Evelyn, Victoria, Australia, 26 August 2024; iNaturalist observation 238018928, sound 1185828, CC0. This is not a Green Island field recording.','modifications':['Excerpt 2.40–3.45 seconds from 9.791667-second original','High-pass 1000 Hz and low-pass 10000 Hz to reduce field ambience','Conservative loudness normalization (-24 LUFS/-9 dBTP filter targets), followed by -3 dB attenuation and short boundary fades','Mono 48000 Hz 16-bit PCM; original call speed and pitch preserved'],'distribution':'approved','evidenceIds':['rail-audio-inat','green-rail'],'buildRecipe':'python3 scripts/audio/build-bird-call.py'}
source_record={**record,'id':'buff-banded-rail-call-source','localPath':'assets/source/rail-238018928.wav','sha256':expected_source_sha256,'modifications':[],'buildRecipe':'Original CC0 recording retained verbatim; verify SHA-256 before conversion'}
(ROOT/'assets/manifests/bird-audio.json').write_text(json.dumps([record,source_record],indent=2)+'\n')
print(record['localPath'],output.stat().st_size,record['sha256'])
