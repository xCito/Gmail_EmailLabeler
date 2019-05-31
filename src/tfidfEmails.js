const WordPos = require('wordpos');
const natural = require('natural');
const fs = require('fs');
let TfIdf = natural.TfIdf;
const tfidf = new TfIdf();

const classifier = new natural.BayesClassifier();
///////////////////////////////////////////////////////////////////

let emails = JSON.parse(fs.readFileSync('Emails.json'));  // array
let groups = groupByLabel(emails);

fs.writeFileSync('groupEmail.json', JSON.stringify(groups, null, 2), err => console.log(err));
var flight = 'Label_10';
var payment = 'Label_7';
var order = 'Label_5';

console.log(groups[flight].length);
console.log(groups[payment].length);
console.log(groups[order].length);

for(let i=0; i<6; i++) {
  console.log(i);
  classifier.addDocument(groups[flight][i].body, 'flight');
}
for(let i=0; i<6; i++) {
  classifier.addDocument(groups[payment][i].body, 'payment');
}

classifier.train();

let r1 = classifier.classify(groups[flight][6].body);
let r2 = classifier.classify(groups[payment][6].body);

console.log(r1 +"\n" + groups[flight][6].body);
console.log(r2 + "\n" + groups[payment][6].body);

//console.log(classifier);

/*
let label = 'Label_7';
for(let i=0; i<groups[label].length; ++i) {
  let doc = groups[label][i].body;
  doc += groups[label][i].subject;
  doc += groups[label][i].from;
  tfidf.addDocument(doc);
}
*/

/*
for(let label in groups) {
  let doc = '';
  for(let i=0; i<groups[label].length; ++i) {
    doc += groups[label][i].body + ' ';
  }
  
  tfidf.addDocument(doc);
}
*/
/*
tfidf.listTerms(4).forEach(function(item) {
    console.log(item.term + ': ' + item.tfidf);
});
*/

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

