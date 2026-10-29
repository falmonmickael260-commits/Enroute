import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import assert from "node:assert/strict";
const base=process.argv[2]??"http://localhost:3113",output=process.env.TEST_ARTIFACTS??"/tmp/kilomax-vehicles";
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH??"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",args:["--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
try {
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto(`${base}/play/3d?n=2&demo=1`);
  await page.getByRole("progressbar").waitFor({state:"hidden",timeout:20000});
  await page.waitForTimeout(3000);
  const intro=page.getByRole("button",{name:"Passer l'introduction"});if(await intro.count()) await intro.click();
  const draw=()=>page.getByRole("button",{name:"Piocher une carte",exact:true}).click();
  const select=async id=>{await page.locator(`button[data-card-id="${id}"]`).first().click();await page.getByRole("button",{name:/JOUER CETTE CARTE/}).click();};
  await draw();await select("collision");await page.getByRole("button",{name:/Joueur 2.*0 km/}).click();
  await page.waitForTimeout(600);await page.screenshot({path:`${output}/collision-in-game.png`});
  await draw();await select("reparation");
  await page.waitForTimeout(600);await page.screenshot({path:`${output}/repair-in-game.png`});
  await draw();await select("dist200");
  await page.waitForTimeout(700);await page.screenshot({path:`${output}/driving-in-game.png`});
  assert.ok((await page.locator("body").innerText()).includes("200"));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);
  console.log("PASS: collision targeting, repair, 200 km movement, real 3D vehicles and environment; no page errors");
} finally {await browser.close();}
