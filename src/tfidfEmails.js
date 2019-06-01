const WordPos = require('wordpos');
const natural = require('natural');
const fs = require('fs');
let TfIdf = natural.TfIdf;
const tfidf = new TfIdf();

///////////////////////////////////////////////////////////////////

let emails = JSON.parse(fs.readFileSync('Emails.json'));  // array
let groups = groupByLabel(emails);

// fs.writeFileSync('groupEmail.json', JSON.stringify(groups, null, 2), err => console.log(err));


// -----------------------------------------------------------------

/**
 * IGNORES emails with certain labels
 * @param {Object} emails 
 */
function groupByLabel( emails ) {
  let groups = {};
  
  for(let email of emails) {
    for(let label of email.labels) {

      // Testing
      if( label.match(/CATEGORY_UPDATES|IMPORTANT|CATEGORY_PERSONAL|INBOX|CATEGORY_FORUMS|STARRED|CATEGORY_PROMOTIONS|UNREAD|SENT/g) )
        continue;

      if(!groups[label]) {
        groups[label] = [email];
      } else {
        groups[label].push(email);
      }
    }
  }
  return groups;
}

