import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { writeFile } from "node:fs/promises";
import { checkMatchupStreaming } from "./matchup-streaming.mjs";
const id="9007199254740993";
const path=`/player/${id}/SO/2/0`;

export async function checkLadderPlayerSsr({read,state,baseURL}) {
  for(const language of ["en","ko"]) {
    const cookie=`ggst-language=${language}; ggst-design=ladder`;
    const result=await read(path,"Sol",cookie);
    const {document}=result;
    assert.equal(result.response.status,200);
    const sections=['#player-chart-title','#player-winrates-title','#player-history-title','#player-matchups-title'].map(selector=>document.querySelector(selector));
    for(let i=1;i<sections.length;i++) assert.ok(sections[i-1].compareDocumentPosition(sections[i]) & 4,'chart, win-rate bars, history, then matchup table');
    assert.ok([...document.querySelectorAll('meter')].some(meter=>meter.value===60),'personal win-rate bars render on the server');
    assert.equal(document.querySelector("[data-site-design]").dataset.siteDesign,"ladder");
    assert.equal(document.querySelector("main h1").textContent,"Player <SSR>");
    assert.ok(document.querySelector('[data-player-history]').textContent.includes("Opponent <1>"));
    assert.ok(document.querySelector("[data-player-history] summary").textContent.includes("Opponent tag"),"opponent tags are visible without expanding history");
    assert.ok(document.querySelector(`a[href="/player/${id}/KY"]`));
    assert.ok(document.querySelector('a[href="/player/76561198000000001/KY"]'));
    assert.ok(document.querySelector('[data-player-history] details table'));
    assert.ok(document.querySelector('nav a[aria-current="page"][href$="/SO"]'));
    assert.ok(!document.querySelector("main").textContent.includes("편차"));
    assert.ok(document.querySelector('img[src^="data:image/png;base64,"]'));
    assert.ok(document.querySelector('[data-player-history]').textContent.includes(language==="ko"?"경기 기록":"Match history"));
    assert.ok(document.querySelector('meta[name=description]').content.includes(language==="ko"?"플레이어":"player"));
    assert.equal((await read(`/player/${id}`,"Sol",cookie)).response.headers.get("location"),`/player/${id}/SO`);
    assert.equal((await read('/player/999/SO',"Sol",cookie)).response.status,404);
    const missing=await read(`/player/${id}/UNKNOWN`,"Sol",cookie);
    assert.ok(missing.document.querySelector('main').textContent.includes(language==="ko"?"이 캐릭터의 레이팅이 없습니다":"No ratings for this character"));
  }
  const cookie="ggst-language=ko; ggst-design=ladder";
  state.historyFailure=true;
  try { assert.ok((await read(path,"Sol",cookie)).document.querySelector('[data-player-history] [role=alert]')); }
  finally {state.historyFailure=false;}
  state.mode="empty";
  try { assert.ok((await read(path,"Sol",cookie)).document.querySelector('[data-player-history]').textContent.includes('경기 기록이 없습니다')); }
  finally {state.mode="success";}
  state.mode="failure";
  try { assert.ok((await read(path,"Sol",cookie)).document.querySelector('main [role=alert]').textContent.includes('플레이어 정보를')); }
  finally {state.mode="success";}
  await checkMatchupStreaming({baseURL,state},`${path}`,{cookie:"ggst-language=en; ggst-design=ladder",fallback:"Loading matchup statistics…",complete:"Global WR"});
}
async function choose(call,baseURL,language="ko",design="ladder") {
 for(const [name,value] of [["ggst-language",language],["ggst-design",design]]) await call("Network.setCookie",{name,value,url:`${baseURL}/`,path:""});
}
async function click(call,evaluate,selector) {
 const point=await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)}); el.scrollIntoView({block:'center'}); const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
 await call("Input.dispatchMouseEvent",{type:"mousePressed",...point,button:"left",clickCount:1});
 await call("Input.dispatchMouseEvent",{type:"mouseReleased",...point,button:"left",clickCount:1});
}
export async function checkLadderPlayerBrowser({call,evaluate,waitFor,navigate,requests},{baseURL,state}) {
 await choose(call,baseURL);
 await navigate(`${baseURL}/top_global/2/0`);
 await evaluate('window.__oldPlayerMain=document.querySelector("main"); true');
 state.historyResponses=[];
 state.slowProfile=true; state.profileResponses=[];
 try {
  await click(call,evaluate,`main a[href="/player/${id}/SO"]`);
  for(let i=0;i<100&&!state.historyResponses.length;i++) await delay(50);
  assert.ok(state.historyResponses.length,"core history request is held");
  await delay(150);
  assert.equal(await evaluate('document.querySelector("main")===window.__oldPlayerMain'),true,"keep rankings visible while core player history loads");
  state.historyResponses.splice(0).forEach(finish=>finish());
  await waitFor('!!document.querySelector("[data-player-history]")');
  assert.ok(state.pendingProfile>0,"optional profile requests must not block the player page");
 } finally {
  state.historyResponses.splice(0).forEach(finish=>finish()); delete state.historyResponses;
  state.profileResponses.splice(0).forEach(finish=>finish()); delete state.profileResponses;state.slowProfile=false;
 }
 for(const width of [1440,390,320]) {
  await call("Emulation.setDeviceMetricsOverride",{width,height:1100,deviceScaleFactor:1,mobile:width<600});
  state.slowProfile=true; state.profileResponses=[];
  try {
   await call("Page.navigate",{url:`${baseURL}${path}`});
   await waitFor('!!document.querySelector("main .player-rating-plot svg") && !!document.querySelector("[data-player-history]")');
   await evaluate('document.fonts.ready.then(()=>true)');
   const measure=()=>evaluate(`(()=>{const selectors=['#player-history-title','#player-chart-title','main aside','main h1','main aside [data-avatar-frame]'];return selectors.map(selector=>{const el=document.querySelector(selector);const r=el.getBoundingClientRect();return [r.x,r.y+scrollY,r.width,r.height]});})()`);
   const before=await measure();
   assert.ok(state.pendingProfile>0);
   state.profileResponses.splice(0).forEach(finish=>finish());
   await waitFor('document.querySelector("main").textContent.includes("Hello <comment>") && document.querySelector("main").textContent.includes("Old Alias") && !!document.querySelector("aside [data-avatar-frame] img")');
   assert.deepEqual(await measure(),before,`no profile shift at ${width}px`);
   assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,`player overflow ${width}px`);
   await evaluate('scrollTo(0,0)');
   await writeFile(`/tmp/puddle-public-ladder-player-${width}.png`,Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
  } finally {state.profileResponses.splice(0).forEach(finish=>finish()); delete state.profileResponses;state.slowProfile=false;}
 }
 await waitFor('!!document.querySelector("[data-win-rate-sort=lowest]")');
 await click(call,evaluate,'[data-win-rate-sort=lowest]');
 await waitFor('document.querySelector("meter").value===60 && document.querySelector("[data-win-rate-sort=lowest]").getAttribute("aria-pressed")==="true"');
 await click(call,evaluate,'[data-win-rate-sort=highest]');
 await waitFor('document.querySelector("meter").value===80');
 await click(call,evaluate,'[data-win-rate-sort=most]');
 await waitFor('document.querySelector("[data-win-rate-sort=most]").getAttribute("aria-pressed")==="true"');
 const start=requests.length;
 await navigate(`${baseURL}${path}`);
 await waitFor('!!document.querySelector("main .player-rating-plot svg") && document.querySelector("#player-matchups-title").parentElement.textContent.includes("전체 승률")');
 assert.ok(!requests.slice(start).some(url=>/\/api\/(player|ratings|matchups|alias|comment|avatar)\//.test(url)),"no initial browser dataset refetch");
 await click(call,evaluate,'[data-player-history] details summary');
 assert.equal(await evaluate('document.querySelector("[data-player-history] details").open'),true);
 await click(call,evaluate,`[data-player-history] nav a[href$="/2/2"]`);
 await waitFor('location.pathname.endsWith("/SO/2/2") && document.querySelector("[data-player-history]").textContent.includes("Opponent <2>")');
 await click(call,evaluate,`nav a[href="/player/${id}/KY"]`);
 await waitFor('location.pathname.endsWith("/KY") && !!document.querySelector("main .player-rating-plot svg")');
 await evaluate('history.back()');
 await waitFor('location.pathname.endsWith("/SO/2/2") && !!document.querySelector("main .player-rating-plot svg")');
 await navigate(`${baseURL}${path}`);
 await waitFor('!!document.querySelector("main .player-rating-plot svg")');
 await evaluate('Array.from(document.querySelectorAll("main button")).find(b=>b.textContent.trim()==="뱅퀴셔 이전 기록 보기").click()');
 await waitFor('Array.from(document.querySelectorAll("main button")).some(b=>b.textContent.trim()==="뱅퀴셔 기록 보기") && !!document.querySelector("main .player-rating-plot svg")');
 assert.ok(state.requests.includes(`/api/ratings/${id}/SO/200?pre_vanquisher=true`));
 await waitFor('Array.from(document.querySelectorAll("main button")).some(b=>b.textContent.trim()==="티어 목록")');
 await evaluate('Array.from(document.querySelectorAll("main button")).find(b=>b.textContent.trim()==="티어 목록").click()');
 await waitFor('document.querySelector("main").textContent.includes("개인 승률 기준")');
 const oldSync=state.playerSyncs;
 await evaluate('document.querySelector(\'button[aria-label="게임에서 레이팅 동기화"]\').click()');
 await waitFor(`document.querySelector("main h1").parentElement.textContent.includes(${JSON.stringify(String(1800+(oldSync+1)*10))})`);
 await choose(call,baseURL,"en","ladder");
 await navigate(`${baseURL}${path}`);
 assert.equal(await evaluate('document.querySelector("[data-site-design]").dataset.siteDesign'),"ladder");
 assert.equal(await evaluate('document.querySelector("#player-history-title").textContent'),"Match history");
 await choose(call,baseURL,"ko","classic");
 await navigate(`${baseURL}${path}`);
 assert.equal(await evaluate('document.querySelector("[data-site-design]").dataset.siteDesign'),"classic");
 await choose(call,baseURL,"en","classic");
}
export async function checkLadderPlayerWithoutScripts({call,evaluate,waitFor,navigate},{baseURL}) {
 await choose(call,baseURL);
 await navigate(`${baseURL}${path}`);
 assert.ok((await evaluate('document.querySelector("[data-player-history]").textContent')).includes('Opponent <1>'));
 await click(call,evaluate,'[data-player-history] summary');
 assert.equal(await evaluate('document.querySelector("[data-player-history] details").open'),true);
 await click(call,evaluate,'[data-player-history] nav a[href$="/2/2"]');
 await waitFor('location.pathname.endsWith("/SO/2/2")');
 await click(call,evaluate,`nav a[href="/player/${id}/KY"]`);
 await waitFor('location.pathname.endsWith("/KY")');
 assert.ok(await evaluate('!!document.querySelector("main noscript")'));
 await choose(call,baseURL,"en","classic");
}
