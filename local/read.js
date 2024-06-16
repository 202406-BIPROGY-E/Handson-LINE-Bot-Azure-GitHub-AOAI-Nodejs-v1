const { exec } = require('child_process');

let setting = '1';
let title = 'default_title';
let question = 'default_question';
let number = 'default_number';
let command = `python3 syncQuery.py ${setting} "${title}" "${question}" ${number} `;
 
showAll()
function showAll(){
  setting='1';
  command=`python3 syncQuery.py ${setting} "${title}" "${question}" ${number} `
 
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
    const obj = JSON.parse(stdout);
    title = obj.title;
    question = obj.question;
    console.log([title[0],question[0]]);
  });
  
}