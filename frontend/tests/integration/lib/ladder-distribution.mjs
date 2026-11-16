import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
export async function checkLadderDistributionSsr({read,state}) {
 for(const language of ['en','ko']) {
  const {document}=await read('/distribution','Sol',`ggst-language=${language}; ggst-design=ladder`);
  assert.equal(document.querySelector('[data-site-design]').dataset.siteDesign,'ladder');
  assert.equal(document.querySelectorAll('main table')[0].querySelectorAll('tbody tr').length,3);
  assert.ok(document.querySelectorAll('main table')[0].textContent.includes('30.00%'));
  assert.ok(document.querySelectorAll('main table')[1].textContent.includes('Imperius'));
  assert.ok(document.querySelector('main').textContent.includes(language==='ko'?'배치 중인 플레이어':'Players in placement'));
  assert.ok(document.querySelector('main time').dateTime);
 }
 state.mode='empty';
 try {const {document}=await read('/distribution','Sol','ggst-language=ko; ggst-design=ladder');assert.ok(document.querySelector('main').textContent.includes('랭크 분포 데이터가 없습니다'));assert.ok(!/NaN|Infinity/.test(document.querySelector('main').textContent));}
 finally {state.mode='success';}
 state.mode='failure';
 try {const {document}=await read('/distribution','Sol','ggst-language=ko; ggst-design=ladder');assert.ok(document.querySelector('main [role=alert]'));assert.ok(document.querySelector('main table').textContent.includes('Imperius'));}
 finally {state.mode='success';}
}
export async function checkLadderDistributionBrowser({call,evaluate,waitFor,navigate},{baseURL}) {
 for(const language of ['en','ko']) {
  for(const [name,value] of [['ggst-language',language],['ggst-design','ladder']]) await call('Network.setCookie',{name,value,url:`${baseURL}/`,path:''});
  for(const width of [1440,390,320]) {
   await call('Emulation.setDeviceMetricsOverride',{width,height:1100,deviceScaleFactor:1,mobile:width<600});
   await navigate(`${baseURL}/distribution`);await waitFor('!!document.querySelector("main canvas")');
   await evaluate('document.fonts.ready.then(()=>true);scrollTo(0,0)');
   assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
   if(language==='ko') await writeFile(`/tmp/puddle-public-ladder-distribution-${width}.png`,Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
  }
  await evaluate('document.querySelector("main button[aria-pressed]").click()');
  await waitFor('document.querySelector("main button[aria-pressed]").getAttribute("aria-pressed")==="true"');
  assert.ok((await evaluate('document.querySelector("main button[aria-pressed]").textContent')).includes(language==='ko'?'세부 랭크':'Show Subdivisions'));
 }
 for(const [name,value] of [['ggst-language','en'],['ggst-design','ladder']]) await call('Network.setCookie',{name,value,url:`${baseURL}/`,path:''});
}

export async function checkLadderDistributionWithoutScripts({call,evaluate,navigate},{baseURL}) {
 await call('Network.setCookie',{name:'ggst-design',value:'ladder',url:`${baseURL}/`,path:''});
 await call('Network.setCookie',{name:'ggst-language',value:'ko',url:`${baseURL}/`,path:''});
 await navigate(`${baseURL}/distribution`);
 assert.equal(await evaluate('document.querySelectorAll("main table")[0].querySelectorAll("tbody tr").length'),3);
 assert.ok((await evaluate('document.querySelector("main").textContent')).includes('JavaScript가 필요'));
 await call('Network.setCookie',{name:'ggst-language',value:'en',url:`${baseURL}/`,path:''});
}
