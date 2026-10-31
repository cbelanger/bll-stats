#!/usr/bin/env python3
"""Génère la feuille papier « BLL - Statistiques - Saisie - Match.pdf » (fiches/). Utilisation (racine du dépôt) : python tools/fiches/generer_saisie.py
Prérequis : pip install -r requirements.txt"""
from pathlib import Path
RACINE = Path(__file__).resolve().parents[2]
LOGO = str(RACINE / "assets" / "logo-bll.png")
SORTIE = RACINE / "fiches"
SORTIE.mkdir(exist_ok=True)
from reportlab.lib.pagesizes import letter, landscape
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white
from reportlab.lib.utils import ImageReader
NAVY=HexColor("#16336B"); RED=HexColor("#D7192D"); LIGHT=HexColor("#E3EEFB"); LINE=HexColor("#8FA9D0"); GREY=HexColor("#9AA8BF")
W,H=landscape(letter); M=20
c=canvas.Canvas(str(SORTIE / "BLL - Statistiques - Saisie - Match.pdf"),pagesize=(W,H))
c.setTitle("BLL Élite – Statistiques – Saisie – Match")
def txt(s,x,y,size=9,bold=False,col=NAVY):
    c.setFillColor(col); c.setFont("Helvetica-Bold" if bold else "Helvetica",size); c.drawString(x,y,s)
def ctxt(s,x,y,size=8,bold=False,col=NAVY):
    c.setFillColor(col); c.setFont("Helvetica-Bold" if bold else "Helvetica",size); c.drawCentredString(x,y,s)
def section(num,title,x,ytop,w,h,sub=None):
    c.setStrokeColor(NAVY); c.setLineWidth(1.3); c.setFillColor(white); c.roundRect(x,ytop-h,w,h,5,1,1)
    c.setFillColor(NAVY); c.roundRect(x,ytop-18,w,18,5,0,1); c.rect(x,ytop-18,w,7,0,1)
    c.setFillColor(RED); c.rect(x,ytop-18,20,18,0,1)
    txt(num,x+6.5,ytop-13,10,True,white); txt(title,x+27,ytop-13,10,True,white)
    if sub: txt(sub,x+27+c.stringWidth(title,"Helvetica-Bold",10)+6,ytop-13,7.5,False,white)
def grid(x,y,n,cols,cw,ch,start=1,fs=7.5):
    rows=(n+cols-1)//cols
    c.setStrokeColor(LINE); c.setLineWidth(0.6)
    for i in range(n):
        r,k=divmod(i,cols); cx=x+k*cw; cy=y-(r+1)*ch
        if (r%2)==1: c.setFillColor(HexColor("#F3F7FD")); c.rect(cx,cy,cw,ch,0,1)
        c.rect(cx,cy,cw,ch,1,0); ctxt(str(i+start),cx+cw/2,cy+ch/2-2.6,fs,col=GREY)
    return y-rows*ch

# En-tête
c.setFillColor(NAVY); c.rect(0,H-50,W,50,0,1); c.setFillColor(RED); c.rect(0,H-53,W,3,0,1)
c.setFillColor(white); c.roundRect(M,H-48,70,46,5,0,1)
c.drawImage(ImageReader(LOGO),M+4,H-46,width=62,height=42,preserveAspectRatio=True,mask='auto')
txt("STATISTIQUES – SAISIE – MATCH",M+84,H-32,19,True,white)
c.saveState(); rcx,rcy=W-48,H-25; c.setLineCap(1)
for dy,ln,col,lw in [(8,18,RED,2.4),(2,28,white,1.8),(-4,23,RED,2.4),(-9,15,white,1.6)]:
    c.setStrokeColor(col); c.setLineWidth(lw); c.line(rcx-32-ln,rcy+dy-0.1*ln,rcx-29,rcy+dy)
c.translate(rcx,rcy); c.rotate(18); c.scale(0.82,0.82)
for col,(a,b,cc,d) in [("#0B1E45",(-33,-20,35,18)),("#1E6FD9",(-34,-18,34,18)),("#5FA8F5",(-30,-12,30,16)),("#1E6FD9",(-27,-11,27,13))]:
    c.setFillColor(HexColor(col)); c.ellipse(a,b,cc,d,0,1)
c.setFillColor(NAVY); c.ellipse(-18,-6,18,7,0,1); c.setStrokeColor(white); c.setLineWidth(2); c.arc(-30,-14,30,16,95,55)
c.restoreState()

