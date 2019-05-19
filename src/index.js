const {getAuth, google} = require('./gmailAuth');
const WordPos = require('wordpos');
const auth = getAuth();

const wordpos = new WordPos();
let ignoreSet = new Set(['the', ' ', 'a', 'it', 'has',]);
/*
  Makes a fetch request to retrieve a list of 
  labels from the GMAIL API
*/
function getLabelList(auth) {
  const gmail = google.gmail({version: 'v1', auth});

  let promise = gmail.users.labels.list({userId: 'me'}); 
  promise.then( (res) => {
    const labels = res.data.labels;
    labels.forEach((label) => console.log(label) );
  });
  promise.catch((err) => {
    console.log("Didnt work...");
    console.log(err);  
  }); 
}

/*
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
// async function getEmails2( auth, numEmails ) {   NOT GOOD IDEA
//   const gmail = google.gmail({version: 'v1', auth});

//   // Fetch email ids
//   return await gmail.users.messages.list( { userId: 'me', maxResults: numEmails, q: 'category:primary' } )
//   .then( (resp) => {

//     // Collect all fetch promises
//     let allPromises = [];
//     for(let elemId of resp.data.messages) {
//       let p = gmail.users.messages.get( { userId: 'me', id: elemId.id} );
//       allPromises.push( p );
//     }
//     let d = gmail.users.messages.get( { userId: 'me', id: 1} );
//     allPromises.push( d );

//     return Promise.all( allPromises );
//   })  // All resolved fetches come here
//   .then( (arrRes) => {
//     let result = [];
//     for(let r of arrRes) {
//       let e = {
//         labels   : getLabels(r),
//         from     : getFrom(r),
//         subject  : getSubject(r),
//         body     : removeHTML(getBody(r))
//       };
//       result.push(e);
//     }
//     return result;
//   })
//   .catch((err) => console.log('something didnt work' + err));
// }


async function getEmails( auth, numEmails ) {
  const gmail = google.gmail({version: 'v1', auth});
  let result = []; 
  
  // Fetch email ids
  await gmail.users.messages.list( { userId: 'me', maxResults: numEmails, q: 'category:primary' } )
  .then( async (resp) => {
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
      })
      .catch( (err) => console.log('Couldnt fetch this email by ID\n' + err));
    }
  })
  .catch( (err) => console.log("Could not fetch email ids\n" + err) );

  return result;
}

/**
 * @param {Object} emails 
 */
function groupByLabel( emails ) {
  let groups = {};
  
  for(let email of emails) {
    for(let label of email.labels) {
      if(!groups[label]) {
        groups[label] = [email];
      } else {
        groups[label].push(email);
      }
    }
  }
  return groups;
}

function countEveryWordOccurence( string ) {
  let counter = {};
  let wordArr = string.split(/[\s\W\d]+/gi);
  console.log(wordArr);
  for(let word of wordArr) {
    let wordLower = word.toLowerCase();
    if(counter[wordLower]) {
      counter[wordLower]++;
    } else {
      counter[wordLower] = 1;
    }
  }

  return counter; 
}

////////////////////////////////////////////////////////////////

async function start() {
  console.log("START\n");
  let emails = await getEmails( auth, 10 );
  groupByLabel(emails);

  console.log(emails[1].body + "\n\n" );
  wordpos.getNouns(emails[1].body, (result) => {
    console.log(result);
  });
  //console.log("---> " + emails[0].body);
  // let output = countEveryWordOccurence(emails[1].body);
  // console.log(output);


  console.log("END\n");
}


////////////////////////////////////////////////////////////////

start();

////////////////////////////////////////////////////////////////
 
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

/**
 * Searches for the Subject field of email
 * @param {Object} gmailRespEmail 
 * @return {String} the 'subject' or '__Not Found'
 */
function getSubject( gmailRespEmail ) {
  for(let h of gmailRespEmail.data.payload.headers) {
    if(h.name === 'Subject')
      return h.value;
  }
  return '__Not Found'; 
}

/**
 * Gets the body portion(s) out of GMAIL API
 * google.gmail.users.messages.get() response.
 * @param {Object} gmailRespEmail 
 * @return {String} body content of email or 
 *                  '__Not Found'
 */
function getBody( gmailRespEmail ) {
  if(gmailRespEmail.data.payload.body.data) {
    return Buffer.from(gmailRespEmail.data.payload.body.data, 'base64').toString();
  } else if(gmailRespEmail.data.payload.parts) {
    let result = '';
    for(let p of gmailRespEmail.data.payload.parts) {
      if(p.body.data) {
        result += Buffer.from(p.body.data, 'base64');
      }
    }

    return (result === '') ? '__Not Found' : result;
  }
}

/**
 * Gets the labels associated with email
 * @param {Object} email 
 * @return {Array} of strings
 */
function getLabels( gmailRespEmail ) {
  return gmailRespEmail.data.labelIds;
}


/*
  Removes the everything between the style tags
  Removes the html tags (Ex: div, tr, td, body)
  Shrinks excessive new lines and spaces.
  bodyStr {String}
*/
function removeHTML( bodyStr ) {
  let styleRegex = /<style.*>[\w\n\s\W\d]+<\/style>/gi;
  let htmlRegex = /<\/?(?:[a-zA-Z0-9$+\'\s%@=|!\]\[)(#\"?,_/.;:&-]+)?\/?>/gi;
  let extraLineRegex = /[\n\r]{3,}/g;
  let extraSpaceRegex = /\s{4,}/g;
  
  let temp = bodyStr.replace(styleRegex, '');     // remove style tags and its contents
  temp = temp.replace(htmlRegex, '');             // remove html tags
  temp = temp.replace(extraLineRegex, '\n\n');    // shrink excessive new lines
  return temp.replace(extraSpaceRegex, ' ');      // shrink excessive spaces
}

