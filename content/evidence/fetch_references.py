"""Fetch reference-only media to ignored artifacts; never copy into public assets."""
import urllib.request,urllib.parse,re,json,concurrent.futures,html
from pathlib import Path
root=Path('artifacts/references');root.mkdir(parents=True,exist_ok=True)
urls={
'great-eight':'https://www.gbrmpa.gov.au/learn/animals/great-8',
'green-turtle':'https://www.fisheries.noaa.gov/species/green-turtle',
'giant-clam':'https://www.dbca.wa.gov.au/wildlife-and-ecosystems/marine/marine-parks/fun-facts/giant-clam',
'buff-banded-rail':'https://www.birdsinbackyards.net/species/Gallirallus-philippensis',
'seagrass':'https://oceanservice.noaa.gov/facts/seagrass.html',
'casey':'https://www.antarctica.gov.au/antarctic-operations/stations-and-field-locations/casey/environment/',
'adelie-penguin':'https://www.antarctica.gov.au/about-antarctica/animals/penguins/adelie-penguin/',
'emperor-penguin':'https://www.antarctica.gov.au/about-antarctica/animals/penguins/emperor-penguin/',
'weddell-seal':'https://www.antarctica.gov.au/about-antarctica/animals/seals/weddell-seal/',
'southern-elephant-seal':'https://www.antarctica.gov.au/about-antarctica/animals/seals/elephant-seal/',
'leopard-seal':'https://www.antarctica.gov.au/about-antarctica/animals/seals/leopard-seal/',
'snow-petrel':'https://www.antarctica.gov.au/about-antarctica/animals/flying-birds/petrels-and-shearwaters/snow-petrel/',
'bloody-belly-comb-jelly':'https://www.mbari.org/animal/bloody-belly-comb-jelly/',
'barreleye':'https://www.mbari.org/animal/barreleye-fish/',
'vampire-squid':'https://www.mbari.org/animal/vampire-squid/',
'big-red-jelly':'https://www.mbari.org/animal/big-red-jelly/',
'redhead-larvacean':'https://www.mbari.org/animal/redhead-larvacean/',
'benwood':'https://floridakeys.noaa.gov/shipwrecktrail/benwood.html',
'keys-creatures':'https://floridakeys.noaa.gov/education/creature-feature.html',
'buck-animals':'https://www.nps.gov/buis/learn/nature/animals.htm',
'sergeant-major':'https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/sergeant-major/',
}
def fetch(kv):
 k,u=kv
 try:
  s=urllib.request.urlopen(u,timeout=25).read().decode();(root/(k+'.html')).write_text(s)
  og=re.findall(r'<meta[^>]+property=[\"\']og:image[\"\'][^>]+content=[\"\']([^\"\']+)',s)
  imgs=[]
  for tag in re.findall(r'<img\b[^>]*>',s):
   m=re.search(r'src=[\"\']([^\"\']+)',tag)
   if m: imgs.append({'url':urllib.parse.urljoin(u,html.unescape(m[1])),'tag':tag})
  if og:
   im=urllib.parse.urljoin(u,html.unescape(og[0])); urllib.request.urlretrieve(im,root/(k+'.jpg'))
  return k,{'page':u,'og':og,'images':imgs,'error':None}
 except Exception as e:return k,{'page':u,'error':str(e)}
results=dict(concurrent.futures.ThreadPoolExecutor(max_workers=8).map(fetch,urls.items()))
(root/'fetch-index.json').write_text(json.dumps(results,indent=2))
print(json.dumps({k:{'og':v.get('og'), 'count':len(v.get('images',[])), 'error':v['error']} for k,v in results.items()},indent=2))
