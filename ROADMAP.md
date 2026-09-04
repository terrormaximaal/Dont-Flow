# Procedural Vehicle Generator — analyse en roadmap

Stand: 4 sep 2026. Stappen 1, 2, 4 t/m 8 zijn gedaan; 3 is gemeten en afgewezen (zie tabel).
Alle getallen hieronder zijn gemeten op `sportscar-studio.html`, seed 12345,
`super_gt`, tenzij anders vermeld. Metingen draaien op een software-rasteriser
(swiftshader); waar dat het resultaat beïnvloedt staat het erbij.

---

## 1. Wat er nu staat

Eén bestand van 5351 regels, twee scriptblokken: `#core` (de generator) en
`#app` (viewer, UI, QC-paneel).

### Pijplijn

```
generateDNA(opts)          171 regels   ARCHETYPES + RNG -> ~90 afgeleide getallen
  -> makeBody(d)           602 regels   B.*: alle oppervlakken als (u,v) -> [x,y,z]
  -> buildVehicle(opts)   1194 regels   alle onderdelen, één rechte lijn
       buildStructure      157 regels
       enforceSkinDominance / symmetriseVehicle / mergeBands
  -> qualityGate(v)       1295 regels   21 controles + geometrieverificatie
```

De carrosserie is geen verzameling primitieven: elk paneel is een band uit een
parametrisch oppervlak (`_grid` / `buildShell` / `surfRegion` / `bandsAround`),
en de vorm komt uit **gemeten curvetabellen** die van één orthografisch
stylingblad zijn afgelezen: `REF2_SIL`, `REF2_PLAN`, `REF_SECTION`, `REF2_BELT`,
`REF2_CABIN`, `REF2_DLO`, `REF2_TUMBLE`. Dat is de reden dat de auto
geloofwaardig oogt.

### Gemeten toestand

| | |
|---|---|
| bouwtijd (desktop, q=1) | 606 ms |
| tijd tot eerste beeld (telefoonpad) | ~2,0 s |
| parts / meshes | 53 / 319 |
| driehoeken / vertices | 59 058 / 56 031 |
| draw calls per frame | 251 (telefoonpad), 274 (desktop) |
| unieke geometries | 319 — **niets wordt gedeeld** |
| materialen | 62 |
| wielen | 76 meshes, 7216 driehoeken, 4x hetzelfde |
| damage: geheugen | 32 meshes met bewaarde originelen, 653 kB |
| damage: één inslag | 2,5 ms |
| damage: alles naar total loss | 3 ms, mesh-aantal onveranderd |
| repair | 4 ms |

---

## 2. De echte problemen, op volgorde van gewicht

### P1 — De vorm hangt aan één getraceerd stylingblad *(blokkeert alles in punt 2 van de opdracht)*

`REFERENCES` heeft precies één ingang. Een sedan of pickup toevoegen betekent nu
een nieuw blad tracen. `ARCHETYPES` heeft ook maar één ingang; `gt_coupe` bestaat
alleen als naam in de testset en valt stilletjes terug op `super_gt`.

Dit is het kernprobleem, en het heeft een spanning in zich: de tabellen zijn
precies waarom de auto er goed uitziet. De oplossing is niet ze weggooien, maar
ze **afleidbaar** maken — een curvegrammatica met benoemde controlepunten die de
DNA plaatst, waarbij de bestaande tabellen de ijkzaak worden: de gegenereerde
curve voor de sportwagen-DNA moet de getraceerde tabel binnen een tolerantie
reproduceren. Dat is meetbaar, en die meting wordt de regressietest.

### P2 — Geen deellaag: 319 geometries voor 53 onderdelen

Vier wielen bouwen elk hun eigen velg, band, schijf en klauw. Geen instancing,
geen gedeelde geometrie, geen LOD. 7216 driehoeken aan wielen waarvan 5412
duplicaat.

### P3 — `buildVehicle` is 1194 regels rechte lijn

Alles deelt één closure met lokale variabelen (`B`, `d`, `M`, `shell`, `patch`,
`fRef`, ...). Er is geen scheiding tussen proportie, body, panelen, wielen,
interieur en details. Een tweede voertuigfamilie zou het hele blok moeten
kopiëren — precies wat de opdracht verbiedt.

### P4 — De DNA is een platte zak afgeleide getallen, geen designtaal

`generateDNA` leest ranges uit `ARCHETYPES` en rekent stations uit. De
"design language" is één blok ternaries op `isS`. Er is geen laag waarin
*aggressive*, *elegant* of *rugged* meerdere onderdelen tegelijk logisch
verschuift. Zonder die laag wordt elke nieuwe familie weer handwerk.

### P5 — `_grid` roept elk oppervlak vijf keer per vertex aan

Voor de normaal worden vier extra monsters op ±1/900 genomen. Bij 56 031
vertices zijn dat ~280 000 evaluaties van functies die zelf curvelookups en
bisecties doen. Dat is het grootste deel van de 606 ms bouwtijd.

### P6 — `qualityGate` is 1295 regels en zit vast aan deze auto

De grootste functie in het bestand. Waardevol (21 controles die me deze sessie
meerdere keren voor fouten hebben behoed), maar vol aannames die alleen voor een
fastback-GT kloppen. Moet per voertuigfamilie configureerbaar worden.

### Wat *geen* probleem is

**Het damage-systeem is al ongeveer wat de opdracht vraagt.** Continue schade
0..4 per Part, vertexdeformatie op een bewaarde kopie, vertexkleur voor krassen,
losraken bij 4, bandtoestanden, glasgedrag. Total loss verandert het
mesh-aantal niet (319 voor en na) en kost 3 ms. Er is geen geometrieduplicatie
om op te ruimen. De enige echte winst zit in de broad-phase: `applyImpact` loopt
nu alle 319 meshes langs per inslag. Dat staat laag op de lijst.

