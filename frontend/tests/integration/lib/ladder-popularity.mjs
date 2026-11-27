import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const names=document=>[...document.querySelectorAll('[data-popularity=player] tbody tr')].map(row=>row.dataset.character);
export async function checkLadderPopularitySsr({read,state}) {
 state.characterNames=[['SO','Sol'],['KY','Ky']];
 try {
  for(const language of ['en','ko']) {
   const cookie=`ggst-language=${language}; ggst-design=ladder`;
   const result=await read('/popularity','Sol',cookie);const {document}=result;
   assert.equal(result.response.status,200);
   assert.equal(document.querySelector('[data-site-design]').dataset.siteDesign,'ladder');
   assert.equal(document.querySelectorAll('main table').length,2);
   const overview=[...document.querySelectorAll('[data-pick-overview] [data-pick-character]')];
   assert.deepEqual(overview.map(row=>row.dataset.pickCharacter),['Ky','May','Sol']);
   assert.deepEqual(overview.map(row=>row.querySelector('b').textContent),['50.00%','30.00%','20.00%']);
   assert.deepEqual(overview.map(row=>row.querySelector('span[aria-hidden] > span').style.width),['100%','60%','40%']);
   assert.ok(document.querySelector('header nav a[href="/popularity"]'));
   assert.equal(document.querySelector('main nav a[href="/stats"]'),null);
   assert.ok(document.querySelector('[data-pick-overview]').compareDocumentPosition(document.querySelector('#popularity-details')) & 4);

   assert.deepEqual(names(document),['Sol','Ky','May']);
   assert.equal(document.querySelector('[data-popularity=player] tbody tr td').textContent.replace(/\s+/g,''),'20.00%');
   assert.equal(document.querySelector('[data-popularity=character] tbody tr td').textContent.replace(/\s+/g,''),'20.00%');
   assert.ok(document.querySelector('main a[href="/top/SO"]'));
   assert.ok(document.querySelector('[data-popularity=player] tbody th').textContent.includes(language==='ko'?'솔':'Sol Badguy'));
   assert.equal(document.querySelector('tr[data-character=May] a'),null,'unknown character names remain readable without guessed links');
   assert.ok(document.querySelector('main time').dateTime);
   assert.ok(document.title.includes(language==='ko'?'캐릭터 인기':'Character popularity'));
   const sorted=await read('/popularity?playerSort=popularity-desc&characterSort=character-reversed','Sol',cookie);
   assert.deepEqual(names(sorted.document),['Ky','May','Sol']);
   assert.equal(sorted.document.querySelector('[data-popularity=player] thead th:nth-child(2)').getAttribute('aria-sort'),'descending');
   const links=[...sorted.document.querySelectorAll('[data-popularity=player] thead a')].map(link=>link.href);
   assert.ok(links.every(link=>link.includes('characterSort=character-reversed')));
  }
  const cookie='ggst-language=ko; ggst-design=ladder';
  state.mode='empty';
  try {
   const empty=await read('/popularity','Sol',cookie);
   assert.equal(empty.document.querySelectorAll('main tbody tr').length,0);
   assert.ok(empty.document.querySelector('main').textContent.includes('인기도 데이터가 없습니다'));
   assert.ok(!/NaN|Infinity/.test(empty.document.querySelector('main').textContent));
  } finally {state.mode='success';}
  state.mode='failure';
  try {assert.ok((await read('/popularity','Sol',cookie)).document.querySelector('main [role=alert]').textContent.includes('인기도 통계를'));}
  finally {state.mode='success';}
 } finally {delete state.characterNames;}
}
async function choose(call,baseURL,language='ko',design='ladder') {
 for(const [name,value] of [['ggst-language',language],['ggst-design',design]]) await call('Network.setCookie',{name,value,url:`${baseURL}/`,path:''});
}
async function click(call,evaluate,selector) {
 const point=await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
 await call('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});
 await call('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
}
export async function checkLadderPopularityBrowser({call,evaluate,waitFor,navigate,requests},{baseURL,state}) {
 state.characterNames=[['SO','Sol'],['KY','Ky']];
 try {
  await choose(call,baseURL);
  const start=requests.length;
  await navigate(`${baseURL}/popularity`);
  await evaluate('window.__popularityPage=1');
  await click(call,evaluate,'[data-popularity=player] thead th:nth-child(2) a');
  await waitFor('new URLSearchParams(location.search).get("playerSort")==="popularity-desc" && document.querySelector("[data-popularity=player] tbody tr").dataset.character==="Ky"');
  assert.equal(await evaluate('window.__popularityPage'),1,'sorting uses Next navigation');
  await click(call,evaluate,'[data-popularity=character] thead th:first-child a');
  await waitFor('new URLSearchParams(location.search).get("characterSort")==="character-reversed" && document.querySelector("[data-popularity=character] tbody tr").dataset.character==="May"');
  assert.equal(await evaluate('new URLSearchParams(location.search).get("playerSort")'),'popularity-desc');
  await evaluate('history.back()');
  await waitFor('!new URLSearchParams(location.search).has("characterSort") && new URLSearchParams(location.search).get("playerSort")==="popularity-desc"');
  assert.ok(!requests.slice(start).some(url=>/\/api\/(popularity|characters)/.test(url)),'popularity datasets load on the server');
  for(const language of ['en','ko']) {
   await choose(call,baseURL,language,'ladder');
   for(const width of [1440,390,320]) {
    await call('Emulation.setDeviceMetricsOverride',{width,height:1100,deviceScaleFactor:1,mobile:width<600});
    await navigate(`${baseURL}/popularity`);
    await evaluate('document.fonts.ready.then(()=>true);scrollTo(0,0)');
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,`${language} popularity overflow ${width}px`);
    if(language==='ko') await writeFile(`/tmp/puddle-public-ladder-popularity-${width}.png`,Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
   }
  }
  await click(call,evaluate,'[data-popularity=player] tbody a[href="/top/SO"]');
  await waitFor('location.pathname==="/top/SO" && !!document.querySelector("#ranking-title")');
  assert.equal(await evaluate('document.querySelector("[data-site-design]").dataset.siteDesign'),'ladder');
  await choose(call,baseURL,'ko','classic');
  await navigate(`${baseURL}/popularity`);
  assert.equal(await evaluate('document.querySelector("[data-site-design]").dataset.siteDesign'),'classic');
 } finally {delete state.characterNames;await choose(call,baseURL,'en','classic');}
}
export async function checkLadderPopularityWithoutScripts({call,evaluate,waitFor,navigate},{baseURL,state}) {
 state.characterNames=[['SO','Sol'],['KY','Ky']];
 try {
  await choose(call,baseURL);
  await navigate(`${baseURL}/popularity`);
  assert.equal(await evaluate('document.querySelectorAll("main tbody tr").length'),6);
  await click(call,evaluate,'[data-popularity=character] thead th:nth-child(2) a');
  await waitFor('new URLSearchParams(location.search).get("characterSort")==="popularity-desc" && document.querySelector("[data-popularity=character] tbody tr").dataset.character==="Ky"');
  await click(call,evaluate,'[data-popularity=player] tbody a[href="/top/SO"]');
  await waitFor('location.pathname==="/top/SO"');
 } finally {delete state.characterNames;await choose(call,baseURL,'en','classic');}
}
