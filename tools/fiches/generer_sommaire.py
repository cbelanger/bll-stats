#!/usr/bin/env python3
"""Génère le PDF remplissable « BLL - Statistiques - Sommaire - Match.pdf » (fiches/). Utilisation (racine du dépôt) : python tools/fiches/generer_sommaire.py
Prérequis : pip install -r requirements.txt"""
from pathlib import Path
RACINE = Path(__file__).resolve().parents[2]
LOGO = str(RACINE / "assets" / "logo-bll.png")
SORTIE = RACINE / "fiches"
SORTIE.mkdir(exist_ok=True)
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.utils import ImageReader

NAVY=HexColor("#16336B"); RED=HexColor("#D7192D"); LIGHT=HexColor("#E3EEFB"); LINE=HexColor("#9DB6DA"); TXT=HexColor("#16336B")
W,H=letter; M=22
c=canvas.Canvas(str(SORTIE / "BLL - Statistiques - Sommaire - Match.pdf"),pagesize=letter)
c.setTitle("BLL Élite – Statistiques – Sommaire – Match"); c.setAuthor("BLL Élite")
f=c.acroForm
FS=dict(borderColor=LINE, fillColor=white, textColor=black, borderWidth=0.8, fontName="Helvetica", fontSize=10)

from reportlab.lib.colors import transparent
def tf(name,x,y,w,h,multi=False,fs=10,tip=None):
    kw=dict(FS); kw['fontSize']=10 if multi else fs
    if multi:
        kw['fillColor']=transparent
        c.saveState(); c.setFillColor(white); c.rect(x,y,w,h,stroke=0,fill=1)
        c.setStrokeColor(LINE); c.setLineWidth(0.5)
        ly=y+h-18
        while ly>y+4:
            c.line(x+6,ly,x+w-6,ly); ly-=18
        c.restoreState()
    f.textfield(name=name,tooltip=tip or name,x=x,y=y,width=w,height=h,
                fieldFlags='multiline' if multi else '',**kw)
def cb(name,x,y,size=11,checked=False,tip=None):
    f.checkbox(name=name,tooltip=tip or name,x=x,y=y,size=size,buttonStyle='check',
               borderColor=NAVY,fillColor=white,textColor=NAVY,borderWidth=1,checked=checked)
def txt(s,x,y,size=9.5,bold=False,col=TXT,font=None):
    c.setFillColor(col); c.setFont(font or ("Helvetica-Bold" if bold else "Helvetica"),size); c.drawString(x,y,s)
def section(num,title,x,ytop,w,h,small=None):
    c.setStrokeColor(NAVY); c.setLineWidth(1.4); c.setFillColor(white)
    c.roundRect(x,ytop-h,w,h,5,stroke=1,fill=1)
    c.setFillColor(NAVY); c.roundRect(x,ytop-20,w,20,5,stroke=0,fill=1); c.rect(x,ytop-20,w,8,stroke=0,fill=1)
    c.setFillColor(RED); c.rect(x,ytop-20,22,20,stroke=0,fill=1)
    txt(str(num),x+7,ytop-15,11,True,white); txt(title,x+30,ytop-14.5,11,True,white)
    if small: txt(small,x+30+c.stringWidth(title,"Helvetica-Bold",11)+4,ytop-14.5,7,True,white)

# ---------- En-tête
c.setFillColor(NAVY); c.rect(0,H-62,W,62,stroke=0,fill=1)
c.setFillColor(RED); c.rect(0,H-66,W,4,stroke=0,fill=1)
c.setFillColor(white); c.roundRect(M,H-60,92,56,6,stroke=0,fill=1)
c.drawImage(ImageReader(LOGO),M+4,H-58,width=84,height=52,preserveAspectRatio=True,mask='auto')
# Anneau de ringuette (haut à droite)
from reportlab.lib.colors import HexColor as HC
c.saveState()
rcx,rcy=W-50,H-31
c.setLineCap(1)
for dy,ln,col,lw in [(9,22,RED,2.6),(3,34,white,2),(-3,28,RED,2.6),(-9,18,white,1.8)]:
    c.setStrokeColor(col); c.setLineWidth(lw); c.line(rcx-38-ln,rcy+dy-0.1*ln,rcx-34,rcy+dy)
