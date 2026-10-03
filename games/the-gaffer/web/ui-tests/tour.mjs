// Records a guided tour of The Gaffer with Arabic captions (every screen, what each tap opens), as a video.
//   npm run build && OUT=<dir> node ui-tests/tour.mjs          phone (412×892)
//   npm run build && DESK=1 OUT=<dir> node ui-tests/tour.mjs   laptop (1440×900)
import { createServer } from 'node:http'; import { readFileSync, renameSync, readdirSync } from 'node:fs'; import { execSync } from 'node:child_process';
let pw; try { pw = await import('playwright'); } catch { pw = await import(`${execSync('npm root -g').toString().trim()}/playwright/index.mjs`); }
const OUT = process.env.OUT;
const html = readFileSync(new URL('../dist/index.html', import.meta.url));
const server = createServer((_, res) => { res.writeHead(200, { 'content-type': 'text/html' }); res.end(html); }).listen(0);
const b = await pw.chromium.launch();
const DESK = process.env.DESK === '1';
const VP = DESK ? { width: 1440, height: 900 } : { width: 412, height: 892 };
const NAVW = DESK ? 'الشريط اللي على الجنب' : 'الشريط اللي تحت';
const ctx = await b.newContext({ viewport: VP, recordVideo: { dir: OUT, size: VP } });
const p = await ctx.newPage();
const W = (ms) => p.waitForTimeout(ms);
let step = 0;
const log = [];
// The caption: a banner fixed on top of everything (outside the React root, re-made if a reload drops it).
async function say(title, text, ms = 3200) {
  step++;
  log.push(`${step}. ${title} — ${text}`);
  await p.evaluate(([n, t, x]) => {
    let el = document.getElementById('__cap');
    if (!el) {
      el = document.createElement('div'); el.id = '__cap';
      el.style.cssText = (innerWidth > 900 ? 'position:fixed;left:50%;transform:translateX(-50%);width:760px;bottom:28px;' : 'position:fixed;left:8px;right:8px;bottom:84px;') + 'z-index:2147483647;background:rgba(5,20,18,.93);color:#fff;border:2px solid #3ddc97;border-radius:14px;padding:10px 14px;font:600 ' + (innerWidth > 900 ? 19 : 15) + 'px/1.5 system-ui,"Noto Sans Arabic",sans-serif;direction:rtl;text-align:right;box-shadow:0 8px 30px rgba(0,0,0,.6);pointer-events:none;transition:opacity .25s';
      document.documentElement.appendChild(el);
    }
    el.innerHTML = `<div style="color:#3ddc97;font-size:13px;margin-bottom:2px">${n} · ${t}</div><div>${x}</div>`;
  }, [step, title, text]);
  await W(ms);
}
// A ring where the tap lands, then the tap.
async function tap(find, { hold = 900, after = 1200 } = {}) {
  const box = await p.evaluate((src) => {
    const el = (new Function(`return (${src})`))()();
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    const ring = document.createElement('div');
    ring.className = '__ring';
    ring.style.cssText = `position:fixed;left:${r.left - 6}px;top:${r.top - 6}px;width:${r.width + 12}px;height:${r.height + 12}px;border:3px solid #ffd54a;border-radius:12px;z-index:2147483646;pointer-events:none;box-shadow:0 0 0 6px rgba(255,213,74,.25)`;
    document.documentElement.appendChild(ring);
    window.__tapEl = el;
    return { w: r.width };
  }, find.toString());
  if (!box) { console.log(`  (not found at step ${step})`, find.toString().slice(0, 140)); return false; }
  await W(hold);
  await p.evaluate(() => { document.querySelectorAll('.__ring').forEach((r) => r.remove()); window.__tapEl?.click(); });
  await W(after);
  return true;
}
const byText = (sel, re) => `() => [...document.querySelectorAll('${sel}')].find((x) => x.getBoundingClientRect().width && ${re}.test(x.innerText.replace(/\\s+/g, ' ').trim()))`;
const T = (sel, re) => (new Function(`return ${byText(sel, re)}`))();
const nav = (id) => new Function(`return () => document.querySelector('nav.nav a[href="#${id}"]')`)();
const css = (s) => new Function(`return () => [...document.querySelectorAll('${s}')].find((x) => x.getBoundingClientRect().width)`)();
const scroll = async (y, ms = 1400) => { await p.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), y); await W(ms); };
const scrollBy = async (y, ms = 1400) => { await p.evaluate((y) => window.scrollBy({ top: y, behavior: 'smooth' }), y); await W(ms); };

