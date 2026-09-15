const fs = require('fs');
const dataset = JSON.parse(fs.readFileSync('data/real_companies_dataset.json','utf8'));
const cache = JSON.parse(fs.readFileSync('data/features_cache.json','utf8'));
const cities = JSON.parse(fs.readFileSync('data/cities.json','utf8'));
const featureMap = new Map(cache.map(f => [f.id, f]));

function dist(lat1,lng1,lat2,lng2){
  const R=6371,dLat=(lat2-lat1)*Math.PI/180,dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function evaluateEngine(P) {
  let passes = 0, totalP6 = 0, n = 0;
  for(const entry of dataset){
    const f=featureMap.get(entry.id); if(!f) continue; n++;
    const wh=cities.find(c=>c.name.toLowerCase()===entry.warehouseCity.toLowerCase());
    const scored=cities.map(city=>{
      const raw={income:f.incomeWeight||0.25,retail:f.retailWeight||0.25,internet:f.internetWeight||0.25,cold:entry.needsColdChain?(f.coldWeight||0):0,logistics:f.logisticsWeight||0.25};
      const sum=Object.values(raw).reduce((a,b)=>a+b,0);
      const w=Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,v/sum]));
      const base=city.income*w.income+city.retail*w.retail+city.internet*w.internet+(city.cold||city.logisticsScore)*w.cold+city.logisticsScore*w.logistics;
      
      let adj=0;
      if(city.tier===1) adj+=P.t1;
      adj+=Math.min((city.population||0)*0.12, P.dens);
      if(entry.brandMaturity==='established'&&city.tier===1) adj+=2;
      if(entry.hasDistributor==='yes') adj+=2;
      if(entry.hasDistributor==='direct'){
        if(city.tier===1)adj+=P.d2c;
        if(city.tier===3)adj-=4;
      }
      
      const d=wh?dist(wh.lat,wh.lng,city.lat,city.lng):0;
      let fr=Math.min(15,entry.priceINR*0.10)+(d/100)*3.0;
      if(entry.needsColdChain)fr*=1.35;
      fr-=(city.logisticsScore/100)*4;
      const vd={mass:0.25,mid:0.45,premium:0.80,luxury:1.00};
      fr=Math.max(2,Math.min(fr*(vd[entry.priceSegment]||0.5),95));
      const uM=entry.priceINR*(entry.marginPercent/100);
      const mR=uM>0?Math.max(0,uM-fr)/uM:0;
      let score=(base+adj)*(0.30+mR*0.70);
      if(entry.deliveryRadiusKM&&d>entry.deliveryRadiusKM) score-=Math.min(35,Math.round((d-entry.deliveryRadiusKM)/40));
      if(score>90) score=90+10*(1-Math.exp(-(score-90)/10));
      return {name:city.name,score:Math.max(0,Math.round(score))};
    }).sort((a,b)=>b.score-a.score);
    
    const top6=scored.slice(0,6).map(s=>s.name);
    const p6=entry.actualTop6.filter(c=>top6.includes(c)).length/6;
    totalP6+=p6; if(p6>=0.5)passes++;
  }
  return { passRate: (passes/n*100).toFixed(1), p6: (totalP6/n*100).toFixed(1) };
}

console.log('\n--- 1. TIER-1 METRO BONUS ABLATION ---');
console.log('Testing values from +0 to +16 (Current best: +10)');
for(let v=0; v<=16; v+=2) {
  const res = evaluateEngine({ t1: v, dens: 4, d2c: 5 });
  console.log(\  Tier-1 Bonus = +\ pts  =>  Pass Rate: \%  |  Mean P@6: \%\);
}

console.log('\n--- 2. POPULATION DENSITY MAX BONUS ABLATION ---');
console.log('Testing values from +0 to +8 (Current best: +4)');
for(let v=0; v<=8; v+=2) {
  const res = evaluateEngine({ t1: 10, dens: v, d2c: 5 });
  console.log(\  Density Max = +\ pts   =>  Pass Rate: \%  |  Mean P@6: \%\);
}

