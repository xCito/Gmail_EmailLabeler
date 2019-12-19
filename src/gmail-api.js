const fs = require('fs');
const open = require('open');       
const http = require('http');

const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const CRED_PATH = '../secret_keys/client_id.json';
const TOKEN_PATH = '../secret_keys/token.json';
const gmail = google.gmail('v1');


class GmailApi {
    contructor() {
        this.server = null;
        this.tempSocket = null;
    }
    
    async authenticate() {
        new Promise( (resolve, reject) => {
            let cred = this.getCredentialsFromFile( CRED_PATH );
            console.log(cred);
            this.auth = new google.auth.OAuth2( cred );
            console.log(this.auth);
            this.getTokenFromFile( TOKEN_PATH )
            .then( token => {
                console.log(token);
                this.auth.setCredentials( token );
                google.options({ auth: this.auth });
                console.log('authentication complete!');
                resolve();
            })
            .catch( err => reject(err));
        });
    }

    getCredentialsFromFile( filePath ) {
        let credentials = JSON.parse(fs.readFileSync( filePath ));
        let clientId = credentials.installed.client_id;
        let clientSecret = credentials.installed.client_secret;
        let redirectUri = credentials.installed.redirect_uris[1];

        return {clientId, clientSecret, redirectUri};
    }

    async getTokenFromFile( filePath ) {
        let needNewToken = true;
        let reason = 'token file not found';
        if(fs.existsSync( filePath )) {
            needNewToken = false;
            let token = JSON.parse(fs.readFileSync( filePath ));
            let dateInMillis = token['expiry_date'];
            console.log(dateInMillis);
            console.log(Date.now());
            if(Date.now() > dateInMillis) {
                reason = 'token is expired';
                needNewToken = true;
            }
        } 

        if(needNewToken) {
            console.log(reason);
            return await this.getNewToken();
        }

        console.log('reading token from file');
        return JSON.parse(fs.readFileSync(filePath));   
    }
    
    async getNewToken() {
        await new Promise( (resolve, reject) => {
            
            const authUrl = this.auth.generateAuthUrl({
                access_type: 'offline',
                scope: SCOPES,
            });
            console.log('This is the url to get your authentication code: ');
            console.log(authUrl);
            console.log();
            open(authUrl, {wait: true});
            
            this.tokenReceiverServer()
            .then( authCode => {
                console.log('got this code');
                console.log(authCode);
                console.log();

                return this.auth.getToken( authCode );
            })
            .then( res => { 
                console.log('got this google auth token');
                console.log(res.tokens);
                console.log();
                return res.tokens;
            })
            .then( tokens => {
                console.log('writing tokens to file...');
                fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 4));
                console.log('writing to file done');
                resolve(tokens);
            })
            .catch( err => {
                console.log(err);
                reject(err);
            });
        });
    }

    tokenReceiverServer() {
        return new Promise( (resolve, reject) => {
            this.server = http.createServer( );
            this.server.on('connection', (socket) => {
                this.server.close();
                this.tempSocket = socket;
                console.log('got a connection!');
            });
            this.server.on('request', (req, res) => {
                this.tempSocket.destroy( err => {console.log(err)});
                console.log('Just got a request...');
                console.log(req.url);
                let re = new RegExp(/code=(?<code>.+)&/, 'gi');
                let result = re.exec(req.url).groups.code;
                console.log('received code!');
                console.log('>   ' + result + '   <');
                
                res.end("Thank you!");
                resolve(result);
            });
            this.server.on('close', () => {
                console.log('server closed!');
            })
            this.server.listen(3000);
                console.log('listening on port 3000...');
            });
    }

    getLabels() {
        new Promise( (resolve, reject) => {
            let promise = gmail.users.labels.list({userId: 'me'});

            promise.then( res => {
                console.log(res.data.labels); 
                resolve(res.data.labels);
            })
            .catch( err => { 
                console.log(err);
                reject(err);
            });
        });
    }

}   // close class


const gmailapi = new GmailApi();

gmailapi.authenticate()
.then( () => {
    return gmailapi.getLabels();
})
.then( arrLabels => {
    console.log(arrLabels);
})



module.exports = {
  GmailApi: GmailApi,
  google: google
};

