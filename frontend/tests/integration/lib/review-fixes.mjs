import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';

export async function checkReviewFixes({read,state,baseURL}) {
 const titles={en:'Page not found',ko:'페이지를 찾을 수 없습니다',ja:'ページが見つかりません'};
 for(const design of ['classic','ladder'])for(const language of ['en','ko','ja']) {
  const cookie=`ggst-language=${language}; ggst-design=${design}`;
  const unknown=await read('/does/not/exist','Sol',cookie);
  assert.equal(unknown.response.status,200);
  assert.equal(unknown.document.querySelector('[data-site-design]').dataset.siteDesign,design);
  assert.ok(unknown.document.querySelector('main table').textContent.includes('SSR <Player>'));
  for(const path of ['/player/bad-id/SO','/missing.js']) {
   const {document,response}=await read(path,'Sol',cookie);
   assert.equal(response.status,404,`${design}/${language} ${path}`);
   // Next 16.4.6 serializes dynamic notFound UI in Flight rather than SSR HTML.
   // Verify its visible layout in Chrome; retain status/noindex checks here.
   const html=document.documentElement.outerHTML;
   assert.ok(html.includes(titles[language]));
   assert.ok(document.querySelector('meta[name=robots]').content.includes('noindex'));
  }
 }
 assert.equal((await read('/does/not/exist','Sol','ggst-language=ko; ggst-design=ladder')).document.querySelector('[data-site-design]').dataset.siteDesign,'ladder');
 // Native actions must return a local, base-path-prefixed Location, without JS.
 const {document}=await read('/top_global','Sol','ggst-language=ko; ggst-design=ladder');
 const form=document.querySelector('#ranking-character').form;
 const body=new FormData();
 for(const input of form.querySelectorAll('input[name^="$ACTION_"]'))body.append(input.name,input.value);
 body.set('character','SO');
 const native=await fetch(`${baseURL}/top_global`,{method:'POST',body,redirect:'manual',headers:{Origin:baseURL}});
 assert.equal(native.status,303);
 assert.equal(native.headers.get('location'),'/top/SO');
 // A slow Japanese character map must not postpone the popularity read.
 state.characterResponses=[];
 const start=state.requests.length;
 let pending;
 try {
  pending=read('/popularity','Sol','ggst-language=ja; ggst-design=classic');
  for(let i=0;i<150&&!state.characterResponses.length;i++)await delay(20);
  assert.ok(state.characterResponses.length,'character request is held');
  for(let i=0;i<150&&!state.requests.slice(start).includes('/api/popularity');i++)await delay(20);
  assert.ok(state.requests.slice(start).includes('/api/popularity'),'popularity starts before the character response');
 } finally {
  for(const release of state.characterResponses.splice(0))release();
  delete state.characterResponses;
  if(pending)await pending;
 }
}

export async function checkReviewFixesBrowser({call,evaluate,navigate,waitFor},{baseURL}) {
 const titles={en:'Page not found',ko:'페이지를 찾을 수 없습니다',ja:'ページが見つかりません'};
 for(const design of ['classic','ladder'])for(const language of ['en','ko','ja']) {
  for(const [name,value] of [['ggst-language',language],['ggst-design',design]])await call('Network.setCookie',{name,value,url:`${baseURL}/`,path:''});
  for(const path of ['/player/bad-id/SO','/missing.js']) {
   await navigate(`${baseURL}${path}`);
   await waitFor(`document.querySelector('main h1')?.textContent.includes(${JSON.stringify(titles[language])})`);
   assert.equal(await evaluate('document.querySelectorAll("[data-site-design]").length'),1);
   assert.equal(await evaluate('document.querySelector("[data-site-design]").dataset.siteDesign'),design);
   assert.ok(await evaluate(`!!document.querySelector('nav') && !!document.querySelector('footer') && !!document.querySelector('main a[href="/"]')`));
   assert.equal(await evaluate('document.documentElement.lang'),language);
  }
 }
 for(const [name,value] of [['ggst-language','en'],['ggst-design','classic']])await call('Network.setCookie',{name,value,url:`${baseURL}/`,path:''});
 await navigate(`${baseURL}/`);
}
