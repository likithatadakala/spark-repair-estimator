const DB='spark_photos', STORE='photos', VER=1;
function open(){
  return new Promise((res,rej)=>{
    const r=indexedDB.open(DB,VER);
    r.onupgradeneeded=()=>{ const db=r.result; if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE); };
    r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error);
  });
}
async function tx(mode){ const db=await open(); return db.transaction(STORE,mode).objectStore(STORE); }

export async function putPhoto(id, blob){ const s=await tx('readwrite');
  return new Promise((res,rej)=>{ const r=s.put(blob,id); r.onsuccess=()=>res(id); r.onerror=()=>rej(r.error); }); }
export async function getPhoto(id){ const s=await tx('readonly');
  return new Promise((res,rej)=>{ const r=s.get(id); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
export async function delPhoto(id){ const s=await tx('readwrite');
  return new Promise((res,rej)=>{ const r=s.delete(id); r.onsuccess=()=>res(); r.onerror=()=>rej(r.error); }); }

// Downscale a File to a compressed JPEG Blob before storage.
// Rejects (rather than hanging or storing null) on read/decode/encode failure
// so callers can clean up and surface an error.
export function compress(file, maxDim=1600, quality=0.82){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=()=>reject(reader.error || new Error('file read failed'));
    reader.onload=e=>{ const img=new Image();
      img.onerror=()=>reject(new Error('image decode failed'));
      img.onload=()=>{ const ratio=Math.min(maxDim/img.width, maxDim/img.height, 1);
        const c=document.createElement('canvas'); c.width=Math.round(img.width*ratio); c.height=Math.round(img.height*ratio);
        c.getContext('2d').drawImage(img,0,0,c.width,c.height);
        c.toBlob(b=> b ? resolve(b) : reject(new Error('toBlob failed')),'image/jpeg',quality); };
      img.src=e.target.result; };
    reader.readAsDataURL(file);
  });
}
