import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {writeFile} from 'node:fs/promises';
export async function checkLadderAboutSsr({read,state}) {
 for(const language of ['en','ko']) {
  const {document,response}=await read('/about','Sol',`ggst-language=${language}; ggst-design=ladder`);
  assert.equal(response.status,200);
  assert.equal(document.querySelector('[data-site-design]').dataset.siteDesign,'ladder');
  assert.equal(document.querySelector('main h1').textContent,'ABOUT THIS SITE');
  assert.ok(document.querySelector('main a[href="/player/9007199254740993"]'));
  assert.ok(document.querySelector('#supporters-title').parentElement.textContent.includes('Supporter <One>'));
  assert.ok(document.querySelector('#supporters-title').parentElement.textContent.includes('Patron'));
  assert.ok(document.querySelector('header a[href="/about"][aria-current=page]'));
  assert.ok(document.querySelector('main').textContent.includes(language==='ko'?'1분에 한 번':'once per minute'));
  assert.ok(document.querySelector('main a[href="/distribution"]'));
 }
 state.mode='failure';
 try {const {document}=await read('/about','Sol','ggst-language=ko; ggst-design=ladder');assert.ok(document.querySelector('main [role=alert]'));assert.ok(document.querySelector('#rank-guide-title'));}
 finally {state.mode='success';}
 state.mode='empty';
 try {const {document}=await read('/about','Sol','ggst-language=ko; ggst-design=ladder');assert.ok(document.querySelector('main').textContent.includes('표시할 후원자가 없습니다'));}
 finally {state.mode='success';}
}
async function choose(call,baseURL,language='ko',design='ladder') {
 for(const [name,value] of [['ggst-language',language],['ggst-design',design]]) await call('Network.setCookie',{name,value,url:`${baseURL}/`,path:''});
}
export async function checkLadderAboutBrowser({call,evaluate,waitFor,navigate},{baseURL,state}) {
 for(const language of ['en','ko']) {
  await choose(call,baseURL,language,'ladder');
  for(const width of [1440,390,320]) {
   await call('Emulation.setDeviceMetricsOverride',{width,height:1100,deviceScaleFactor:1,mobile:width<600});
   await navigate(`${baseURL}/about`);await evaluate('document.fonts.ready.then(()=>true);scrollTo(0,0)');
   assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
   if(language==='ko') await writeFile(`/tmp/puddle-public-ladder-about-${width}.png`,Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
  }
 }
 state.historyResponses=[];
 try {
  await evaluate('window.__aboutMain=document.querySelector("main");true');
  const selector='main a[href="/player/9007199254740993"]';
  const point=await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await call('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});
  await call('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
  for(let i=0;i<100&&!state.historyResponses.length;i++) await delay(50);
  assert.ok(state.historyResponses.length);
  assert.equal(await evaluate('document.querySelector("main")===window.__aboutMain'),true,'About remains while core player history loads');
  state.historyResponses.splice(0).forEach(release=>release());
  await waitFor('location.pathname.endsWith("/9007199254740993/SO") && !!document.querySelector("[data-player-history]")');
 } finally {state.historyResponses.splice(0).forEach(release=>release());delete state.historyResponses;}
 await choose(call,baseURL,'en','classic');
}
export async function checkLadderAboutWithoutScripts({call,evaluate,navigate},{baseURL}) {
 await choose(call,baseURL);
 await navigate(`${baseURL}/about`);
 assert.ok(await evaluate('!!document.querySelector(\'main a[href="/player/9007199254740993"]\')'));
 assert.ok((await evaluate('document.querySelector("main").textContent')).includes('공식 레이팅'));
 await choose(call,baseURL,'en','classic');
}
