'use client';
import {useState} from 'react';
export default function AccountForm({signup=false}:{signup?:boolean}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false);
 if(done)return <section className="signup-success" role="status"><h2>회원가입이 완료됐어요.</h2><p>가입한 이메일과 비밀번호로 로그인해 주세요.</p><a className="action" href="/login">이메일로 로그인하기</a></section>;
 return <form className="email-account-form" onSubmit={async event=>{
  event.preventDefault();if(busy)return;setError('');
  const form=new FormData(event.currentTarget),password=String(form.get('password')||'');
  if(signup&&password!==form.get('confirmation')){setError('비밀번호 확인이 일치하지 않습니다.');return;}
  setBusy(true);
  try{
   const response=await fetch('/api/platform/'+(signup?'register':'login'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:form.get('name'),email:form.get('email'),password,consent:form.get('consent')==='on'})});
   const data=await response.json();if(!response.ok)throw new Error(data.error);
   if(signup)setDone(true);else window.location.assign('/inbox');
  }catch(err){setError(err instanceof Error?err.message:'처리하지 못했습니다.');}finally{setBusy(false);}
 }}>
 {signup&&<label>이름<input name="name" autoComplete="name" required maxLength={40}/></label>}
 <label>이메일<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="name@example.com"/></label>
 <label>비밀번호<input name="password" type="password" autoComplete={signup?'new-password':'current-password'} required minLength={12} maxLength={128} placeholder="12자 이상 입력해 주세요"/></label>
 {signup&&<><label>비밀번호 확인<input name="confirmation" type="password" autoComplete="new-password" required minLength={12} maxLength={128}/></label><label className="consent"><input name="consent" type="checkbox" required/><span>계정 생성과 서비스 제공을 위한 개인정보 수집·이용에 동의합니다. <a href="/privacy">내용 확인</a></span></label></>}
 {error&&<p className="account-error" role="alert">{error}</p>}
 <button className="submit-action" disabled={busy}>{busy?'처리 중…':signup?'이메일로 회원가입':'이메일로 로그인'}</button>
 <p className="account-switch">{signup?'이미 계정이 있나요? ':'아직 계정이 없나요? '}<a href={signup?'/login':'/signup'}>{signup?'로그인':'회원가입'}</a></p>
 </form>;
}
