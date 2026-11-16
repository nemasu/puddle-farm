import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
export async function checkLadderMatchupsSsr({read,state,baseURL}) {
 state.globalMatchupData={last_update:'2026-11-13 10:00:00',data_all:[
  {char_short:'SO',char_name:'Sol',matchups:[{char_short:'SO',char_name:'Sol',wins:1,total_games:2},{char_short:'KY',char_name:'Ky',wins:8,total_games:10}]},
  {char_short:'KY',char_name:'Ky',matchups:[{char_short:'FUT',char_name:'Future <Fighter>',wins:0,total_games:0},{char_short:'SO',char_name:'Sol',wins:1,total_games:10}]},
 ],data_vanq:[{char_short:'SO',char_name:'Sol',matchups:[{char_short:'KY',char_name:'Ky',wins:1,total_games:4}]}]};
 try {
  for(const language of ['en','ko']) {
   const cookie=`ggst-language=${language}; ggst-design=ladder`;
   const {document,response}=await read('/matchup','Sol',cookie);
   assert.equal(response.status,200);
   assert.equal(document.querySelector('[data-site-design]').dataset.siteDesign,'ladder');
   assert.ok(document.title.includes(language==='ko'?'캐릭터 상성':'Character matchups'));
   const cell=document.querySelector('#matchup-all-matrix tr[data-character=SO] td[data-opponent=KY]');
   assert.ok(cell.textContent.startsWith('80.00%'),'row win rate is against the specified column opponent');
   assert.ok(cell.title.includes('8'));
   assert.ok(document.querySelector('#matchup-all-matrix tr[data-character=KY] td[data-opponent=SO]').textContent.startsWith('10.00%'),'reordered row values align by character code');
   assert.ok(document.querySelector('#matchup-all-matrix tr[data-character=KY] td[data-opponent=KY]').textContent.startsWith('—'));
   assert.ok(document.querySelector('#matchup-all-matrix tr[data-character=KY] td[data-opponent=FUT]').textContent.startsWith('—'));
   assert.ok(document.querySelectorAll('[data-matchups=all] table')[1].querySelector('tbody tr:first-child td').textContent.includes('75.00%'),'weighted rate is 9/12, not a mean of percentages');
   assert.ok(document.querySelector('[data-matchups=vanquisher] tbody td').textContent.startsWith('25.00%'));
   assert.equal(document.querySelector('a[download]').getAttribute('href'),'/matchup/export');
   assert.ok(document.querySelector('main a[href="/top/SO"]'));
   assert.ok(document.querySelector('main time').dateTime);
   const sorted=await read('/matchup?allSort=SO-asc&vanquisherSort=character-desc','Sol',cookie);
   assert.equal(sorted.document.querySelector('#matchup-all-matrix tbody tr').dataset.character,'KY');
   assert.equal(sorted.document.querySelector('#matchup-all-matrix th[aria-sort=ascending] a').textContent.startsWith('SO'),true);
   const csv=await fetch(`${baseURL}/matchup/export`);assert.equal(csv.status,200);
   assert.ok((await csv.text()).includes('Vanquisher I Ignis and Above'));
  }
 } finally {delete state.globalMatchupData;}
 const cookie='ggst-language=ko; ggst-design=ladder';
 state.mode='empty';
 try {const empty=await read('/matchup','Sol',cookie);assert.equal(empty.document.querySelectorAll('main table').length,0);assert.ok(empty.document.querySelector('main').textContent.includes('상성 데이터가 없습니다'));}
 finally {state.mode='success';}
 state.mode='failure';
 try {assert.ok((await read('/matchup','Sol',cookie)).document.querySelector('main [role=alert]').textContent.includes('상성 통계를'));}
 finally {state.mode='success';}
}
async function choose(call,baseURL,language='ko',design='ladder') {
 for(const [name,value] of [['ggst-language',language],['ggst-design',design]]) await call('Network.setCookie',{name,value,url:`${baseURL}/`,path:''});
}
async function click(call,evaluate,selector) {
 const point=await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
 await call('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});
 await call('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
}
export async function checkLadderMatchupsBrowser({call,evaluate,waitFor,navigate,requests},{baseURL,state}) {
 await choose(call,baseURL);
 const start=requests.length;
 await navigate(`${baseURL}/matchup`);
 await evaluate('window.__matchupPage=1');
 await click(call,evaluate,'#matchup-all-matrix thead a[href*="allSort=SO-asc"]');
 await waitFor('new URLSearchParams(location.search).get("allSort")==="SO-asc" && document.querySelector("#matchup-all-matrix tbody tr").dataset.character==="KY"');
 assert.equal(await evaluate('window.__matchupPage'),1);
 await click(call,evaluate,'#matchup-vanquisher-matrix thead a[href*="vanquisherSort=KY-asc"]');
 await waitFor('new URLSearchParams(location.search).get("vanquisherSort")==="KY-asc"');
 assert.equal(await evaluate('new URLSearchParams(location.search).get("allSort")'),'SO-asc');
 await evaluate('history.back()');
 await waitFor('!new URLSearchParams(location.search).has("vanquisherSort") && new URLSearchParams(location.search).get("allSort")==="SO-asc"');
 assert.ok(!requests.slice(start).some(url=>new URL(url).pathname==='/api/matchups'),'matrix datasets load on the server');
 for(const language of ['en','ko']) {
  await choose(call,baseURL,language,'ladder');
  for(const width of [1440,390,320]) {
   await call('Emulation.setDeviceMetricsOverride',{width,height:1100,deviceScaleFactor:1,mobile:width<600});
   await navigate(`${baseURL}/matchup`);
   await evaluate('document.fonts.ready.then(()=>true);scrollTo(0,0)');
   assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,`${language} matchup overflow ${width}px`);
   assert.equal(await evaluate('getComputedStyle(document.querySelector("#matchup-all-matrix thead th")).position'),'sticky');
   if(language==='ko') await writeFile(`/tmp/puddle-public-ladder-matchups-${width}.png`,Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
  }
 }
 await evaluate('document.querySelector("#matchup-all-matrix").parentElement.scrollIntoView({block:"center"});document.querySelector("#matchup-all-matrix").parentElement.focus()');
 await call('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
 await call('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
 await waitFor('document.querySelector("#matchup-all-matrix").parentElement.scrollLeft>0');
 const wideRows=[{char_short:'SO',char_name:'Sol',matchups:Array.from({length:34},(_,index)=>({char_short:`X${index}`,char_name:`Opponent ${index}`,wins:index,total_games:40}))}];
 state.globalMatchupData={last_update:'2026-11-13 10:00:00',data_all:wideRows,data_vanq:wideRows};
 try {
  for(const width of [1440,390,320]) {
   await call('Emulation.setDeviceMetricsOverride',{width,height:1100,deviceScaleFactor:1,mobile:width<600});
   await navigate(`${baseURL}/matchup`);
   assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,`wide roster must not overflow the page at ${width}px`);
   assert.ok(await evaluate('document.querySelector("#matchup-all-matrix").parentElement.scrollWidth>document.querySelector("#matchup-all-matrix").parentElement.clientWidth'),'opponents scroll inside the panel');
  }
 } finally {delete state.globalMatchupData;}
 await choose(call,baseURL,'ko','classic');
 await navigate(`${baseURL}/matchup`);
 assert.equal(await evaluate('document.querySelector("[data-site-design]").dataset.siteDesign'),'classic');
 await choose(call,baseURL,'en','classic');
}
export async function checkLadderMatchupsWithoutScripts({call,evaluate,waitFor,navigate},{baseURL}) {
 await choose(call,baseURL);
 await navigate(`${baseURL}/matchup`);
 assert.ok((await evaluate('document.querySelector("#matchup-all-matrix").textContent')).includes('60.00%'));
 await click(call,evaluate,'#matchup-all-matrix thead a[href*="allSort=SO-asc"]');
 await waitFor('new URLSearchParams(location.search).get("allSort")==="SO-asc" && document.querySelector("#matchup-all-matrix tbody tr").dataset.character==="KY"');
 assert.ok(await evaluate('!!document.querySelector("a[download]")'));
 await choose(call,baseURL,'en','classic');
}