c.translate(rcx,rcy); c.rotate(18)
c.setFillColor(HC("#0B1E45")); c.ellipse(-33,-20,35,18,stroke=0,fill=1)
c.setFillColor(HC("#1E6FD9")); c.ellipse(-34,-18,34,18,stroke=0,fill=1)
c.setFillColor(HC("#5FA8F5")); c.ellipse(-30,-12,30,16,stroke=0,fill=1)
c.setFillColor(HC("#1E6FD9")); c.ellipse(-27,-11,27,13,stroke=0,fill=1)
c.setFillColor(NAVY); c.ellipse(-18,-6,18,7,stroke=0,fill=1)
c.setStrokeColor(white); c.setLineWidth(2); c.arc(-30,-14,30,16,95,55)
c.restoreState()
txt("STATISTIQUES – SOMMAIRE – MATCH",M+108,H-38,17.5,True,white)

# ---------- Infos
y=H-90
txt("Équipe :",M,y,10.5,True); cb("equipe_U16AA",M+50,y-2); txt("U16AA",M+65,y,10.5,True)
cb("equipe_U19AA",M+110,y-2); txt("U19AA",M+125,y,10.5,True)
txt("Adversaire :",300,y,10.5,True); tf("adversaire",365,y-5,W-M-365,17)
y-=26
txt("Date :",M,y,10.5,True); tf("date",M+38,y-5,150,17,tip="Date (AAAA-MM-JJ)")
yh=y-24
txt("Heure début :",M,yh,10.5,True); tf("heure_debut",M+76,yh-5,60,17,tip="Heure de début (HH:MM)")
txt("Heure fin :",M+150,yh,10.5,True); tf("heure_fin",M+208,yh-5,60,17,tip="Heure de fin (HH:MM)")
txt("No de match :",300,yh,10.5,True); tf("no_match",378,yh-5,70,17,fs=11,tip="Numéro du match (tel qu’à l’horaire de la ligue)")
txt("Responsable des stats :",300,y,10.5,True); tf("responsable",428,y-5,W-M-428,17)

colw=(W-2*M-10)/2; LX=M; RX=M+colw+10
top=H-162

# ---------- 1. Stats générales
h1=214; section(1,"STATISTIQUES GÉNÉRALES",LX,top,colw,h1)
tx=LX+8; ty=top-28; c1=110; c2=(colw-16-c1)/2
c.setFillColor(LIGHT); c.rect(tx,ty-16,colw-16,16,stroke=0,fill=1)
txt("Statistique",tx+4,ty-11.5,9,True); txt("Notre équipe",tx+c1+8,ty-11.5,9,True); txt("Équipe adverse",tx+c1+c2+6,ty-11.5,9,True)
for i,(lab,key) in enumerate([("Buts marqués / accordés","buts"),("Tirs cadrés (auto)","tirs")]):
    ry=ty-16-(i+1)*24
    txt(lab,tx+4,ry+8,9,True)
    tf(f"{key}_nous",tx+c1+4,ry+3,c2-8,18,fs=12); tf(f"{key}_adv",tx+c1+c2+4,ry+3,c2-8,18,fs=12)
c.setStrokeColor(LINE); c.setLineWidth(0.6); c.rect(tx,ty-64,colw-16,64)
# Tirs cadrés par période
py=ty-80; txt("Tirs cadrés par période",tx+4,py,9,True)
pw=colw-16; lw0=46; per=["P1","P2","P3","P4","Prol."]; pcw=(pw-lw0)/len(per)
hy=py-6; c.setFillColor(LIGHT); c.rect(tx,hy-14,pw,14,stroke=0,fill=1)
for j,p in enumerate(per):
    c.setFillColor(TXT); c.setFont("Helvetica-Bold",8.5); c.drawCentredString(tx+lw0+j*pcw+pcw/2,hy-10,p)
