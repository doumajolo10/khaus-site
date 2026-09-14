/* Modelos procedurais de produtos reais (proporções tiradas das fotos de referência). ES module. */
import * as THREE from 'three';
const SEG=160;
const powder=(c,o)=>new THREE.MeshPhysicalMaterial(Object.assign({color:c,metalness:.05,roughness:.38,clearcoat:.5,clearcoatRoughness:.3,envMapIntensity:1.0},o||{}));
const inox=(o)=>new THREE.MeshPhysicalMaterial(Object.assign({color:0xe6e9ec,metalness:1,roughness:.17,envMapIntensity:2.2},o||{}));
const inoxIn=()=>new THREE.MeshPhysicalMaterial({color:0xb9bdc2,metalness:1,roughness:.35,side:THREE.BackSide,envMapIntensity:1.2});
const plastic=(c,o)=>new THREE.MeshPhysicalMaterial(Object.assign({color:c,metalness:0,roughness:.55,clearcoat:.15},o||{}));
const rubber=(c)=>new THREE.MeshPhysicalMaterial({color:c||0x1a1c1e,metalness:0,roughness:.9});
function lathe(pts,seg,mat){ const g=new THREE.LatheGeometry(pts.map(p=>new THREE.Vector2(p[0],p[1])),seg||SEG); g.computeVertexNormals(); return new THREE.Mesh(g,mat); }
function tube(path,r,mat,seg){ return new THREE.Mesh(new THREE.TubeGeometry(path,seg||120,r,24,false),mat); }
function rrectPath(w,h,r,z){ const s=new THREE.CurvePath(); const x0=-w/2,y0=-h/2,x1=w/2,y1=h/2; const v=(x,y)=>new THREE.Vector3(x,y,z||0);
  s.add(new THREE.LineCurve3(v(x0+r,y0),v(x1-r,y0))); s.add(new THREE.QuadraticBezierCurve3(v(x1-r,y0),v(x1,y0),v(x1,y0+r)));
  s.add(new THREE.LineCurve3(v(x1,y0+r),v(x1,y1-r))); s.add(new THREE.QuadraticBezierCurve3(v(x1,y1-r),v(x1,y1),v(x1-r,y1)));
  s.add(new THREE.LineCurve3(v(x1-r,y1),v(x0+r,y1))); s.add(new THREE.QuadraticBezierCurve3(v(x0+r,y1),v(x0,y1),v(x0,y1-r)));
  s.add(new THREE.LineCurve3(v(x0,y1-r),v(x0,y0+r))); s.add(new THREE.QuadraticBezierCurve3(v(x0,y0+r),v(x0,y0),v(x0+r,y0))); return s; }
function rbox(w,h,d,r){ const s=new THREE.Shape(); const x=-w/2,y=-h/2; s.moveTo(x+r,y); s.lineTo(x+w-r,y); s.quadraticCurveTo(x+w,y,x+w,y+r); s.lineTo(x+w,y+h-r); s.quadraticCurveTo(x+w,y+h,x+w-r,y+h); s.lineTo(x+r,y+h); s.quadraticCurveTo(x,y+h,x,y+h-r); s.lineTo(x,y+r); s.quadraticCurveTo(x,y,x+r,y); const g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelThickness:r*.6,bevelSize:r*.6,bevelSegments:6,curveSegments:16}); g.center(); return g; }
export const PROC={};
/* Copo térmico pint 473ml: corpo cônico, borda e base inox, tampa opcional */
PROC.pint=function(col,opt){ opt=opt||{}; const g=new THREE.Group();
  const body=lathe([[.395,.13],[.40,.2],[.43,.6],[.47,1.2],[.505,1.72],[.51,1.78]],SEG,powder(col)); body.userData.body=true;
  const base=lathe([[0,0],[.34,0],[.37,.01],[.385,.05],[.392,.13],[.395,.135],[.40,.135]],SEG,inox());
  const rim=lathe([[.505,1.76],[.515,1.8],[.525,1.9],[.522,1.96],[.5,1.985],[.47,1.99],[.455,1.96],[.45,1.85]],SEG,inox());
  const inner=lathe([[.45,1.85],[.44,1.3],[.41,.6],[.36,.22],[0,.22]],SEG,inoxIn());
  g.add(body,base,rim,inner);
  if(opt.lid){ const lid=lathe([[0,1.97],[.45,1.97],[.475,2.0],[.48,2.04],[.46,2.08],[.38,2.11],[.26,2.13],[.12,2.14],[0,2.14]],SEG,plastic(0x1c1e20,{roughness:.35,clearcoat:.4})); g.add(lid); const slot=new THREE.Mesh(new THREE.BoxGeometry(.26,.02,.08),rubber(0x0a0b0c)); slot.position.set(.17,2.125,.08); slot.rotation.y=-.3; g.add(slot); }
  return g; };
