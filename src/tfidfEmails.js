const WordPos = require('wordpos');
const natural = require('natural');
const fs = require('fs');
let TfIdf = natural.TfIdf;
const tfidf = new TfIdf();
const wordpos = new WordPos();


const stopWordsArr = ["a", "re:", "fw:", "about", "above", "after", "again", "against", "ain", "all", "am", "an", "and", "any", "are", "aren", "aren't", "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can", "couldn", "couldn't", "d", "did", "didn", "didn't", "do", "does", "doesn", "doesn't", "doing", "don", "don't", "down", "during", "each", "few", "for", "from", "further", "had", "hadn", "hadn't", "has", "hasn", "hasn't", "have", "haven", "haven't", "having", "he", "her", "here", "hers", "herself", "him", "himself", "his", "how", "i", "if", "in", "into", "is", "isn", "isn't", "it", "it's", "its", "itself", "just", "ll", "m", "ma", "me", "mightn", "mightn't", "more", "most", "mustn", "mustn't", "my", "myself", "needn", "needn't", "no", "nor", "not", "now", "o", "of", "off", "on", "once", "only", "or", "other", "our", "ours", "ourselves", "out", "over", "own", "re", "s", "same", "shan", "shan't", "she", "she's", "should", "should've", "shouldn", "shouldn't", "so", "some", "such", "t", "than", "that", "that'll", "the", "their", "theirs", "them", "themselves", "then", "there", "these", "they", "this", "those", "through", "to", "too", "under", "until", "up", "ve", "very", "was", "wasn", "wasn't", "we", "were", "weren", "weren't", "what", "when", "where", "which", "while", "who", "whom", "why", "will", "with", "won", "won't", "wouldn", "wouldn't", "y", "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves", "could", "he'd", "he'll", "he's", "here's", "how's", "i'd", "i'll", "i'm", "i've", "let's", "ought", "she'd", "she'll", "that's", "there's", "they'd", "they'll", "they're", "they've", "we'd", "we'll", "we're", "we've", "what's", "when's", "where's", "who's", "why's", "would"]

const stopWords = new Set(stopWordsArr);

///////////////////////////////////////////////////////////////////

let emails = JSON.parse(fs.readFileSync('Emails.json'));  // array
let groups = groupByLabel(emails);


// Add up to 10 emails of each label to a doc.
function termThings(groups) {
  let keys = Object.keys(groups);
  
  for(let key of keys) {
    let doc = '';
    for(let i=0; i<10; i++) {
      if(groups[key][i]) {
        let body = groups[key][i].bodyClean;
        body = body.toLowerCase();
        body = body.replace(/\b\d+\b/gi);
        
        doc += body + ' ';
    }
    tfidf.addDocument(doc);
  }

  tfidf.listTerms(0).forEach( (elem) => {
    console.log(elem.term + ": " + elem.tfidf);
  });

  }
}

///////////////////////////////////////////

function getWordDocumentFrequency( arrayOfStringArr ) {
//  [['',''],['','']]
  let words = [];
  let docFreq = {};
  arrayOfStringArr.forEach( arr => words.push(...arr)); // flat()
  words = [...new Set(words)];                          // remove duplicates
  //console.log(JSON.stringify(words, null, 2));

  for(let word of words) { // forEach word
    for(let doc of arrayOfStringArr) {           // forEach doc in documents
      if(!doc.includes(word))             // Not in the document
        continue;
      if(stopWords.has(word))             // if word is a StopWword
        continue;
      if(word.match(/\b(\d+)\b/g))
        continue;

      docFreq[word] = docFreq[word] ? docFreq[word]+1 : 1;
    }
  }
  let obj = {};
  docFreq = Object.entries(docFreq)
            .sort( (a,b) => b[1] - a[1])
            .forEach( (arr)=> { obj[arr[0]] = arr[1] });

  return obj;

}



//termThings(groups);
let trainingData = [];
let keys = Object.keys(groups);

keys.forEach((k, i) => console.log(i + "  " + k));

// For each label
for(let i=0; i<keys.length; ++i) {
  let group = groups[keys[i]];            
  let gElemTokens = [];             

  for(let email of group) {
    gElemTokens.push( tokenizeBody(email.bodyClean));   // add tokenized body field
    gElemTokens.push( tokenizeFrom(email.from));        // add tokenized from field
    gElemTokens.push( tokenizeSubject(email.subject));  // add tokenized subject field
  }

  let wordDocFrequency = getWordDocumentFrequency( gElemTokens ); // get word doc freq. for this label group
  let trainedLabel = {};
  trainedLabel.label = keys[i];                               // hold label name
  trainedLabel.numDoc = group.length;                         // hold number of emails/documents used
  trainedLabel.words = wordDocFrequency;                      // hold word document frequency
  trainedLabel.sum = Object.keys(trainedLabel.words)          // hold score of these words (sum of wdf)
                    .map( key => trainedLabel.words[key] )
                    .reduce( (acc, val) => acc + val);
 
  trainingData.push(trainedLabel);                            // add this label's WDF info
}

fs.writeFileSync('trainingData.json', JSON.stringify(trainingData, null, 2));          // save to file


// -----------------------------------------------------------------

function tokenizeSubject( subjectStr ) {
  let temp = subjectStr.toLowerCase();
  temp = temp.replace(/[\s'"<>]+/g, ' ');
  return temp.split(/\s+/g).filter( str => str.match(/\w+/gi) && str.length > 1);
}

function tokenizeFrom( fromStr ) {
  let temp = fromStr.toLowerCase();
  temp = temp.replace(/['"<>]/g, ' ');
  return temp.split(' ').filter( str => str.length > 1);
}

function tokenizeBody( bodyStr ) {
  let temp = bodyStr.toLowerCase();
  return temp.split(" ").filter( str => { // tokenize email body
    str.match(/[\w]+/g) && str.length > 1;                // filter things along the way
  });
} 

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