---

## 3. Roadmap

Volgorde volgt de opdracht: eerst de sportwagen en de architectuur, dan pas
families. Elke stap is af als hij gemeten is en de bestaande controles
(QC 21/21, geometrie ok in beide paden, symmetrie 0 mm, 18/80 zaden) ongewijzigd
zijn.

| # | Stap | Waarom | Meetbaar aan |
|---|---|---|---|
| 1 | **Draw calls: banden samenvoegen** ✔ | 413 -> 319 meshes, 368 -> 274 calls, beeld pixelidentiek | draw calls, pixeldiff |
| 2 | **Gedeelde wiel-geometrie** ✔ | 76 -> 28 wielmeshes, 274 -> 226 calls, bouwtijd 606 -> 434 ms, pixelidentiek | geometries, geheugen |
| 3 | `_grid` goedkoper ✗ gemeten en afgewezen | rasternormalen: 370 -> 170 ms maar 30 639 pixels verschoven (plooien in de flank smaller dan een cel); voorwaartse differenties: -54 ms, nog 18 878 pixels | bouwtijd, pixeldiff |
| 4 | **`buildVehicle` in twaalf stages met één `ctx`** ✔ | mechanisch gesplitst op de sectiemarkeringen, 38 grensoverschrijdende namen via ctx, 0 pixels verschil | regels per functie, geen gedragsverandering |
| 5 | **Vehicle DNA-laag** ✔ | acht karakterassen, regels per proportie, kwaliteitspoort schuift mee; neutraal = 0 pixels verschil, alle acht presets QC 21/21 | zichtbare variatie bij vaste seed |
| 6 | **Curvegrammatica** ✔ | de vijf tabellen uit ~45 benoemde controles; geijkt op de GT: silhouet gemiddeld 4,6 mm (max 16), plan 2,4 mm, belt 1,5 mm - het niveau van de tracering zelf (1 px ≈ 10 mm). `?grammar=1` bouwt de GT uit de grammatica: QC 21/21, geometrie ok, visueel niet te onderscheiden | afwijking t.o.v. de getraceerde tabellen |
| 7 | **Kwaliteitspoort per familie** ✔ | `deriveGate`: uit de eigen ranges van de familie (24 neutrale builds, +15% spreiding, vloer per eenheid); designtaal uit een `design`-blok op het archetype | 21 controles blijven zinvol |
| 8 | **Familie: sedan** ✔ | één archetypeblok (~70 regels), geen enkele stage gedupliceerd. Daarvoor generiek gemaakt: achterportieren (`doors: 4` splitst de flank bij de B-stijl, eigen ruit per deur, B-stijl, jambs en naadstrips), motorkapventilatie optioneel. Drie zaden QC 21/21, geometrie ok, symmetrie 0 mm | hoeveel nieuwe regels? |
| 9 | Familie: **SUV** | hoge body, andere stance | idem |
| 10 | Familie: **pickup** | cabine + losse laadbak: eerste echte structuurtest | idem |
| 11 | Familie: **van** / **truck** | verticale achterkant, andere cabinearchitectuur | idem |

**Afbreekregel** (uit de opdracht, en ik houd me eraan): als een nieuwe familie
veel duplicaatcode nodig heeft, stop ik en verbeter eerst de architectuur.

### Later, niet nu

Op de lijst, expliciet nog niet ingepland: LOD-generatie, exportpijplijn,
trim levels, aandrijflijnvarianten, procedurele wieldesigns, lichtsignaturen als
eigen familie, modulaire interieurs. Die hebben pas waarde als 5 t/m 11 staan.

---

## 4. Nieuwe designregels die ik wil voorstellen

Alleen regels met een aanwijsbare visuele of technische reden. Nog niet gebouwd.

- **Shoulder-line families** — `hoog en gespannen` (sport), `laag en recht`
  (sedan), `zwaar en hoekig` (pickup/truck). De schouderlijn bepaalt nu al de
  hele flank via `B.shoulderY`; hem als familie benoemen kost weinig en
  onderscheidt voertuigtypes onmiddellijk.
- **Greenhouse families** — `fastback`, `notchback`, `two-box`, `forward-cab`.
  Dit is de parameter die een sedan van een hatchback van een van scheidt; alles
  eromheen kan gedeeld blijven.
- **Bumper-architecturen** — `clamshell` (huidig: neus loopt door tot de
  wielkast), `split` (aparte bumper met eigen naad), `truck` (losse stalen
  bumper). De naadlogica die ik deze sessie heb gerepareerd is precies het
  gereedschap dat dit mogelijk maakt.
- **Wielkast-families** — `flush`, `flared`, `cladding` (SUV/pickup: zwarte
  kunststof rand). `B.archLip` bestaat al; er is één parameter nodig.
- **Lichtsignaturen als aparte laag** — nu zit de vorm van de koplamp vast aan
  het archetype. Als signatuur en behuizing gescheiden zijn, kan elke familie
  elke signatuur dragen.

---

## 5. Werkwijze

Inspect -> Plan -> Implement -> Generate -> Test -> Compare -> Optimize.
Na elke stap: renderen, meten, de vier controles draaien, en de grootste
resterende fout eerst. Geen tien wijzigingen zonder tussentijdse test.

## 6. Openstaand van vóór deze opdracht

Onveranderd, en niet vergeten: het paneel rond de koplamp, spikkels in het
lampinterieur, 2,24 mm restasymmetrie in de grille, en de naadspleet onder de
achterruit waar bij scherende hoek de rolbeugel zichtbaar is.