/* Quencher 1,2L: base estreita, degrau, corpo largo, tampa com anel inox, alça e canudo */
PROC.quencher=function(col){ const g=new THREE.Group();
  const body=lathe([[.31,.02],[.33,.04],[.335,.5],[.34,.56],[.40,.62],[.445,.7],[.47,1.2],[.49,1.7],[.495,1.74]],SEG,powder(col)); body.userData.body=true;
  const base=lathe([[0,0],[.29,0],[.31,.02]],SEG,powder(col));
  const ring=lathe([[.49,1.72],[.5,1.76],[.505,1.86],[.49,1.9],[.47,1.91]],SEG,inox());
  const lid=lathe([[0,1.9],[.47,1.9],[.49,1.94],[.5,2.02],[.47,2.06],[.2,2.07],[.19,2.02],[.15,2.0],[0,2.0]],SEG,powder(col,{roughness:.5}));
  const strawHole=lathe([[.06,2.06],[.075,2.06],[.078,2.1],[.06,2.11]],48,plastic(0xf2f2f0)); strawHole.position.x=.22;
  const straw=new THREE.Mesh(new THREE.CylinderGeometry(.038,.038,.9,24),new THREE.MeshPhysicalMaterial({color:0xf4f4f2,roughness:.4,transmission:.35,thickness:.1})); straw.position.set(.22,2.4,0);
  const handle=tube(rrectPath(.46,.95,.14,0),.055,powder(col),160); handle.position.set(.62,1.22,0);
  const hb=new THREE.Mesh(new THREE.BoxGeometry(.16,.9,.16),powder(col)); hb.position.set(.46,1.22,0);
  g.add(body,base,ring,lid,strawHole,straw,handle,hb); return g; };
/* Garrafa IceFlow 650ml */
PROC.iceflow=function(col){ const g=new THREE.Group();
  const body=lathe([[0,0],[.30,0],[.33,.02],[.345,.08],[.35,1.55],[.34,1.62],[.30,1.68],[.27,1.72]],SEG,powder(col)); body.userData.body=true;
  const cap=lathe([[0,1.72],[.27,1.72],[.30,1.76],[.31,1.98],[.29,2.04],[.26,2.06],[0,2.06]],SEG,plastic(col,{roughness:.45}));
  const bite=new THREE.Mesh(new THREE.CylinderGeometry(.05,.06,.14,20),plastic(0xe9e9e6)); bite.position.set(.16,2.12,0);
  const loop=tube(rrectPath(.42,.36,.09,0),.035,plastic(col),120); loop.position.set(0,2.2,0);
  g.add(body,cap,bite,loop); return g; };
/* Guarda-chuva de golfe: 8 gomos, varetas, haste, cabo */
PROC.umbrella=function(col){ const g=new THREE.Group(); const R=1.35;
  const pts=[]; for(let i=0;i<=10;i++){ const t=i/10; pts.push([R*t, .55*(1-t*t)]); }
  const canopy=lathe(pts,96,powder(col,{side:THREE.DoubleSide,roughness:.62,clearcoat:.08,metalness:0})); canopy.userData.body=true;
  for(let i=0;i<8;i++){ const a=i*Math.PI/4+Math.PI/8; const seg=[]; for(let k=0;k<=8;k++){ const t=k/8; seg.push(new THREE.Vector3(Math.cos(a)*R*t,.55*(1-t*t)-.012,Math.sin(a)*R*t)); } g.add(tube(new THREE.CatmullRomCurve3(seg),.008,inox({color:0x9aa0a6}),40)); }
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.022,.022,2.2,20),inox({color:0x2a2c2e,roughness:.35})); shaft.position.y=-.55;
  const tip=new THREE.Mesh(new THREE.CylinderGeometry(.03,.015,.25,16),inox({color:0x2a2c2e})); tip.position.y=.66;
  const grip=new THREE.Mesh(new THREE.CylinderGeometry(.06,.05,.42,24),rubber(0x151617)); grip.position.y=-1.55;
  g.add(canopy,shaft,tip,grip); g.rotation.z=-.42; g.rotation.x=.18; return g; };