for i,(lab,key) in enumerate([("Nous","nous"),("Adv.","adv")]):
    ry=hy-14-(i+1)*21
    txt(lab,tx+6,ry+7,9,True)
    for j,p in enumerate(per):
        tf(f"tirs_{key}_{p.strip('.').lower()}",tx+lw0+j*pcw+3,ry+3,pcw-6,16,fs=11,tip=f"Tirs cadrés {lab} – {p}")
c.setStrokeColor(LINE); c.setLineWidth(0.6); c.rect(tx,hy-14-42,pw,56)
c.setFillColor(LIGHT); c.roundRect(tx,top-h1+6,colw-16,30,4,stroke=0,fill=1)
txt("Tir cadré : tir qui aurait pu entrer dans le but sans l’intervention",tx+5,top-h1+25,7.4,col=NAVY)
txt("de la gardienne, ou tir qui se termine par un but.",tx+5,top-h1+14,7.4,col=NAVY)

# ---------- 3. Sorties de zone
top3=top-h1-10; h3=118; section(3,"SORTIES DE ZONE RÉUSSIES",LX,top3,colw,h3)
c.setFillColor(LIGHT); c.roundRect(tx,top3-66,colw-16,40,4,stroke=0,fill=1)
for k,l in enumerate(["Réussie si l’équipe sort l’anneau de sa zone défensive en",
                      "conservant le contrôle ou par une passe complétée à une",
                      "coéquipière."]):
    txt(l,tx+5,top3-37-k*10,7.8)
for i,(lab,key) in enumerate([("Tentatives de sortie de zone :","sz_tentatives"),("Sorties de zone réussies :","sz_reussies")]):
    ry=top3-88-i*24; txt(lab,tx+4,ry+5,9,True); tf(key,LX+colw-78,ry,62,18,fs=12)

# ---------- 6. Notes
top6=top3-h3-10; h6=top6-M; section(4,"OBSERVATIONS ET NOTES",LX,top6,colw,h6)
tf("notes",tx,M+8,colw-16,h6-36,multi=True)

# ---------- 2. Buts accordés (une ligne par but)
rx=RX+8; iw=colw-16; h2=top-M
section(2,"BUTS ACCORDÉS – DÉTAIL PAR BUT",RX,top,colw,h2)
txt("Gardienne :",rx,top-35,9.5,True); f.choice(name="gardienne",tooltip="Gardienne – choisir dans la liste ou taper un autre nom",value=" ",
         x=rx+62,y=top-40,width=iw-62,height=17,options=[" ","Frédérique Bélanger #30","Stella Ouellet #28"],
         fieldFlags="combo edit",borderColor=LINE,fillColor=white,textColor=black,borderWidth=0.8,fontName="Helvetica",fontSize=10)
# Schéma du but (référence pour les zones)
txt("Vue de face du but – les numéros s’affichent seuls",rx,top-48,7.6,True,col=NAVY)
gw=iw-16; gh=99; gx=rx+8; gy=top-56-gh
c.setStrokeColor(RED); c.setLineWidth(4.5); c.line(gx,gy,gx,gy+gh); c.line(gx,gy+gh,gx+gw,gy+gh); c.line(gx+gw,gy+gh,gx+gw,gy)
c.setStrokeColor(NAVY); c.setLineWidth(0.7); c.setDash(3,2)
for k in (1,2): c.line(gx+k*gw/3,gy,gx+k*gw/3,gy+gh); c.line(gx,gy+k*gh/3,gx+gw,gy+k*gh/3)
c.setDash()
zones=[["HG","HC","HD"],["CG","C","CD"],["BG","BC","BD"]]
noms=[["Haut gauche","Haut centre","Haut droite"],["Centre gauche","Centre","Centre droite"],["Bas gauche","Bas centre","Bas droite"]]
for r in range(3):
    for k in range(3):
        cx=gx+k*gw/3+gw/6; cy=gy+gh-(r+0.5)*gh/3
        cyt=gy+gh-r*gh/3
        c.setFillColor(NAVY); c.setFont("Helvetica-Bold",7.5); lab=zones[r][k]
        c.drawString(gx+k*gw/3+5,cyt-9.5,lab)
        c.setFont("Helvetica",6); c.drawString(gx+k*gw/3+5+c.stringWidth(lab,"Helvetica-Bold",7.5)+3,cyt-9.5,noms[r][k])
        f.textfield(name=f"zone_{lab}",tooltip=f"Buts dans la zone {lab} (automatique)",x=gx+k*gw/3+4,y=cyt-gh/3+2,
                    width=gw/3-8,height=gh/3-14,borderWidth=0,borderColor=None,fillColor=transparent,
                    textColor=RED,fontName="Helvetica",fontSize=0,fieldFlags="readOnly")
