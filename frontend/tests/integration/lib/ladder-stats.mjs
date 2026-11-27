import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const cookie="ggst-language=ko; ggst-design=ladder";
export async function checkLadderStatsSsr({read,state,baseURL}) {
 for(const language of ['en','ko']) {
  const result=await read('/stats','Sol',`ggst-language=${language}; ggst-design=ladder`);
  const {document}=result;
  assert.equal(result.response.status,200);
  assert.equal(document.querySelector('[data-site-design]').dataset.siteDesign,'ladder');
  assert.ok(document.title.includes(language==='ko'?'랭크 통계':'Ranked statistics'));
  assert.equal(document.querySelectorAll('main tbody tr').length,5);
  assert.equal(document.querySelectorAll('main tbody tr:first-child td')[0].textContent,'1,234');
  assert.equal(document.querySelectorAll('main tbody tr:first-child td')[1].textContent,'5,678');
  assert.equal(document.querySelector('header a[href="/stats"][aria-current="page"]').textContent,language==='ko'?'활동':'Activity');
  assert.ok(document.querySelector('main time').dateTime);
  assert.equal(document.querySelector('table[aria-label="Hourly player data"]'),null);
  assert.ok(document.querySelector('main').textContent.includes(language==='ko'?'JavaScript가 필요':'requires JavaScript'));
 }
 assert.equal((await read('/stats','Sol','ggst-language=ko; ggst-design=classic')).document.querySelector('[data-site-design]').dataset.siteDesign,'classic');
 state.mode='empty';
 try {
  const empty=await read('/stats','Sol',cookie);
  assert.equal(empty.document.querySelector('tbody tr td').textContent,'0');
  assert.ok(empty.document.body.textContent.includes('이 기간의 시간별 플레이어 기록이 없습니다'));
 } finally {state.mode='success';}
 state.mode='failure';
 try {assert.ok((await read('/stats','Sol',cookie)).document.querySelector('main [role=alert]').textContent.includes('랭크 통계를'));}
 finally {state.mode='success';}
 state.hourlyResponses=[];
 try {
  const response=await fetch(`${baseURL}/stats`,{headers:{Cookie:cookie},signal:AbortSignal.timeout(5000)});
  const reader=response.body.getReader();const decoder=new TextDecoder();let html='';
  while(!html.includes('1,234')||!html.includes('플레이어 기록을 불러오는 중')) {
   const part=await reader.read();assert.equal(part.done,false,'totals arrive while chart data is held');html+=decoder.decode(part.value,{stream:true});
  }
  assert.equal(state.hourlyResponses.length,1);
  assert.ok(!html.includes('aria-pressed="false"'),'chart is still pending');
  state.hourlyResponses.splice(0).forEach(release=>release());
  while(true) {const part=await reader.read();if(part.done)break;html+=decoder.decode(part.value,{stream:true});}
  assert.ok(html.includes('aria-pressed="false"'),'chart controls stream after the response is released');
 } finally {state.hourlyResponses.splice(0).forEach(release=>release());delete state.hourlyResponses;}
}
async function choose(call,baseURL,language='ko',design='ladder') {
 for(const [name,value] of [['ggst-language',language],['ggst-design',design]]) await call('Network.setCookie',{name,value,url:`${baseURL}/`,path:''});
}
export async function checkLadderStatsBrowser({call,evaluate,waitFor,navigate,requests},{baseURL,state}) {
 await choose(call,baseURL);
 const start=requests.length;
 await navigate(`${baseURL}/stats`);
 await waitFor('!!document.querySelector("main .hourly-players-plot svg")');
 assert.ok(!requests.slice(start).some(url=>url.includes('/api/stats')),'initial data is server seeded');
 for(const [label,range] of [['24시간','24h'],['7일','7d'],['1년','1y'],['전체','all'],['30일','30d']]) {
  await evaluate(`Array.from(document.querySelectorAll('main button')).find(button=>button.textContent.trim()===${JSON.stringify(label)}).click()`);
  await waitFor(`!!document.querySelector('main .hourly-players-plot svg') && Array.from(document.querySelectorAll('main button')).some(button=>button.textContent.trim()===${JSON.stringify(label)} && button.getAttribute('aria-pressed')==='true')`);
  assert.ok(state.requests.includes(`/api/stats/hourly-players?range=${range}`));
 }
 for(const language of ['en','ko']) {
  await choose(call,baseURL,language,'ladder');
  for(const width of [1440,390,320]) {
   await call('Emulation.setDeviceMetricsOverride',{width,height:1100,deviceScaleFactor:1,mobile:width<600});
   await navigate(`${baseURL}/stats`);
   await waitFor('!!document.querySelector("main .hourly-players-plot svg")');
   await evaluate('document.fonts.ready.then(()=>true); scrollTo(0,0)');
   assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,`${language} stats overflow ${width}px`);
   if(language==='ko') await writeFile(`/tmp/puddle-public-ladder-stats-${width}.png`,Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
  }
 }
 state.mode='empty';
 try {
  await evaluate('Array.from(document.querySelectorAll("main button")).find(b=>b.textContent.trim()==="24시간").click()');
  await waitFor('document.querySelector("main").textContent.includes("이 기간의 시간별 플레이어 기록이 없습니다")');
 } finally {state.mode='success';}
 state.mode='failure';
 try {
  await evaluate('Array.from(document.querySelectorAll("main button")).find(b=>b.textContent.trim()==="7일").click()');
  await waitFor('document.querySelector("main").textContent.includes("시간별 플레이어 기록을 불러오지 못했습니다")');
 } finally {state.mode='success';}
 await choose(call,baseURL,'ko','classic');
 await navigate(`${baseURL}/stats`);
 assert.equal(await evaluate('document.querySelector("[data-site-design]").dataset.siteDesign'),'classic');
 await choose(call,baseURL,'en','classic');
}
export async function checkLadderStatsWithoutScripts({call,evaluate,navigate},{baseURL}) {
 await choose(call,baseURL);
 await navigate(`${baseURL}/stats`);
 assert.equal(await evaluate('document.querySelector("main tbody tr td").textContent'),'1,234');
 assert.equal(await evaluate('document.querySelectorAll("main tbody tr").length'),5);
 assert.ok((await evaluate('document.querySelector("main").textContent')).includes('JavaScript가 필요'));
 await choose(call,baseURL,'en','classic');
}