/* Caixa térmica 26L: corpo, faixa cinza, tampa, alça arqueada */
PROC.cooler=function(col){ const g=new THREE.Group(); const W=2.0,D=1.35,H=1.5; const gray=0x8d8f8e;
  const body=new THREE.Mesh(rbox(W,H,D,.12),powder(col,{roughness:.5,clearcoat:.15})); body.userData.body=true; body.position.y=H/2;
  const band=new THREE.Mesh(rbox(W+.06,.16,D+.06,.05),plastic(gray)); band.position.y=H-.02;
  const lid=new THREE.Mesh(rbox(W-.16,.22,D-.16,.08),powder(col,{roughness:.5})); lid.position.y=H+.14;
  const lip=new THREE.Mesh(rbox(W-.05,.06,D-.05,.03),plastic(gray)); lip.position.y=H+.03;
  const hpath=new THREE.CatmullRomCurve3([new THREE.Vector3(-W/2-.04,H-.02,0),new THREE.Vector3(-W/2+.1,H+.55,0),new THREE.Vector3(0,H+.75,0),new THREE.Vector3(W/2-.1,H+.55,0),new THREE.Vector3(W/2+.04,H-.02,0)]);
  const handle=tube(hpath,.05,plastic(gray),80);
  const pivot1=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.1,20),plastic(gray)); pivot1.rotation.z=Math.PI/2; pivot1.position.set(-W/2-.04,H-.02,0); const pivot2=pivot1.clone(); pivot2.position.x=W/2+.04;
  const cut=new THREE.Mesh(new THREE.BoxGeometry(.5,.28,.02),rubber(0x0d0e0f)); cut.position.set(-W/2+.32,H*.5,D/2+.005); const cut2=cut.clone(); cut2.position.x=W/2-.32;
  g.add(body,band,lid,lip,handle,pivot1,pivot2,cut,cut2); g.rotation.y=-.35; return g; };
/* Caneca cerâmica 325ml: corpo cilíndrico com leve curva, alça em C, interior */
PROC.mug=function(col){ const g=new THREE.Group(); const cer=powder(col,{roughness:.32,clearcoat:.7,clearcoatRoughness:.2,metalness:0});
  const body=lathe([[0,0],[.44,0],[.48,.02],[.5,.1],[.5,1.3],[.49,1.36],[.47,1.38],[.45,1.36],[.45,.15],[0,.15]],SEG,cer); body.userData.body=true;
  const handle=tube(new THREE.CatmullRomCurve3([new THREE.Vector3(.44,1.05,0),new THREE.Vector3(.72,1.05,0),new THREE.Vector3(.86,.75,0),new THREE.Vector3(.8,.45,0),new THREE.Vector3(.6,.3,0),new THREE.Vector3(.44,.32,0)]),.075,cer,80);
  g.add(body,handle); g.rotation.y=-.9; return g; };
/* Caneta metal touch: corpo emborrachado, anéis cromados, clipe, ponteira touch */
PROC.pen=function(col){ const g=new THREE.Group(); const L=2.2;
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.062,.062,L*.62,48),powder(col,{roughness:.55,clearcoat:.1})); body.userData.body=true; body.position.y=.12;
  const grip=new THREE.Mesh(new THREE.CylinderGeometry(.06,.05,.42,48),inox()); grip.position.y=-.8;
  const tip=new THREE.Mesh(new THREE.ConeGeometry(.05,.22,48),inox()); tip.rotation.x=Math.PI; tip.position.y=-1.11;
  const ring1=new THREE.Mesh(new THREE.CylinderGeometry(.066,.066,.05,48),inox()); ring1.position.y=.81; const ring2=ring1.clone(); ring2.position.y=-.57;
  const top=new THREE.Mesh(new THREE.CylinderGeometry(.06,.062,.16,48),inox()); top.position.y=.9;
  const touch=new THREE.Mesh(new THREE.SphereGeometry(.055,32,24),rubber(0x101112)); touch.position.y=1.02;
  const clip=new THREE.Mesh(rbox(.05,.62,.03,.012),inox()); clip.position.set(.075,.55,0);
  g.add(body,grip,tip,ring1,ring2,top,touch,clip); g.rotation.z=-.75; g.rotation.y=.4; return g; };