await p.goto(`http://localhost:${server.address().port}/`);
await p.waitForFunction(() => window.__bootDone === true, null, { timeout: 20000 }).catch(() => {});
await W(600);

// ---------- Title ----------
await say('شاشة البداية', 'دي أول حاجة بتشوفها. فوق: اللغة (EN / عربي / ES / FR) وزرار الإتاحة (خط أكبر، حركة أقل، تباين أعلى).', 4200);
await tap(T('button.chip', /^عربي$/));
await say('شاشة البداية', 'تحت فيه خانتين للسيف (Slot 1 و Slot 2): كل خانة كاريير لوحدها. وزرار «ماتش سريع» يلعبك ماتش من غير كاريير.', 4200);
await say('كاريير جديد', 'هندوس «ابدأ كاريير 2026/27» ← بيودّينا لاختيار الدوري.', 2600);
await tap(css('button.btn--primary'));
await say('اختيار الدوري', 'كل الدوريات: إنجلترا، إسبانيا، إيطاليا، ألمانيا، فرنسا، مصر، السعودية، المغرب... بالدرجة الأولى والتانية. السهم فوق يرجّعك لشاشة البداية.', 4200);
await tap(T('button.leaguecard', /مصر · الدرجة الأولى/));
await say('اختيار النادي', 'أندية الدوري المصري. كل نادي بميزانيته ومستواه. هنختار الأهلي.', 3000);
await tap(T('button', /الأهلي/));
await say('عن الشغلانة', 'قبل ما تمضي: ترتيب النادي في الدوري بالفريق والفلوس، الأعمار، الديربيات، والعقود اللي بتخلص في التشكيلة. «امضي العقد» ← يدخلك الكاريير.', 4500);
await scrollBy(500, 1600); await scroll(0, 800);
await tap(T('button', /امضي العقد/), { after: 2000 });

// ---------- Today ----------
await say('النهارده (الصفحة الرئيسية)', `دي أهم شاشة. ${NAVW} هو شريط التنقل الثابت: النهارده، الفريق، الماتش، الانتقالات، النادي. أي حاجة في اللعبة على بُعد ضغطتين من هنا.`, 4800);
await say('النهارده', 'زرار «كمّل» فوق هو اللي بيمشّي الوقت. مكتوب عليه هيعمل إيه (مثلاً: فيه قرارات مستنياك الأول).', 3600);
await say('النهارده — القرارات', 'كروت القرارات: الإدارة، التقسيمة، مين يختار التشكيل... كل اختيار مكتوب تحته تأثيره. «افتح» بيوديك للشاشة اللي القرار يخصها.', 4000);
await tap(css('button.choice.pick'));
await tap(css('button.choice.pick'));
await say('النهارده — البريد', 'سطر «رسالة جديدة في البريد» ← بيفتح الأخبار.', 2600);
await tap(css('button.inbox-line'), { after: 1800 });
await say('الأخبار', 'الأخبار متقسمة أقسام: نادينا، النتايج، الانتقالات، المدربين، الناشئين، الأرقام، الأزمات، غرف اللبس. كل قسم بعدده.', 4000);
await scrollBy(500); await scroll(0, 700);
await say('الرجوع', `من أي شاشة: السهم فوق، أو تدوس «النهارده» في ${NAVW}.`, 2600);
await tap(nav('today'), { after: 1500 });
await say('النهارده', 'لو نزلت لتحت: إيه اللي جاي (الماتش الجاي)، المتاح للماتش، العناوين، و«اختار التشكيل» اللي بيوديك على التكتيك.', 3600);
await scrollBy(700, 1800); await scrollBy(700, 1800); await scroll(0, 800);

