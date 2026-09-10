import fs from 'node:fs';
import validator from 'gltf-validator';
const result=[];
for(const name of fs.readdirSync('public/assets/models').filter(n=>n.endsWith('.glb'))){
 const buffer=fs.readFileSync(`public/assets/models/${name}`);
 const r=await validator.validateBytes(new Uint8Array(buffer),{uri:name});
 const n=buffer.readUInt32LE(12),gltf=JSON.parse(buffer.subarray(20,20+n).toString());
 result.push({name,bytes:buffer.length,errors:r.issues.numErrors,warnings:r.issues.numWarnings,messages:r.issues.messages,clips:(gltf.animations??[]).map(a=>a.name),nodes:gltf.nodes?.length,primitives:gltf.meshes.reduce((n,m)=>n+m.primitives.length,0)});
}
fs.mkdirSync('artifacts/art',{recursive:true});fs.writeFileSync('artifacts/art/glb-validation.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({count:result.length,errors:result.reduce((n,r)=>n+r.errors,0),warnings:result.reduce((n,r)=>n+r.warnings,0),bytes:result.reduce((n,r)=>n+r.bytes,0)},null,2));
if(result.some(r=>r.errors))process.exitCode=1;