/* Chaveiro abridor de alumínio */
PROC.opener=function(col){ const g=new THREE.Group(); const al=powder(col,{roughness:.35,metalness:.6,clearcoat:.2});
  const body=new THREE.Mesh(rbox(.42,1.7,.09,.1),al); body.userData.body=true;
  const hole=new THREE.Mesh(new THREE.TorusGeometry(.13,.045,16,48),al); hole.position.y=-.62; // recorte do abridor (simulado por anel)
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.24,.028,16,64),inox()); ring.position.y=1.05; ring.rotation.x=Math.PI/2*0+0; 
  const eye=new THREE.Mesh(new THREE.TorusGeometry(.07,.03,12,32),al); eye.position.y=.86;
  g.add(body,hole,ring,eye); g.rotation.z=-.35; g.rotation.y=.3; return g; };
/* Caderno ecológico capa kraft com elástico e caneta bambu */
PROC.notebook=function(col){ const g=new THREE.Group();
  const cover=new THREE.Mesh(rbox(1.35,1.85,.05,.04),powder(col,{roughness:.85,clearcoat:0,metalness:0})); cover.userData.body=true; cover.position.z=.13;
  const pages=new THREE.Mesh(new THREE.BoxGeometry(1.3,1.8,.22),new THREE.MeshPhysicalMaterial({color:0xf1ece0,roughness:.95})); pages.position.z=0;
  const back=cover.clone(); back.position.z=-.13; back.userData.body=false;
  for(let i=0;i<14;i++){ const r=new THREE.Mesh(new THREE.TorusGeometry(.075,.012,8,24),inox({color:0x2a2c2e})); r.rotation.y=Math.PI/2; r.position.set(-.68,.85-i*.13,0); g.add(r); }
  const band=new THREE.Mesh(new THREE.BoxGeometry(.06,1.9,.3),rubber(0x151617)); band.position.x=.5;
  g.add(cover,pages,back,band); g.rotation.y=-.5; g.rotation.x=.15; return g; };
/* Cuia térmica inox com bomba */
PROC.cuia=function(col){ const g=new THREE.Group();
  const body=lathe([[0,0],[.36,0],[.4,.03],[.46,.3],[.5,.8],[.48,1.15],[.44,1.3],[.42,1.36],[.4,1.34],[.42,1.1],[.44,.7],[.36,.2],[0,.2]],SEG,powder(col)); body.userData.body=true;
  const erva=new THREE.Mesh(new THREE.CylinderGeometry(.4,.4,.06,48),new THREE.MeshPhysicalMaterial({color:0x5f7a2c,roughness:1})); erva.position.y=1.22;
  const bomba=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,1.7,20),inox()); bomba.position.set(.2,1.85,0); bomba.rotation.z=-.28;
  const boc=new THREE.Mesh(new THREE.CylinderGeometry(.05,.04,.22,20),inox()); boc.position.set(.44,2.65,0); boc.rotation.z=-.28;
  g.add(body,erva,bomba,boc); return g; };
/* Caixa presente rígida com fita */
PROC.giftbox=function(col){ const g=new THREE.Group(); const mat=powder(col,{roughness:.75,clearcoat:.1,metalness:0});
  const box=new THREE.Mesh(rbox(1.9,.75,1.4,.04),mat); box.userData.body=true; box.position.y=.375;
  const lid=new THREE.Mesh(rbox(1.96,.18,1.46,.04),mat); lid.position.y=.84;
  const rib=new THREE.MeshPhysicalMaterial({color:0x5fe0b4,roughness:.5,sheen:.6,sheenColor:0xffffff});
  const r1=new THREE.Mesh(new THREE.BoxGeometry(.16,.96,1.47),rib); r1.position.y=.47; const r2=new THREE.Mesh(new THREE.BoxGeometry(1.97,.96,.16),rib); r2.position.y=.47;
  g.add(box,lid,r1,r2); g.rotation.y=-.6; g.rotation.x=.2; return g; };
/* Squeeze plástico fosco 500ml com tampa e canudo */
PROC.squeeze=function(col){ const g=new THREE.Group(); const mat=new THREE.MeshPhysicalMaterial({color:col,roughness:.5,transmission:.25,thickness:.3,metalness:0});
  const body=lathe([[0,0],[.33,0],[.36,.03],[.37,1.35],[.36,1.42],[.33,1.46]],SEG,mat); body.userData.body=true;
  const cap=lathe([[0,1.46],[.34,1.46],[.37,1.5],[.38,1.68],[.35,1.74],[.3,1.76],[0,1.76]],SEG,plastic(0x1c1e20)); const flip=new THREE.Mesh(rbox(.3,.08,.3,.03),plastic(0x1c1e20)); flip.position.set(0,1.8,.05);
  g.add(body,cap,flip); return g; };