// ---------- Squad ----------
await say('الفريق', `الضغطة على «الفريق» في ${NAVW} بتفتح الفريق، وفيه 5 تابات: اللاعيبة، غرفة اللبس، التمرين، العيادة، الأكاديمية.`, 3600);
await tap(nav('squad'), { after: 1500 });
await say('الفريق › اللاعيبة', 'فوق: «تخطيط الفريق» (كل خط: الأدوار، العقود، الأعمار، الناقص). وتحتها فلاتر: الأساسيين، عقود بتخلص، زعلانين، مصابين، معارين، معروضين.', 4400);
if (!DESK) await tap(T('button.btn', /افتح الخطة/), { after: 1600 });
await scrollBy(400, 1600);
await say('الفريق › اللاعيبة', 'كل لاعب سطر: مركزه، تقييمه، لياقته، معنوياته. الضغطة على أي لاعب ← صفحة اللاعب.', 3200);
await tap(css('button.pos'), { after: 1800 });
await say('صفحة اللاعب', 'كل حاجة عن اللاعب: المستوى والإمكانيات، العقد، دوره، مكانه في خطتك، الثقة والمعنويات، وزراير: كلّمه، جدّد، اعرضه للبيع، ريّحه...', 4400);
await scrollBy(600, 1600); await scrollBy(600, 1600); await scroll(0, 700);
await say('الرجوع', 'السهم فوق بيرجّعك للفريق.', 2000);
await tap(css('header .icon-btn'), { after: 1500 });
const sqTab = async (re, title, text, more = 1) => {
  await tap(T('.page .seg button, .page [role=tablist] button, .area-tabs .seg button, .o-tabs button', re), { after: 1400 });
  await say(title, text, 3800);
  for (let i = 0; i < more; i++) await scrollBy(600, 1500);
  await scroll(0, 600);
};
await sqTab(/^غرفة اللبس$/, 'الفريق › غرفة اللبس', 'الكابتن والقادة، تماسك الفريق، مين عايز يكلمك، الوعود اللي إديتها وحالتها، وسجل كل اللي حصل في الأوضة (حتى من مواسم فاتت).', 2);
await sqTab(/^التمرين$/, 'الفريق › التمرين', '«الأسبوع ده»: الحصص وأيام الراحة حوالين الماتشات، وزراير «إديهم يوم راحة» و«حصة زيادة». وتحت: شدة التمرين والتركيز.', 2);
await sqTab(/^العيادة$/, 'الفريق › العيادة', 'المصابين ومدة الغياب، واللي لايق بس مش جاهز للماتش، وعلاج الإصابات.', 1);
await sqTab(/^الأكاديمية$/, 'الفريق › الأكاديمية', 'الناشئين متقسمين تحت 18 وتحت 21، وتصعّد أو تعير أو تبيع، وكشافين الناشئين.', 2);

// ---------- Match ----------
await tap(nav('match'), { after: 1500 });
await say('الماتش', '4 تابات: التكتيك، المواعيد، الجدول، الكاسات.', 3200);
await say('الماتش › التكتيك', 'التشكيل على الملعب، أسلوب اللعب، التعليمات، الأدوار، الكابتن والضربات الثابتة، وخطة B. تدوس على لاعب عشان تبدّله.', 4200);
await tap(T('button', /^والكورة معاهم$/), { after: 1600 });
await say('الماتش › التكتيك', 'جوه التكتيك فيه مفتاح «والكورة معانا / والكورة معاهم»: تشوف وتظبط الرسم وإنت مستحوذ، والرسم من غير الكورة.', 4200);
await tap(T('button', /^والكورة معانا$/), { after: 1400 });
await scrollBy(600, 1500); await scrollBy(600, 1500); await scroll(0, 600);
const mTab = async (re, title, text) => { await tap(T('.page .seg button, .page [role=tablist] button, .area-tabs .seg button, .o-tabs button', re), { after: 1400 }); await say(title, text, 3400); await scrollBy(500, 1400); await scroll(0, 500); };
await mTab(/^المواعيد$/, 'الماتش › المواعيد', 'كل ماتشات الموسم، و«إيه اللي بيتكرر» في آخر 6 ماتشات.');
await mTab(/^الجدول$/, 'الماتش › الجدول', 'جدول الدوري.');
await mTab(/^الكاسات$/, 'الماتش › الكاسات', 'الكاس ومشوارك فيه لحد فين.');

