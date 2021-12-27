# WeBeep Sync
<img style="float: right;" src="https://imgur.com/13XOo2U.png" width="100px" />

[![donate](https://shields.io/badge/donate-paypal-blue)](https://www.paypal.com/donate/?hosted_button_id=JXRZNQKNHYJ2Y)

* vuoi solo scaricare l'app? vai ai [download](#Download)

WeBeep Sync è una semplice app che serve per tenere sincronizzati tutti i tuoi file di WeBeep.

Sto sviluppando quest'app come strumento ad uso personale, ma ho pensato potesse essere utile ad 
altri studenti, perciò è completamente opensource e gratuita.

### Perché?
È stata pensata come un sostituto a [PoliBeepSync](https://github.com/Jacotsu/polibeepsync/) visto
che non sarebbe stato aggiunto il supporto per WeBeep.
Molte persone si sono adattate all'utilizzo di 
[Moodle Downloader 2](https://github.com/C0D3D3V/Moodle-Downloader-2) (che è un'ottima soluzione e 
potrebbe essere più adatta per diversa gente!) ma volevo avere una soluzione un po' più definitiva,
completa e user friendly.

### A cosa serve?
Proprio come PoliBeepSync, serve per tenere sincronizzati i propri file di WeBeep in una cartella
locale sul proprio PC. Se vuoi un'esperienza senza pensieri, puoi lasciare che l'app si apra in
background e puoi scegliere ogni quanto avverranno le sincronizzazioni, così da avere sempre tutti i
file aggiornati. Oppure puoi disattivare l'autosync e scaricare tutti i file in una volta sola
quando preferisci.

<img src="https://imgur.com/LcoT3q1.png" />

## Download
Nelle release di Github puoi trovare l'app già impacchettata e pronta da usare per Windows e macOS
(sia x64 che M1)
### [Ultima Release](https://github.com/toto04/webeep-sync/releases/latest)

Puoi usare i seguenti link per scaricare direttamente la versione più adatta a te

### Windows
#### [Installer x64](https://github.com/toto04/webeep-sync/releases/latest/download/WeBeep.Sync.Windows.Setup.zip)

### macOS
#### [dmg arm64 (M1 o superiore)](https://github.com/toto04/webeep-sync/releases/latest/download/WeBeep.Sync.macOS-arm64.dmg)
#### [dmg x64 (Intel)](https://github.com/toto04/webeep-sync/releases/latest/download/WeBeep.Sync.macOS-x64.dmg)

#### "WeBeep Sync" è danneggiato e non può essere aperto. Come risolvere?

Per colpa del fatto che non ho un account da sviluppatore con cui firmare un certificato perché
costa troppo, macOS considera il file come proveniente da uno sviluppatore non indentificato e
blocca l'avvio.

Per ovviare a questa lieve inconvenienza, bisogna manualmente dare i permessi di esecuzioni all'app.
Per fare ciò, _una volta spostato WeBeep Sync nella cartella Applicazioni_, apri il terminale e
incolla queto comando
```sh
sudo xattr -rd com.apple.quarantine /Applications/WeBeep\ Sync.app
```
e dovrebbe tutto funzionare senza problemi

### Linux

Per quanto riguarda linux, sto sviluppando l'app da solo e non uso un granché Linux desktop, quindi
non ho (ancora) provato a fare un packaging, anche perché alcune delle funzioni di Electron sono OS
specific, e non sarebbero supportate, ma il funzionamento core dell'app dovrebbe funzionare seguendo
l'installazione manuale

### Installazione manuale
Prerequisiti:
* [git](https://git-scm.com)
* [NodeJS](https://nodejs.org) (v16)
* [Yarn](https://yarnpkg.com/getting-started/install)

Per prima cosa clona la repository
```sh
git clone https://github.com/toto04/webeep-sync && cd webeep-sync
```
poi installa le dependencies
```sh
yarn
```
e infine l'app può essere avviata con
```sh
yarn start
```
oppure puoi creare un package pronto all'installazione con
```sh
yarn make
```

Per maggiori informazioni, dai un'occhiata agli script in ```package.json``` e alla documentazione 
della CLI di [Electron Forge](https://www.electronforge.io/cli)

## Informazioni sull'app
L'app è stata su [Electron](https://www.electronjs.org) usando 
[Typescript](https://www.typescriptlang.org) e [React](https://it.reactjs.org).

È stata creata usando [Electron Forge](https://www.electronforge.io/) ed è pubblicata con la licenza
MIT.

Se vuoi aiutare lo sviluppo dell'app proponendo bug-fixes o nuove feature, puoi aprire una 
[issue](https://github.com/toto04/webeep-sync/issues/new).

Per qualsiasi altra informazione, spero che i commenti che ho lasciato in giro siano abbastanza
chiari, altrimenti c'è sempre l'indirizzo email del poli a cui posso essere contattato.

Oppure se trovia particolarmente utile l'app, puoi offrirmi un caffè dondomi qualche spicciolo su
PayPal (che magari così chissà che potrei anche arrivare a permettermi un account da sviluppatore
Apple 🤷‍♂️)

[<img src="https://imgur.com/XurCPDg.png" width=200 />](https://www.paypal.com/donate/?hosted_button_id=JXRZNQKNHYJ2Y)

## Features
* scarica tutti i file da WeBeep con un solo click nella cartella che preferisci
* puoi selezionare quali dei tuoi corsi sincronizzare
* puoi configurare l'app per rimanere aperta in background, e impostare ogni quanto fare un autosync
* puoi scegliere di avviare l'app al login, silenziosamente per assicurarti di avere sempre i file
aggiornati
* puoi selezionare tra tema chiaro e scuro
* voglio dire è un'app per scaricare dei file non so quante funzioni puoi avere
* non so più cosa inventarmi come "features", cioè scaricala e vedi, al massimo la cancelli se non 
ti piace idk

### In futuro
* dovrei aggiungere anche l'internalizzazione, adesso ho scritto tutto in inglese un po' a cazzo
* quando mai potrò arrivare a permettermi dei certificati, vorrei aggiungere l'opzione di mettere
auto update, per il momento ogni aggiornamento deve essere scaricato manualmente da GitHub