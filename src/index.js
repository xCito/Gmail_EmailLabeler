const {getAuth, google} = require('./gmailAuth');
const fs = require('fs');
const auth = getAuth();


//////////////////////////////////////////////////////////////////////


fetchAndSaveEmails();



//////////////////////////////////////////////////////////////////////


async function fetchAndSaveEmails() {
  console.log("START\n");
  
//*
  // Gets emails
  let emails = await getEmails2(auth, 30);

  // Save emails to json file
  console.log("Writing emails to file...");
  fs.writeFileSync('Emails.json', JSON.stringify(emails, null, 2), (err) => {
    console.log("It didnt work :( 1");
    console.log(err);
  });
//*/

/*
  let labels = await getLabelList(auth);
  for(let lab of labels) {
    console.log(lab.id + ' = ' + lab.name);
  }


//*/

  console.log("END\n");
}


// -----------------------------------------------------------------


///////////////////////////////////////////////////
//    Getting the email from GMAIL using API     //
//        Extracting out of API response         //
///////////////////////////////////////////////////

/** 
*  Makes a fetch request to retrieve a list of 
*  labels from the GMAIL API
*/
async function getLabelList(auth) {
  const gmail = google.gmail({version: 'v1', auth});

  return await gmail.users.labels.list({userId: 'me'})
  .then( (res) => {
    const labels = res.data.labels;
    return labels;
  })
  .catch((err) => {
    console.log("Didnt work...");
    console.log(err);  
  }); 
}

// -----------------------------------------------------------------

/*
  Gets the emails from the PRIMARY category of your gmail. First
  by fetching the email Ids of the emails in that category, then
  fetching the email content by id.

  Only Label, From, Subject, and Body(modified) fields are returned.

  Returns: {Array of Object}
  [
    {
      label: [],
      from: '',
      subject: '',
      body: '',
    },
  ]
*/
async function getEmails( auth, numEmails ) {
  const gmail = google.gmail({version: 'v1', auth});
  let result = []; 
  
  // Fetch email ids
  console.log("Fetching email IDs...");
  await gmail.users.messages.list( { userId: 'me', maxResults: numEmails, q: 'label:Finance' } )
  .then( async (resp) => {
    console.log("Fetching email content by IDs...");
    for(let elemId of resp.data.messages) {

      // Fetch email by id
      await gmail.users.messages.get( { userId: 'me', id: elemId.id} )              
      .then( (res) => { 
        let e = {};
        e.labels = getLabels(res);
        e.from = getFrom(res);
        e.subject = getSubject(res);
        e.body = removeHTML(getBody(res));
        result.push(e);     
        //result.push(res);      
      
      })
      .catch( (err) => console.log('Couldnt fetch this email by ID\n' + err));
    }
  })
  .catch( (err) => console.log("Could not fetch email ids\n" + err) );

  return result;
}

// -----------------------------------------------------------------

async function getEmails2( auth, numEmails, query = 'category:primary' ) {
  const gmail = google.gmail({version: 'v1', auth});
  let result = []; 
  let messageIds = [];
  let options = { userId: 'me', maxResults: numEmails, q: query };
  let counter = 0;

  let firstCallDone = false;
  let nextToken = undefined;

  console.log("Fetching message ids...");
  // Fetch email ids
  do {
    if(firstCallDone) {
      options['pageToken'] = nextToken;
    }
    await gmail.users.messages.list(options)
    .then(resp => {
      for(let obj of resp.data.messages) {
        messageIds.push(obj.id);
      }
      nextToken = resp.data.nextPageToken;
      firstCallDone = true;
      console.log("\treceived ids...");
    })
    .catch( err => console.log(err));

    if(messageIds.length >= numEmails) 
      nextToken = undefined;

  } while(nextToken);

  console.log("Fetching emails by ids...");
  for(let id of messageIds) {
    
    // Fetch email by id
    gmail.users.messages.get( { userId: 'me', id: id} )              
    .then( (res) => { 
      let e = {};
      e.labels = getLabels(res);
      e.from = getFrom(res);
      e.subject = getSubject(res);
      e.body = getBody(res);
      e.bodyClean = removeHTML(e.body);
      result.push(e);    
      console.log("\tRecieved email.." + counter);
      counter++;    
      //console.log(JSON.stringify(res, null, 2));
    })
    .catch( (err) => console.log('Couldnt fetch this email by ID\n' + err));
    await sleep(20);
  }
  await sleep(1000);
  return result;
}