# Tableau
cols=[("But",26),("Pér.",38),("Temps",46),("Type de jeu",iw-26-38-46-46),("Zone",46)]
ty=gy-12; N=15; LEG=106; rh=(ty-16-(M+8)-LEG-10)/N
c.setFillColor(LIGHT); c.rect(rx,ty-16,iw,16,stroke=0,fill=1)
xs=[rx]; 
for _,w in cols: xs.append(xs[-1]+w)
for (lab,w),x0 in zip(cols,xs): txt(lab,x0+4,ty-11.5,8.8,True)
LEGENDE=[("P","Pick / tir après écran ou action de blocage"),("T","Entrée dans le triangle"),("L","Tir de loin"),("R","Rebond"),
         ("E","Échappée / joueuse seule devant la gardienne"),("D","Déviation"),("FC","Fille de coin"),("A","Autre (préciser à la section 4)")]
types=[" "]+[f"{k} – {v.split(' (')[0] if k=='A' else v}" for k,v in LEGENDE]
types=[" ","P – Pick / écran","T – Triangle","L – Tir de loin","R – Rebond","E – Échappée","D – Déviation","FC – Fille de coin","A – Autre"]
def dd(name,x,y,w,opts,fs=9,tip=None):
    f.choice(name=name,tooltip=tip or name,value=" ",x=x,y=y,width=w,height=16,options=opts,fieldFlags="combo",
             borderColor=LINE,fillColor=white,textColor=black,borderWidth=0.6,fontName="Helvetica",fontSize=fs)
for n in range(1,N+1):
    ry=ty-16-n*rh
    txt(str(n),rx+9 if n<10 else rx+6,ry+rh/2-3.5,9.5,True)
    dd(f"but_{n}_periode",xs[1]+3,ry+(rh-16)/2,cols[1][1]-6,[" ","1","2","3","4","Prol."],tip=f"But {n} – période")
    tf(f"but_{n}_temps",xs[2]+3,ry+(rh-16)/2,cols[2][1]-6,16,fs=9.5,tip=f"But {n} – temps (mm:ss)")
    dd(f"but_{n}_type",xs[3]+3,ry+(rh-16)/2,cols[3][1]-6,types,fs=8.5,tip=f"But {n} – type de jeu")
    dd(f"but_{n}_zone",xs[4]+3,ry+(rh-16)/2,cols[4][1]-6,[" ","HG","HC","HD","CG","C","CD","BG","BC","BD"],tip=f"But {n} – zone")
    c.setStrokeColor(LINE); c.setLineWidth(0.4); c.line(rx,ry,rx+iw,ry)
tbot=ty-16-N*rh
c.setLineWidth(0.6); c.rect(rx,tbot,iw,ty-tbot)
for x0 in xs[1:-1]: c.line(x0,tbot,x0,ty)
lb=M+8; c.setFillColor(LIGHT); c.roundRect(rx,lb,iw,LEG,4,stroke=0,fill=1)
txt("Codes – type de jeu",rx+6,lb+LEG-13,8.8,True)
for i,(k,v) in enumerate(LEGENDE):
    yy=lb+LEG-27-i*10
    txt(k,rx+8,yy,8.6,True,col=RED); txt(v,rx+26,yy,8)
c.save()