// ---------- Transfers ----------
await tap(nav('transfers'), { after: 1500 });
await say('الانتقالات', 'الانتقالات 4 خطوات ورا بعض: ١ الاحتياجات والكشافين ← ٢ القايمة والبحث ← ٣ المفاوضات ← ٤ الصفقات والإعارات.', 4000);
const stages = ['١ الاحتياجات والكشافين: الناقص في الفريق، وتبعت الكشافين يدوروا في دوري أو بلد أو العالم.', '٢ القايمة والبحث: اللي الكشافين لقوهم وقايمتك المختصرة، والبحث عن أي لاعب.', '٣ المفاوضات: العروض والمفاوضات الشغالة، وغرفة التفاوض.', '٤ الصفقات والإعارات: اللي مضى، اللي اتباع، والمعارين.'];
for (let i = 0; i < 4; i++) {
  await tap(new Function(`return () => document.querySelectorAll('.rc-funnel .stage')[${i}]`)(), { after: 1400 });
  await say('الانتقالات', stages[i], 3400);
  await scrollBy(500, 1300); await scroll(0, 500);
}

// ---------- Club ----------
await tap(nav('club'), { after: 1500 });
await say('النادي', '5 تابات: الفلوس، الإدارة، المنشآت، الجهاز، التسويق. وفوق: مشواري، كلوب باس، الإعدادات والحفظ.', 3800);
const cTab = async (re, title, text) => { await tap(T('.page .seg button, .page [role=tablist] button, .area-tabs .seg button, .o-tabs button', re), { after: 1400 }); await say(title, text, 3600); await scrollBy(600, 1400); await scroll(0, 500); };
await cTab(/^الفلوس$/, 'النادي › الفلوس', 'الميزانية، المرتبات، الدخل والمصاريف، وسعر التذاكر.');
await cTab(/^الإدارة$/, 'النادي › الإدارة', 'ثقة الإدارة وهدف الموسم، و«ليه اتحركت»: آخر 8 تغييرات في الثقة وسبب كل واحدة.');
await cTab(/^المنشآت$/, 'النادي › المنشآت', 'الملعب ومركز التدريب والأكاديمية. قبل أي تطوير بتشوف توقع: هيكلّف كام وهيرجّع إيه.');
await cTab(/^الجهاز$/, 'النادي › الجهاز', 'المساعد والمدربين والكشافين والدكاترة، ومين بيمسك أنهي قسم (إنت ولا الجهاز).');
await cTab(/^التسويق$/, 'النادي › التسويق', 'الرعاة والعقود التجارية.');
const club = async (re, title, text) => { await tap(T('.page button', re), { after: 1600 }); await say(title, text, 3600); await scrollBy(600, 1400); await tap(nav('club'), { after: 1200 }); };
await club(/^مشواري$/, 'مشواري', 'الكاريير بتاعك: سمعتك، أسلوبك من واقع لعبك، الألقاب والتاريخ.');
await club(/^كلوب باس$/, 'كلوب باس', 'اشتراك الداعمين والمميزات.');
await club(/^الإعدادات والحفظ$/, 'الإعدادات والحفظ', 'اللغة، الصوت، الإتاحة، وتحفظ أو تصدّر أو تستورد السيف.');

