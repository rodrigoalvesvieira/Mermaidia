import fs from 'node:fs';
import crypto from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { dedup, weld, prune } from '@gltf-transform/functions';
const io=new NodeIO();
const manifest=JSON.parse(fs.readFileSync('assets/manifests/models.json','utf8'));
const references=JSON.parse(fs.readFileSync('assets/source/model-reference-index.json','utf8'));
const report=[];
const scopedIds=process.argv[2]?.split(',');
for(const record of manifest){
 if(!record.localPath.endsWith('.glb') || (scopedIds && !scopedIds.includes(record.id)))continue;
 const before=fs.statSync(record.localPath).size;
 const doc=await io.read(record.localPath);
 await doc.transform(dedup(),weld(),prune({keepAttributes:true}));
 const bytes=await io.writeBinary(doc);
 // Retain the authored original if serializer overhead outweighs the optimization.
 if(bytes.length<before)fs.writeFileSync(record.localPath,bytes);
 const after=fs.statSync(record.localPath).size;
 record.sha256=crypto.createHash('sha256').update(fs.readFileSync(record.localPath)).digest('hex');
 const note='glTF Transform dedup/weld/prune with measured-size acceptance; no lossy geometry or external decoder';
 if(!record.modifications.includes(note))record.modifications.push(note);
 report.push({id:record.id,before,after,saved:before-after});
}
for(const r of manifest){if(scopedIds && !scopedIds.includes(r.id.replace(/-portrait$/,'')))continue;const ref=references.find(x=>x.id===r.id.replace(/-portrait$/,''));if(ref)r.evidenceIds=ref.evidenceIds;}
fs.writeFileSync('assets/manifests/models.json',JSON.stringify(manifest,null,2)+'\n');
const previous=scopedIds?JSON.parse(fs.readFileSync('artifacts/art/optimization.json','utf8')):[];
fs.writeFileSync('artifacts/art/optimization.json',JSON.stringify([...previous.filter(r=>!report.some(n=>n.id===r.id)),...report],null,2)+'\n');
console.log(JSON.stringify({assets:report.length,before:report.reduce((n,r)=>n+r.before,0),after:report.reduce((n,r)=>n+r.after,0)}));
