Keybase build speciale per SferaIT

Necessario avere installata la versione ufficiale 5.3

cd /YOUR_KEYBASE_SOURCECODE_PATH
cd shared
yarn modules
yarn --check-files
yarn build-prod
yarn package

andare in Applications e copiare Keybase.app in Keybase-SferaIT.app (conservare la versione originale)

andare in 

/YOUR_KEYBASE_SOURCECODE_PATH/keybase-client/shared/desktop/release/darwin-x64/Keybase-darwin-x64/

Click destro su Keybase.app -> mostra contenuto pacchetto

entrare in Contents/Resources/app/desktop

all'interno ci sarà una cartella "dist", copiarla

Andare su Keybase-SferaIT.app

Click destro su Keybase-SferaIT.app -> mostra contenuto pacchetto

entrare in Contents/Resources/app/desktop

ELIMINARE la cartella "dist" e incollare quella appena copiata

avviare