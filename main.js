(() => {
'use strict';
const $ = id => document.getElementById(id);
const boardEl=$('board'), overlay=$('overlay');
const configs={easy:{rows:9,cols:9,mines:10,label:'آسان'},medium:{rows:9,cols:9,mines:10,label:'متوسط'},hard:{rows:16,cols:16,mines:40,label:'سخت'},expert:{rows:16,cols:30,mines:99,label:'حرفه‌ای'}};
let game, mode='reveal', timerId=null, seconds=0, botBusy=false;

function newGame(){
  clearInterval(timerId); seconds=0; botBusy=false;
  const c=configs[$('difficulty').value];
  game={...c,cells:[],started:false,over:false,turn:'player',playerScore:0,botScore:0,flags:0,revealed:0,first:null,lastExploded:null};
  for(let r=0;r<c.rows;r++){game.cells[r]=[];for(let col=0;col<c.cols;col++)game.cells[r][col]={r,c:col,mine:false,n:0,open:false,flag:false,owner:null};}
  $('difficultyLabel').textContent=c.label;
  $('statusPill').textContent='آماده';$('boardSubtitle').textContent='برای شروع یک خانه را انتخاب کن';
  $('botMessage').textContent='من آماده‌ام. پس از نوبت تو، اطلاعات صفحه را تحلیل می‌کنم و بهترین حرکت منطقی را انتخاب می‌کنم.';
  $('confidenceValue').textContent='—';overlay.classList.add('show');$('overlayTitle').textContent='آماده‌ای؟';$('overlayText').textContent='اولین خانه را باز کن تا بازی شروع شود.';$('overlayBtn').textContent='شروع بازی';
  render();updateStats();updateTurn();
}
function neighbors(r,c){const a=[];for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;let rr=r+dr,cc=c+dc;if(rr>=0&&rr<game.rows&&cc>=0&&cc<game.cols)a.push(game.cells[rr][cc]);}return a;}
function placeMines(safe){
  let pool=[];for(let r=0;r<game.rows;r++)for(let c=0;c<game.cols;c++){let x=game.cells[r][c];if(Math.abs(x.r-safe.r)>1||Math.abs(x.c-safe.c)>1)pool.push(x);}
  // First click and its immediate neighborhood are guaranteed safe.
  for(let i=pool.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  pool.slice(0,game.mines).forEach(x=>x.mine=true);
  for(let r=0;r<game.rows;r++)for(let c=0;c<game.cols;c++)game.cells[r][c].n=neighbors(r,c).filter(x=>x.mine).length;
}
function startClock(){if(timerId)return;timerId=setInterval(()=>{seconds++;$('timer').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;},1000);}
function reveal(cell,actor){
  if(game.over||cell.open||cell.flag)return false;
  if(!game.started){game.started=true;game.first=cell;placeMines(cell);overlay.classList.remove('show');$('statusPill').textContent='در جریان';$('boardSubtitle').textContent='با دقت حرکت کن؛ نوبت‌ها یکی‌درمیان هستند';startClock();}
  if(cell.mine){cell.open=true;cell.owner=actor;game.lastExploded=cell;endGame(false,actor);render();return false;}
  flood(cell,actor);
  if(game.revealed===game.rows*game.cols-game.mines){endGame(true);return true;}
  return true;
}
function flood(start,actor){
  const queue=[start];
  while(queue.length){const x=queue.shift();if(x.open||x.flag||x.mine)continue;x.open=true;x.owner=actor;game.revealed++;if(actor==='player')game.playerScore++;else game.botScore++;
    if(x.n===0)for(const y of neighbors(x.r,x.c))if(!y.open&&!y.flag&&!y.mine)queue.push(y);
  }
}
function toggleFlag(cell){
  if(game.over||cell.open)return;
  cell.flag=!cell.flag;game.flags+=cell.flag?1:-1;render();updateStats();
}
function endGame(win,loser){
  game.over=true;clearInterval(timerId);timerId=null;
  $('statusPill').textContent=win?'پیروزی':'پایان بازی';
  if(win){$('overlayTitle').textContent='میدان پاک‌سازی شد!';$('overlayText').textContent=`تبریک! تمام خانه‌های امن باز شدند. امتیاز شما ${game.playerScore} و ربات ${game.botScore} است.`;}
  else{$('overlayTitle').textContent=loser==='player'?'مین را فعال کردی!':'ربات روی مین رفت!';$('overlayText').textContent=`${loser==='player'?'ربات':'شما'} برنده این دور شدید. امتیازها: شما ${game.playerScore} — ربات ${game.botScore}.`;}
  $('overlayBtn').textContent='بازی دوباره';overlay.classList.add('show');$('botMessage').textContent=win?'تحلیل کامل شد؛ تمام خانه‌های امن پیدا شدند.':(loser==='player'?'این حرکت خطرناک بود. این بار میدان به نفع من تمام شد.':'حرکت من اشتباه بود؛ در شرایط احتمالی ریسک کردم.');
  revealAllMines();render();updateStats();
}
function revealAllMines(){for(const row of game.cells)for(const x of row)if(x.mine)x.showMine=true;}
function render(){
  boardEl.style.gridTemplateColumns=`repeat(${game.cols}, ${getCellSize()}px)`;boardEl.innerHTML='';
  for(let r=0;r<game.rows;r++)for(let c=0;c<game.cols;c++){
    const x=game.cells[r][c],b=document.createElement('button');b.className='cell';b.type='button';b.setAttribute('role','gridcell');b.setAttribute('aria-label',x.open?(x.mine?'مین':`عدد ${x.n}`):(x.flag?'پرچم':'خانه بسته'));
    if(x.open){b.classList.add('opened');if(x.mine){b.textContent='✹';b.classList.add('mine');if(x===game.lastExploded)b.classList.add('exploded');}else if(x.n){b.textContent=x.n;b.classList.add('n'+x.n);}}
    else if(x.flag){b.textContent='⚑';b.classList.add('flagged');}
    if(game.over&&x.flag&&!x.mine)b.classList.add('wrong-flag');
    b.addEventListener('click',()=>handleCell(x));
    b.addEventListener('contextmenu',e=>{e.preventDefault();toggleFlag(x);});
    boardEl.appendChild(b);
  }
}
function getCellSize(){if(game.cols>=30)return 24;if(game.cols>=16)return 30;return 38;}
function handleCell(x){
  if(game.over||botBusy||game.turn!=='player')return;
  if(mode==='flag'){toggleFlag(x);return;}
  const ok=reveal(x,'player');render();updateStats();
  if(ok&&!game.over){game.turn='bot';updateTurn();setTimeout(botTurn,500);}
}
function updateStats(){
  $('playerScore').textContent=game.playerScore;$('botScore').textContent=game.botScore;
  $('minesLeft').textContent=Math.max(0,game.mines-game.flags);$('safeLeft').textContent=game.rows*game.cols-game.mines-game.revealed;
}
function updateTurn(){
  $('turnText').textContent=game.turn==='player'?'نوبت شماست':'ربات در حال تحلیل است';
  $('turnIcon').textContent=game.turn==='player'?'◉':'✧';
  $('botMoveBtn').disabled=game.over||game.turn!=='bot'||botBusy;
  $('botMoveBtn').style.opacity=$('botMoveBtn').disabled?'.45':'1';
}
function chooseBotMove(){
  // Build frontier constraints from all revealed numbered cells.
  const unknown=new Map(), constraints=[];
  for(let r=0;r<game.rows;r++)for(let c=0;c<game.cols;c++){
    const x=game.cells[r][c];if(!x.open||x.mine||!x.n)continue;
    const ns=neighbors(r,c),covered=ns.filter(y=>!y.open&&!y.flag),flags=ns.filter(y=>y.flag).length;
    if(covered.length)constraints.push({vars:covered,need:x.n-flags});
  }
  const knownSafe=new Map(),knownMine=new Map();
  let changed=true;
  while(changed){changed=false;
    for(const q of constraints){const vars=q.vars.filter(x=>!knownSafe.has(key(x))&&!knownMine.has(key(x)));const need=q.need-q.vars.filter(x=>knownMine.has(key(x))).length;
      if(need===0){for(const x of vars)if(!knownSafe.has(key(x))){knownSafe.set(key(x),x);changed=true;}}
      else if(need===vars.length){for(const x of vars)if(!knownMine.has(key(x))){knownMine.set(key(x),x);changed=true;}}
    }
  }
  if(knownSafe.size){const x=[...knownSafe.values()].sort((a,b)=>neighbors(a.r,a.c).filter(z=>z.open).length-neighbors(b.r,b.c).filter(z=>z.open).length)[0];return {cell:x,prob:0,reason:'استنتاج قطعی: این خانه نمی‌تواند مین باشد.'};}
  // Estimate risk by constraint frequency, combining all adjacent clues.
  const candidates=[];for(let r=0;r<game.rows;r++)for(let c=0;c<game.cols;c++){const x=game.cells[r][c];if(!x.open&&!x.flag)candidates.push(x);}
  if(!candidates.length)return null;
  const risk=new Map(candidates.map(x=>[key(x),{x,sum:0,count:0}]));
  for(const q of constraints){
    const vars=q.vars.filter(x=>!knownMine.has(key(x))&&!knownSafe.has(key(x)));
    const need=q.need-q.vars.filter(x=>knownMine.has(key(x))).length;
    if(vars.length&&need>=0&&need<=vars.length){const p=need/vars.length;for(const x of vars){const z=risk.get(key(x));if(z){z.sum+=p;z.count++;}}}
  }
  // Global mine density is a conservative fallback for unconstrained squares.
  const remainingMines=Math.max(0,game.mines-game.cells.flat().filter(x=>x.flag).length-knownMine.size);
  const remainingCells=Math.max(1,candidates.length-knownMine.size);
  const globalP=Math.min(1,remainingMines/remainingCells);
  for(const z of risk.values())z.p=z.count?z.sum/z.count:globalP;
  // Prefer lowest risk; tie-break toward cells bordering revealed information.
  const best=[...risk.values()].sort((a,b)=>a.p-b.p||neighbors(b.x.r,b.x.c).filter(z=>z.open).length-neighbors(a.x.r,a.x.c).filter(z=>z.open).length);
  if(!best.length)return null;
  return {cell:best[0].x,prob:best[0].p,reason:best[0].count?'احتمال خطر از روی سرنخ‌های مجاور تخمین زده شد.':'سرنخ قطعی در دسترس نیست؛ از تراکم کلی مین‌ها استفاده کردم.'};
}
function botTurn(){
  if(game.over||game.turn!=='bot'||botBusy)return;
  botBusy=true;updateTurn();$('botMessage').textContent='در حال بررسی اعداد، پرچم‌ها و محدودیت‌های اطراف...';
  setTimeout(()=>{
    const move=chooseBotMove();
    if(!move){botBusy=false;return;}
    const pct=Math.round((1-move.prob)*100);$('confidenceValue').textContent=`${pct}%`;
    $('botMessage').textContent=move.reason+` انتخاب من: ریسک تقریبی ${Math.round(move.prob*100)}٪.`;
    const ok=reveal(move.cell,'bot');render();updateStats();botBusy=false;
    if(!game.over){game.turn='player';updateTurn();}
  },450);
}
$('newGameBtn').addEventListener('click',newGame);
$('overlayBtn').addEventListener('click',()=>{if(game.over)newGame();else{overlay.classList.remove('show');}});
$('botMoveBtn').addEventListener('click',()=>{if(game.turn==='bot')botTurn();});
$('difficulty').addEventListener('change',newGame);
$('revealMode').addEventListener('click',()=>{mode='reveal';$('revealMode').classList.add('active');$('flagMode').classList.remove('active');});
$('flagMode').addEventListener('click',()=>{mode='flag';$('flagMode').classList.add('active');$('revealMode').classList.remove('active');});
$('themeBtn').addEventListener('click',()=>document.body.classList.toggle('light'));
$('helpBtn').addEventListener('click',()=>$('helpDialog').showModal());
$('closeHelp').addEventListener('click',()=>$('helpDialog').close());
document.addEventListener('keydown',e=>{if(e.key==='Escape')$('helpDialog').close();});
newGame();
})();