// ---------- Match day ----------
await tap(nav('today'), { after: 1400 });
await say('يوم الماتش', 'نرجع للنهارده وندوس «كمّل»: الوقت بيمشي لحد الماتش الجاي (ولو فيه قرارات، الجهاز ممكن ياخدها عنك).', 3600);
for (let i = 0; i < 6 && !(await p.$('.sc-pre')); i++) {
  await tap(css('button.btn--accent.continue'), { hold: 700, after: 1500 });
  if (await p.$('[role=dialog] .btn--accent')) await tap(css('[role=dialog] .btn--accent'), { hold: 700, after: 1500 });
}
await say('قبل الماتش (النفق)', 'شاشة ما قبل الماتش: التشكيلتين، كلمة غرفة اللبس (٣ اختيارات)، «٣ حاجات للماتش ده»، ونسبة الفوز والـxG.', 4200);
await scrollBy(500, 1500);
await say('كلمة غرفة اللبس', 'تختار تحمّسهم، تركّزهم، ولا تهدّيهم. وده بيأثر في الماتش.', 3000);
await scrollBy(500, 1500);
await say('معمل التكتيك', '«جرّب خطة تانية» ← بيفتح معمل التكتيك.', 2600);
await tap(T('button', /^جرّب خطة تانية$/), { after: 1800 });
await say('معمل التكتيك', 'كل أسلوب لعب بنسبة الفوز قدام الخصم ده (من محرك الماتش نفسه). تقدر تغيّر التشكيل من فوق، و«استخدم» بيطبّق الخطة.', 4600);
await scrollBy(400, 1500);
await tap(new Function(`return () => [...document.querySelectorAll('.lab .lab-row button')][0]`)(), { after: 1600 });
await say('معمل التكتيك', 'دوسنا «استخدم» على أحسن خطة: نسبة الفوز في الشاشة اتغيرت لنفس الرقم.', 3200);
await tap(T('button', /^اقفل المعمل$/), { after: 1000 });
await scrollBy(800, 1400);
await say('تنزل الماتش إزاي', '٣ طرق: «انزل الملعب» تتفرج عليه لايف، «هات النتيجة على طول»، أو «كمّل لحد القرار الجاي».', 3800);
await tap(T('button', /^انزل الملعب$/), { after: 2500 });

// ---------- Live ----------
await say('الماتش لايف', 'الملعب والكورة بتتحرك لاعب للاعب. فوق: النتيجة والدقيقة وسرعة العرض.', 4000);
await W(4000);
await say('الماتش لايف', 'تقدر تختار تشوف: أهم اللحظات، التعليق، الملعب، السيطرة، التسديدات.', 3400);
await tap(T('button.chip', /^التعليق$/), { after: 3000 });
await tap(T('button.chip', /^الملعب$/), { after: 2500 });
await say('تعليمات من على الخط', 'زراير الصريخ: كمّلوا كده، افتحوا على الأطراف، هدّوا اللعب، اضغطوا، ارجعوا لورا، هجوم. و«التغييرات» للتبديل.', 4200);
await W(4000);
await say('آخر الماتش', '«فورًا» بيكمّل الماتش لحد صفارة النهاية.', 2600);
await tap(T('button', /^فورًا$/), { after: 3500 });
await say('نهاية الماتش', 'النتيجة، «ليه حصل كده» (أهم ملاحظات المحللين)، التقييمات، والخطوة الجاية.', 4200);
await scrollBy(600, 1600); await scrollBy(600, 1600); await scrollBy(600, 1600); await scroll(0, 800);
await say('ورجعنا', 'ومن هنا ترجع للنهارده وتكمّل الأسبوع الجاي... ودي اللعبة كلها.', 3500);
const ret = (await p.$('nav.nav a[href="#today"]')) ? nav('today') : css('.btn--accent');
await tap(ret, { after: 2500 });
await say('خلصنا', 'دي جولة على كل شاشات The Gaffer وكل ضغطة بتوديك فين.', 3500);

await p.close(); await ctx.close(); await b.close(); server.close();
const f = readdirSync(OUT).filter((x) => x.endsWith('.webm')).map((x) => `${OUT}/${x}`)[0];
renameSync(f, `${OUT}/the-gaffer-tour-${DESK ? 'laptop' : 'phone'}.webm`);
console.log(log.join('\n'));