# ---------- Post-traitement : calculs Acrobat (totaux des tirs cadrés)
from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, DictionaryObject, TextStringObject, ArrayObject, BooleanObject, NumberObject
OUT=str(SORTIE / "BLL - Statistiques - Sommaire - Match.pdf")
r=PdfReader(OUT); w=PdfWriter(); w.append(r)
af=w._root_object["/AcroForm"]
refs={f.get_object()["/T"]:f for f in af["/Fields"]}
def js(code): return DictionaryObject({NameObject("/S"):NameObject("/JavaScript"),NameObject("/JS"):TextStringObject(code)})
per=["p1","p2","p3","p4","prol"]
for side in ["nous","adv"]:
    for p in per:
        o=refs[f"tirs_{side}_{p}"].get_object()
        o[NameObject("/AA")]=DictionaryObject({NameObject("/K"):js('AFNumber_Keystroke(0,0,0,0,"",true);')})
    tot=refs[f"tirs_{side}"].get_object()
    code=("var s=0,n=0,p=[%s];for(var i=0;i<p.length;i++){var v=this.getField('tirs_%s_'+p[i]).valueAsString;"
          "if(v!==''){s+=Number(v);n++;}}event.value=(n?s:'');") % (",".join(f"'{x}'" for x in per),side)
    tot[NameObject("/AA")]=DictionaryObject({NameObject("/C"):js(code)})
    tot[NameObject("/Ff")]=NumberObject(int(tot.get("/Ff",0))|1)  # lecture seule
    tot[NameObject("/TU")]=TextStringObject(f"Total calculé automatiquement (somme des périodes)")
for t in ["buts_nous","buts_adv","sz_tentatives","sz_reussies"]:
    refs[t].get_object()[NameObject("/AA")]=DictionaryObject({NameObject("/K"):js('AFNumber_Keystroke(0,0,0,0,"",true);')})
EXCL={"gardienne","adversaire","date","responsable","observations_generales","notes","note_buts_accordes"}
for t,ref in refs.items():
    o=ref.get_object()
    if o.get("/FT")=="/Btn" or t in EXCL or t.endswith("_type"): continue
    o[NameObject("/Q")]=NumberObject(1)
od=refs["date"].get_object()
od[NameObject("/AA")]=DictionaryObject({NameObject("/F"):js('AFDate_FormatEx("yyyy-mm-dd");'),
                                        NameObject("/K"):js('AFDate_KeystrokeEx("yyyy-mm-dd");')})
od[NameObject("/TU")]=TextStringObject("Date du match (AAAA-MM-JJ) – cliquer pour ouvrir le calendrier")
for hf in ["heure_debut","heure_fin"]:
    oh=refs[hf].get_object()
    oh[NameObject("/AA")]=DictionaryObject({
        NameObject("/K"):js(r"if(!event.willCommit){event.rc=/^[0-9:hH]*$/.test(event.change);}"),
        NameObject("/V"):js(r"var v=event.value.replace(/[hH]/,':');if(v!==''){var m=v.match(/^(\d{1,2}):?(\d{2})$/);"
                            r"if(m&&Number(m[1])<24&&Number(m[2])<60){event.value=(m[1].length<2?'0':'')+m[1]+':'+m[2];}"
                            r"else{app.alert('Heure invalide. Format attendu : HH:MM (ex. 19:30)');event.rc=false;}}")})
om=refs["no_match"].get_object()
om[NameObject("/AA")]=DictionaryObject({NameObject("/K"):js(r"if(!event.willCommit){event.rc=/^[0-9A-Za-z\-]*$/.test(event.change);}")})
ZON=["HG","HC","HD","CG","C","CD","BG","BC","BD"]
for n in range(1,16):
    o=refs[f"but_{n}_zone"].get_object(); o[NameObject("/Ff")]=NumberObject(int(o.get("/Ff",0))|(1<<26))
for z in ZON:
    o=refs[f"zone_{z}"].get_object()
    o[NameObject("/AA")]=DictionaryObject({NameObject("/C"):js(
        "var a=[];for(var i=1;i<=15;i++){var f=this.getField('but_'+i+'_zone');if(f&&f.valueAsString==='%s')a.push(i);}event.value=a.join(', ');" % z)})
af[NameObject("/CO")]=ArrayObject([refs["tirs_nous"],refs["tirs_adv"]]+[refs[f"zone_{z}"] for z in ZON])
af[NameObject("/NeedAppearances")]=BooleanObject(True)
w.write(OUT)
