
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const TOKEN_PATH = '../secret_keys/token.json';
const CRED_PATH = '../secret_keys/credentials.json';

let credentials;
let auth;
let token;


function getGmailAuthentication() {
  if( !auth ) {
    credentials = getCredentials();
    auth = authorize( credentials );
    token = getToken(auth);
    
    return auth;
  }
  return auth;
}


// First, get the credentials
function getCredentials() {
  let content = JSON.parse(fs.readFileSync( CRED_PATH )); 
  let client_id = content.installed.client_id; 
  let client_secret = content.installed.client_secret; 
  let redirect_uri = content.installed.redirect_uris[0];
  
  let c = {client_id, client_secret, redirect_uri};

  return c;
}

// Second, pass credentials for authentication
function authorize (credentials) { 
  const oAuth2Client = new google.auth.OAuth2(
    credentials.client_id, 
    credentials.client_secret, 
    credentials.redirect_uri);

  return oAuth2Client;
}

// Third, set token for authentication
function getToken( auth ) {
  let content;
  try {
    content = fs.readFileSync(TOKEN_PATH);
  } catch(err) {
    console.log('Couldnt read/find ' + TOKEN_PATH);
    console.log("Attempting to get a new token");
    content = getNewToken(auth);
  }
  let token = JSON.parse(content);
  auth.setCredentials( token ); 
  return token;  
}

function getNewToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
    });
  });
}

module.exports = {
  getAuth: getGmailAuthentication,
  google: google
};

