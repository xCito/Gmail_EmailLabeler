class LabelEmailMap {
  constructor() {
    this.map = new Map();
  }

  /*
    [STRING] label = 'THE_LABEL' 
    
    [OBJECT] emailObj = {
      id : 'gmail message id',
      from : 'name@domain.com',
      subject : 'The email subject',
      body : 'The email body'
    }
  */
  add(label , emailObj) {
    if(this.map.has(label)) {
      this.map.get(label).push(emailObj);
    } else {
      this.map.set(label, [emailObj]);
    }
  }

  show() {
    this.map.forEach( (val, key) => {
      console.log('Key: ' + key);
      for(let e of val) {
        console.log('\t%o'+e);
      }
      console.log("\n");
    });
  }
}