function sleep(ms){
  return new Promise(resolve=>{
      setTimeout(resolve,ms)
  });
}
// -----------------------------------------------------------------

/**
 * Searches for the From field of email
 * @param {Object} gmailRespEmail 
 * @return {String} the Name and/or email address of sender
 *                  or '__Not Found'
 */
function getFrom( gmailRespEmail ) {
  for(let h of gmailRespEmail.data.payload.headers) {
    if(h.name === 'From')
      return h.value;
  }
  return '__Not Found';
}

// -----------------------------------------------------------------

/**
 * Searches for the Subject field of email
 * @param {Object} gmailRespEmail 
 * @return {String} the 'subject' or '__Not Found'
 */
function getSubject( gmailRespEmail ) {
  for(let h of gmailRespEmail.data.payload.headers) {
    if(h.name === 'Subject') {
      if(h.value === 'Updated Excel sheet') {
        console.log(JSON.stringify(gmailRespEmail.data, null, 2));
      }
      return h.value;
    }
  }
  return '__Not Found'; 
}

// -----------------------------------------------------------------

/**
 * Gets the body portion(s) out of GMAIL API
 * google.gmail.users.messages.get() response.
 * @param {Object} gmailRespEmail 
 * @return {String} body content of email or 
 *                  '__Not Found'
 */
function getBody( gmailRespEmail ) {
  let result = '';
  try {
    if(gmailRespEmail.data.payload.body.data) 
    { 
      result += Buffer.from(gmailRespEmail.data.payload.body.data, 'base64').toString();
    } 
    else if(gmailRespEmail.data.payload.parts) 
    {
      for(let p of gmailRespEmail.data.payload.parts) {
        if(p.body.data) {
          result += Buffer.from(p.body.data, 'base64');
        } 
        else if(p.parts) {
          for(let innerPart of p.parts) {
            if(innerPart.body.data !== undefined) {
              result += Buffer.from(innerPart.body.data, 'base64');
            }
          } 
        }
      }
    }
  }
  catch(err) {
    console.log(err);
    //console.log(JSON.stringify(gmailRespEmail.data, null, 2));
  }
  return (result === '') ? '__Not Found' : result;

}

// -----------------------------------------------------------------

/**
 * Gets the labels associated with email
 * @param {Object} email 
 * @return {Array} of strings
 */
function getLabels( gmailRespEmail ) {
  return gmailRespEmail.data.labelIds;
}

// -----------------------------------------------------------------

/*
  Removes the everything between the style tags
  Removes the html tags (Ex: div, tr, td, body)
  Shrinks excessive new lines and spaces.
  bodyStr {String}
*/
function removeHTML( bodyStr ) {

  let styleRegex = /<style.*>[\w\s\W\d_]+<\/style>/gi;
  let htmlRegex = /<\/?[a-zA-Z0-9\W_]+?\/?>/gi;
  let extraSpaceRegex = /\s{2,}/g;
  let htmlEntities = /&[\w]+;/g;
  let wordAndNum = /(?=\w*[a-z])(?=\w*[0-9])\w+/g;
  
  let temp = bodyStr.replace(/[\n\r]/g, ' ');     // remove all new lines
  temp = temp.replace(styleRegex, '');            // remove style tags and its contents
  temp = temp.replace(htmlRegex, '');             // remove html tags
  temp = temp.replace(htmlEntities, '');          // remove html entities
  temp = temp.replace(extraSpaceRegex, ' ');      // shrink excessive spaces
  temp = temp.replace(wordAndNum, '');

  return temp;
}