console.log('\n--- 3. D2C METRO BONUS ABLATION ---');
console.log('Testing values from +0 to +10 (Current best: +5)');
for(let v=0; v<=10; v+=2) {
  const res = evaluateEngine({ t1: 10, dens: 4, d2c: v });
  console.log(\  D2C Bonus = +\ pts     =>  Pass Rate: \%  |  Mean P@6: \%\);
}

console.log('\n--- 4. REDUNDANT PENALTIES (Testing if bringing them back helps) ---');
// Quick custom loop to test adding the Tier-3 penalty back
function evalWithT3Penalty(penalty) {
  let totalP6 = 0, passes = 0, n=0;
  for(const entry of dataset){
    const f=featureMap.get(entry.id); if(!f) continue; n++;
    const wh=cities.find(c=>c.name.toLowerCase()===entry.warehouseCity.toLowerCase());
    const scored=cities.map(city=>{
      // (Skipping full raw/w math copy-paste for brevity, just doing base)
      const raw={income:f.incomeWeight||0.25,retail:f.retailWeight||0.25,internet:f.internetWeight||0.25,cold:entry.needsColdChain?(f.coldWeight||0):0,logistics:f.logisticsWeight||0.25};
      const sum=Object.values(raw).reduce((a,b)=>a+b,0);
      const w=Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,v/sum]));
      const base=city.income*w.income+city.retail*w.retail+city.internet*w.internet+(city.cold||city.logisticsScore)*w.cold+city.logisticsScore*w.logistics;
      
      let adj=0;
      if(city.tier===1) adj+=10;
      adj+=Math.min((city.population||0)*0.12, 4);
      if(entry.brandMaturity==='established'&&city.tier===1) adj+=2;
      if(entry.hasDistributor==='yes') adj+=2;
      if(entry.hasDistributor==='direct'){if(city.tier===1)adj+=5;if(city.tier===3)adj-=4;}
      
      // ADDING TIER 3 PENALTY
      const isMassIntensive = entry.priceSegment === 'mass' && entry.channels.includes('Kirana');
      if (city.tier === 3 && !isMassIntensive) adj += penalty;

      const d=wh?dist(wh.lat,wh.lng,city.lat,city.lng):0;
      let fr=Math.min(15,entry.priceINR*0.10)+(d/100)*3.0;
      if(entry.needsColdChain)fr*=1.35;
      fr-=(city.logisticsScore/100)*4;
      const vd={mass:0.25,mid:0.45,premium:0.80,luxury:1.00};
      fr=Math.max(2,Math.min(fr*(vd[entry.priceSegment]||0.5),95));
      const uM=entry.priceINR*(entry.marginPercent/100);
      const mR=uM>0?Math.max(0,uM-fr)/uM:0;
      let score=(base+adj)*(0.30+mR*0.70);
      if(entry.deliveryRadiusKM&&d>entry.deliveryRadiusKM) score-=Math.min(35,Math.round((d-entry.deliveryRadiusKM)/40));
      return {name:city.name,score};
    }).sort((a,b)=>b.score-a.score);
    const top6=scored.slice(0,6).map(s=>s.name);
    const p6=entry.actualTop6.filter(c=>top6.includes(c)).length/6;
    totalP6+=p6; if(p6>=0.5)passes++;
  }
  return { passRate: (passes/n*100).toFixed(1), p6: (totalP6/n*100).toFixed(1) };
}

console.log('Testing Tier-3 Non-Mass Penalty (Current: 0 pts, Old: -5 pts)');
[0, -2, -5, -8, -12].forEach(p => {
  const res = evalWithT3Penalty(p);
  console.log(\  Tier-3 Penalty = \ pts  =>  Pass Rate: \%  |  Mean P@6: \%\);
});
console.log('');
