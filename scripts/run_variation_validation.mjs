import { compileHistoricalV5 } from '../services/creative-video-orchestrator/dist/index.js';

const cases = [
  {
    id: 1,
    name: 'Bofe 16L Akülü Sırt Pompası — greenhouse context',
    input: {
      brandName: 'Bofe',
      about: 'Tarımsal ilaçlama ekipmanları ve bahçe bakım çözümleri üreticisi.',
      sectorHint: 'tarım',
      brief: 'Modern cam serada domates ve sebze sıraları arasında bitki koruma ve ilaçlama.',
      products: [{
        name: 'Bofe 16L Akülü Sırt Pompası',
        description: '16 litre depo hacimli, bataryalı sırtta taşınan sera ve bahçe ilaçlama pompası, nozul ve tetik mekanizması.',
        imageUrl: '@HeroProduct'
      }],
      productImageUrl: '@HeroProduct',
      logoUrl: '@BrandLogo'
    },
    dialogue: 'Sera bitki bakımında yüksek verim, Bofe akülü sırt pompası ile yanınızda.'
  },
  {
    id: 2,
    name: 'Bofe / Delta different SKU — verify SKU identity',
    input: {
      brandName: 'Delta Pulverizatör',
      about: 'Manuel basınçlı bahçe ilaçlama ekipmanları üreticisi.',
      sectorHint: 'tarım',
      brief: 'Küçük bahçede çiçek ve çalı bakımı için pratik manuel püskürtme.',
      products: [{
        name: 'Delta 10L Basınçlı Manuel İlaçlama Pompası',
        description: '10 litre hacimli, elden pompalamalı basınçlı omuz askılı manuel ilaçlama tüpü, pirinç nozullu silindirik gövde.',
        imageUrl: '@HeroProduct'
      }],
      productImageUrl: '@HeroProduct',
      logoUrl: '@BrandLogo'
    },
    dialogue: 'Pratik bahçe bakımında kesintisiz basınç, Delta 10 litre pompa ile yanınızda.'
  },
  {
    id: 3,
    name: 'Ayvazoğlu brick — construction/material world',
    input: {
      brandName: 'Ayvazoğlu Tuğla',
      about: 'Yüksek dayanımlı yapı tuğlası ve inşaat malzemeleri üreticisi.',
      sectorHint: 'inşaat',
      brief: 'Şantiye ortamında ustalar tarafından örülen dayanıklı dış cephe tuğla duvarı.',
      products: [{
        name: 'Ayvazoğlu İzolasyonlu Yapı Tuğlası',
        description: 'Isı ve ses yalıtımlı pişmiş kil yapı tuğlası, şantiye ve duvar örme için standart blok.',
        imageUrl: '@HeroProduct'
      }],
      productImageUrl: '@HeroProduct',
      logoUrl: '@BrandLogo'
    },
    dialogue: 'Sağlam yapılara güçlü temel, Ayvazoğlu yapı tuğlası ile yükselir.'
  },
  {
    id: 4,
    name: 'Aura Botanica Yüz Serumu — cosmetic world',
    input: {
      brandName: 'Aura Botanica',
      about: 'Organik bitkisel içerikli cilt bakım ürünleri ve doğal kozmetik markası.',
      sectorHint: 'kozmetik',
      brief: 'Aydınlık sabah banyosunda damlalıkla cilde uygulanan doğal serum.',
      products: [{
        name: 'Aura Botanica C Vitamini Canlandırıcı Yüz Serumu',
        description: 'Damlalıklı cam şişede konsantre bitkisel yüz serumu, parlak ve taze cilt görünümü sağlar.',
        imageUrl: '@HeroProduct'
      }],
      productImageUrl: '@HeroProduct',
      logoUrl: '@BrandLogo'
    },
    dialogue: 'Cildinize doğal ışıltı ve canlılık, Aura Botanica yüz serumu ile gelir.'
  },
  {
    id: 5,
    name: 'RoastCraft Specialty Coffee — food/consumable world',
    input: {
      brandName: 'RoastCraft Coffee',
      about: 'Nitelikli tek kökenli taze kavrulmuş çekirdek kahve üreticisi.',
      sectorHint: 'gıda',
      brief: 'Sıcak rustik mutfak tezgâhında taze kavrulmuş çekirdek kahve paketi ve aromatik demleme.',
      products: [{
        name: 'RoastCraft Ethiopia Yirgacheffe Çekirdek Kahve',
        description: '250 gram kilitli valfli kraft ambalajında tek kökenli taze kavrulmuş filtre kahve çekirdeği.',
        imageUrl: '@HeroProduct'
      }],
      productImageUrl: '@HeroProduct',
      logoUrl: '@BrandLogo'
    },
    dialogue: 'Her yudumda taze çekirdek aroması, RoastCraft nitelikli kahve ile fincanınızda.'
  }
];

import * as fs from 'node:fs';

const results = [];
for (const c of cases) {
  try {
    const res = compileHistoricalV5(c.input, c.dialogue);
    results.push({
      id: c.id,
      name: c.name,
      offerType: res.classification.offerType,
      proofMode: res.classification.proofMode,
      primaryValue: res.classification.primaryValue,
      primaryAffordance: res.classification.primaryAffordance,
      hookFamily: res.hookPlan.family,
      location: res.shotPlan.singleLocation,
      shots: res.shotPlan.shots.map((s, idx) => ({
        shotIndex: idx + 1,
        timing: `${s.timing.from}-${s.timing.to}s`,
        framing: s.framing,
        action: s.subjectAction,
        cameraMotion: s.cameraMotion
      })),
      typography: res.overlayPlan.commercialTypography,
      veoPrompt: res.veoPrompt
    });
  } catch (err) {
    results.push({ id: c.id, name: c.name, error: err.message });
  }
}

fs.writeFileSync('C:/Users/TP2/Desktop/variation_validation_results.json', JSON.stringify(results, null, 2), 'utf8');
console.log('Saved C:/Users/TP2/Desktop/variation_validation_results.json successfully');
console.log(JSON.stringify(results, null, 2));

