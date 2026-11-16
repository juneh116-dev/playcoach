import {randomBytes,scrypt as nodeScrypt,timingSafeEqual} from 'node:crypto';
function scrypt(password:string,salt:string){
 return new Promise<Buffer>((resolve,reject)=>nodeScrypt(password,salt,64,{N:32768,r:8,p:3,maxmem:64*1024*1024},(error,key)=>error?reject(error):resolve(key)));
}
export async function hashPassword(password:string){
 const salt=randomBytes(16).toString('hex');
 const key=await scrypt(password,salt);
 return `scrypt-v1:${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password:string,encoded:string){
 const [version,salt,hex]=encoded.split(':');
 if(version!=='scrypt-v1'||!salt||!/^[a-f0-9]{128}$/.test(hex||''))return false;
 const derived=await scrypt(password,salt);
 return timingSafeEqual(derived,Buffer.from(hex,'hex'));
}
// Constant valid hash for nonexistent users, so login performs the same KDF.
export const absentPasswordHash='scrypt-v1:00000000000000000000000000000000:'+ '00'.repeat(64);