# Infos
y=H-72
def box(x,y,s=10): c.setStrokeColor(NAVY); c.setLineWidth(1); c.rect(x,y,s,s)
txt("Équipe :",M,y,10,True); box(M+50,y-1.5); txt("U16AA",M+64,y,10,True); box(M+108,y-1.5); txt("U19AA",M+122,y,10,True)
c.setStrokeColor(NAVY); c.setLineWidth(0.7)
txt("Adversaire :",M+185,y,10,True); c.line(M+250,y-3,M+540,y-3)
txt("Date :",M+556,y,10,True); c.line(M+590,y-3,W-M,y-3)
y2=y-20
txt("Heure début :",M,y2,10,True); c.line(M+74,y2-3,M+150,y2-3)
txt("Heure fin :",M+170,y2,10,True); c.line(M+227,y2-3,M+303,y2-3)
txt("Resp. stats :",M+330,y2,10,True); c.line(M+398,y2-3,W-M,y2-3)
c.setFillColor(LIGHT); c.roundRect(M,H-122,W-2*M,20,4,0,1)
txt("Grilles : barrer le PROCHAIN numéro à chaque événement — le dernier numéro barré = le total.   Fin de période : tracer un trait épais après la dernière case barrée.",M+8,H-115,8.4,True)

LW=420; RX=M+LW+10; RW=W-M-RX; top=H-130
# 1. Tirs cadrés
cw=(LW-16-46)/10; ch=15.5
h1=18+8+2*(5*ch+6)+4
section("1","TIRS CADRÉS",M,top,LW,h1,"(tir qui aurait pu entrer sans la gardienne, ou qui finit par un but)")
gy=top-24
for lab in ["NOUS","ADV."]:
    txt(lab,M+8,gy-5*ch/2-3,10,True,RED if lab=="ADV." else NAVY)
    gy=grid(M+54,gy,50,10,cw,ch)-6
# 2. Buts
top2=top-h1-8; bcw=(LW-16-46)/15; h2=18+8+2*(17+5)+2
section("2","BUTS",M,top2,LW,h2)
gy=top2-24
for lab in ["NOUS","ADV."]:
    txt(lab,M+8,gy-12,10,True,RED if lab=="ADV." else NAVY); gy=grid(M+54,gy,15,15,bcw,17,fs=8)-5
# 3. Sorties de zone
top3=top2-h2-8; scw=(LW-16-46)/25; sch=15; h3=18+8+2*(2*sch+5)+2
section("3","SORTIES DE ZONE",M,top3,LW,h3,"(réussie = sortie en contrôle ou passe complétée)")
gy=top3-24
for lab,col in [("RÉUSSIES",NAVY),("RATÉES",RED)]:
    txt(lab,M+8,gy-sch-3,8.2,True,col); gy=grid(M+54,gy,50,25,scw,sch,fs=6.3)-5
# 5. Notes
top5=top3-h3-8; h5=top5-M
section("5","NOTES RAPIDES",M,top5,LW,h5)
c.setStrokeColor(LINE); c.setLineWidth(0.5); ly=top5-36
while ly>M+6: c.line(M+8,ly,M+LW-8,ly); ly-=17

# 4. Buts accordés
h4=top-M; section("4","BUTS ACCORDÉS",RX,top,RW,h4)
legend=[("P","Pick/écran"),("T","Triangle"),("L","Tir de loin"),("R","Rebond"),("E","Échappée"),("D","Déviation"),("FC","Fille de coin"),("A","Autre")]
c.setFillColor(LIGHT); c.roundRect(RX+8,top-50,RW-16,26,4,0,1)
lx=RX+14
for i,(k,v) in enumerate(legend):
    xx=lx+(i%4)*82; yy=top-34-(i//4)*11
    txt(k,xx,yy,8.5,True,RED); txt(v,xx+(14 if len(k)>1 else 9),yy,7.6)
tx=RX+8; tw=RW-16; ty=top-58
cols=[("But",28),("Pér.",40),("Temps",56),("Type",44),("Zone : X (filet vu de face)",tw-28-40-56-44)]
xs=[tx]
for _,w in cols: xs.append(xs[-1]+w)
c.setFillColor(LIGHT); c.rect(tx,ty-14,tw,14,0,1)
for (lab,w),x0 in zip(cols,xs): ctxt(lab,x0+w/2,ty-10,8,True)
N=12; rh=(ty-14-(M+8))/N
c.setStrokeColor(LINE); c.setLineWidth(0.6)
for n in range(N):
    ry=ty-14-(n+1)*rh
    c.setStrokeColor(LINE); c.setLineWidth(0.5); c.line(tx,ry,tx+tw,ry)
    ctxt(str(n+1),xs[0]+14,ry+rh/2-3.5,10,True)
    # mini filet
    nw,nh=74,rh-8; nx=xs[4]+(cols[4][1]-nw)/2; ny=ry+4
    c.setStrokeColor(GREY); c.setLineWidth(0.4); c.setDash(1.5,1.5)
    for k in (1,2): c.line(nx+k*nw/3,ny,nx+k*nw/3,ny+nh); c.line(nx,ny+k*nh/3,nx+nw,ny+k*nh/3)
    c.setDash(); c.setStrokeColor(RED); c.setLineWidth(1.8)
    c.line(nx,ny,nx,ny+nh); c.line(nx,ny+nh,nx+nw,ny+nh); c.line(nx+nw,ny+nh,nx+nw,ny)
c.setStrokeColor(LINE); c.setLineWidth(0.7); c.rect(tx,ty-14-N*rh,tw,N*rh+14)
for x0 in xs[1:-1]: c.line(x0,ty-14-N*rh,x0,ty)
c.save()
