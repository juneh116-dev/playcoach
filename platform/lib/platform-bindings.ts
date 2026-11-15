import {db} from './db';import type {Pool,PoolClient} from 'pg';
type Executor=Pick<Pool,'query'>|Pick<PoolClient,'query'>;
export function postgresSQL(sql:string){let i=0;const ignore=/^INSERT OR IGNORE /i.test(sql);let result=sql.replace(/^INSERT OR IGNORE /i,'INSERT ').replace(/\?/g,()=>'$'+(++i));if(ignore)result+=' ON CONFLICT DO NOTHING';return result;}
class Statement{
 constructor(readonly executor:Executor,readonly sql:string,readonly params:any[]=[]){}
 bind(...params:any[]){return new Statement(this.executor,this.sql,params);}
 async first<T=Record<string,unknown>>(){return (await this.executor.query(postgresSQL(this.sql),this.params)).rows[0] as T|null||null;}
 async all(){return {results:(await this.executor.query(postgresSQL(this.sql),this.params)).rows};}
 async run(){const result=await this.executor.query(postgresSQL(this.sql),this.params);return {meta:{changes:result.rowCount||0}};}
}
export function bindings(){
 const pool=process.env.DATABASE_URL?db():undefined;
 const DB=pool?{prepare:(sql:string)=>new Statement(pool,sql),async batch(statements:Statement[]){const client=await pool.connect();try{await client.query('BEGIN');const results=[];for(const s of statements)results.push(await new Statement(client,s.sql,s.params).run());await client.query('COMMIT');return results;}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}}:undefined;
 const STORAGE=pool?{async put(key:string,bytes:Uint8Array,_options?:unknown){await pool.query('INSERT INTO pc_upload_blobs(id,bytes) VALUES($1,$2)',[key,Buffer.from(bytes)]);},async delete(key:string){await pool.query('DELETE FROM pc_upload_blobs WHERE id=$1',[key]);},async get(key:string){const result=await pool.query('SELECT bytes FROM pc_upload_blobs WHERE id=$1',[key]);return result.rows[0]?{body:new Uint8Array(result.rows[0].bytes)}:null;}}:undefined;
 return {DB,STORAGE,KAKAO_CLIENT_ID:process.env.KAKAO_CLIENT_ID,KAKAO_CLIENT_SECRET:process.env.KAKAO_CLIENT_SECRET,NAVER_CLIENT_ID:process.env.NAVER_CLIENT_ID,NAVER_CLIENT_SECRET:process.env.NAVER_CLIENT_SECRET,ADMIN_MEMBER_ID:process.env.ADMIN_MEMBER_ID};
}
