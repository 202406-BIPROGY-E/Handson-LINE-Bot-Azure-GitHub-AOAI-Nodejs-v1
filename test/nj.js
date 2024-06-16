const { execFile } = require('child_process');
const util = require('util');

// promisifyを使ってexecFileをPromise形式に変換
const execFileAsync = util.promisify(execFile);

// Pythonスクリプトを実行する関数
async function runPythonScript(arg1) {
  try {
    const { stdout, stderr } = await execFileAsync('python3', ['./search.py',arg1]);
    if (stderr) {
      console.error(`stderr: ${stderr}`);
    }
    console.log(`stdout: ${stdout}`);
  } catch (error) {
    console.error(`execFile error: ${error}`);
  }
}

runPythonScript("`Dog`クラスに`fetch`メソッドがないエラーを解消するには、どうしたらいいですか？");