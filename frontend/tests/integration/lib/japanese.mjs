import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const routes = [
 ['/', 'レジェンド', 'SSR <Player>'],
 ['/top_global/2/0', '総合ランキング', 'Ranked <Player>'],
 ['/top/SO/2/0', 'キャラクターランキング', 'ソル'],
 ['/search?q=test', 'プレイヤー検索', 'Search <Player>'],
 ['/player/9007199254740993/SO/2/0', 'Player <SSR>', '対戦履歴'],
 ['/stats', 'ランク', '過去1か月'],
 ['/popularity', '使用率', 'キャラクター'],
 ['/matchup', '相性', 'キャラクター'],
 ['/distribution', '分布', 'プレースメント'],
 ['/about', 'このサイトについて', '公式レーティング'],
 ['/settings', '設定', '言語とデザイン'],
 ['/terms', '利用規約', 'Privacy'],
];
export async function checkJapaneseSsr({read,state}) {
 for(const design of ['classic','ladder']) {
  for(const [path,title,content] of routes) {
   const {document,response}=await read(path,'Sol',`ggst-language=ja; ggst-design=${design}`);
   assert.equal(response.status,200,`${design} ${path}`);
   assert.equal(document.documentElement.lang,'ja');
   assert.equal(document.querySelector('[data-site-design]').dataset.siteDesign,design);
   assert.ok(document.title.includes(title),`${design} ${path}: ${document.title}`);
   assert.ok(document.querySelector('main').textContent.includes(content),`${design} ${path}: ${content}`);
   assert.ok(document.querySelector('footer').textContent.includes('利用規約'));
   if(path==='/top/SO/2/0') assert.ok(document.querySelector('main a[href="/top/SO"]')?.textContent.includes('ソル'));
   if(path==='/settings') assert.deepEqual([...document.querySelectorAll('#site-language option')].map(x=>x.value),['en','ko','ja']);
  }
 }
 const classic = await read('/','Sol','ggst-language=ja; ggst-design=classic');
 assert.equal(classic.document.querySelector('[data-site-design]').dataset.siteDesign,'classic');
 for(const mode of ['empty','failure']) {
  state.mode=mode;
  try {
   for(const design of ['classic','ladder']) {
    const {document}=await read('/search?q=missing','Sol',`ggst-language=ja; ggst-design=${design}`);
    assert.ok(document.querySelector('main').textContent.includes(mode==='empty'?'検索結果がありません':'読み込めません'));
   }
  } finally {state.mode='success';}
 }
 // Each design wraps the same repository-specific policy text, without removing clauses.
 for(const language of ['en','ko','ja']) {
  const classic=(await read('/terms','Sol',`ggst-language=${language}; ggst-design=classic`)).document;
  const ladder=(await read('/terms','Sol',`ggst-language=${language}; ggst-design=ladder`)).document;
  const copy=doc=>[...doc.querySelectorAll('main p, main li')].map(x=>x.textContent.trim());
  assert.deepEqual(copy(ladder).slice(1),copy(classic));
 }
}
async function choose(call,baseURL,design,language='ja') {
 for(const [name,value] of [['ggst-language',language],['ggst-design',design]]) await call('Network.setCookie',{name,value,url:`${baseURL}/`,path:''});
}
export async function checkJapaneseBrowser({call,evaluate,navigate,waitFor},{baseURL}) {
 for(const design of ['classic','ladder']) {
  await choose(call,baseURL,design);
  for(const [path,,content] of routes) {
   await navigate(`${baseURL}${path}`);
   await waitFor(`document.querySelector('main')?.textContent.includes(${JSON.stringify(content)})`);
   assert.equal(await evaluate('document.documentElement.lang'),'ja');
   for(const width of [1440,390,320]) {
    await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<600});
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,`${design} ${path} ${width}px`);
    if(design==='ladder' && ['/settings','/terms'].includes(path) && width!==320) {
     await evaluate('document.fonts.ready.then(()=>true);scrollTo(0,0)');
     await writeFile(`/tmp/puddle-public-ja-${path.slice(1)}-${width}.png`,Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
    }
   }
  }
 }
 await choose(call,baseURL,'classic','en');
}
export async function checkJapaneseWithoutScripts({call,evaluate,navigate},{baseURL}) {
 for(const design of ['classic','ladder']) {
  await choose(call,baseURL,design);
  for(const path of ['/settings','/terms','/top/SO/2/0','/matchup']) {
   await navigate(`${baseURL}${path}`);
   assert.equal(await evaluate('document.documentElement.lang'),'ja');
   assert.ok((await evaluate('document.querySelector("footer").textContent')).includes("利用規約"));
   if(path!=="/terms") assert.ok((await evaluate('document.querySelector("main").textContent')).match(/[ぁ-んァ-ヶ一-龠]/));
   if(path==='/settings') assert.equal(await evaluate('document.querySelector("#site-language").value'),'ja');
   if(path==='/matchup') assert.ok(await evaluate('document.querySelector("main table").textContent.includes("ソル")'));
  }
 }
 await choose(call,baseURL,'classic','en');
}
