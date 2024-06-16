'use strict';

const line = require('@line/bot-sdk');
const express = require('express');
const crypto = require("crypto");
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL;
const BASE_PUBLIC_DIR = 'public';

const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");

const { execFile } = require('child_process');
const util = require('util');

// promisifyを使ってexecFileをPromise形式に変換
const execFileAsync = util.promisify(execFile);

// create LINE SDK config from env variables
const config = {
  channelSecret: process.env.CHANNEL_SECRET,
};

// create LINE SDK client
const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN
});
const blobClient = new line.messagingApi.MessagingApiBlobClient({
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
});

// create Express app
// about Express itself: https://expressjs.com/
const app = express();

// serve static and downloaded files
app.use(`/${BASE_PUBLIC_DIR}`, express.static(BASE_PUBLIC_DIR));

// register a webhook handler with middleware
// about the middleware, please refer to doc
app.post('/callback', line.middleware(config), (req, res) => {
  console.log('start');
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// event handler
async function handleEvent(event) {
    const userId = event.source.userId;
  
    if (event.type !== 'message' && event.type !== 'postback') {
      // ignore non-text-message event
      return Promise.resolve(null);
    } else if (event.type === 'postback') {
        const postbackData = event.postback.data;
        if (postbackData === 'Y') {
            return handleYesAction(event);
        } else if (postbackData === 'N') {
            return handleNoAction(event);
        }
      if (event.postback.data === 'sticker') {
        return client.replyMessage({
          replyToken: event.replyToken,
          messages: [{
            type: 'sticker',
            packageId: "11537",
            stickerId: "52002735"
          }]
        });
      }
    
    } else if (event.message.type === 'text') {
      {
        //https://developers.line.biz/ja/reference/messaging-api/#quick-reply
        const key = process.env.AZURE_OPENAI_KEY;
        const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
        const openaiClient = new OpenAIClient(endpoint, new AzureKeyCredential(key));
      
        const deploymentId = process.env.AZURE_OPENAI_DEPLOYMENT_NAME; // model = "deployment name".

        const prompt = `以下の質問を次のフォーマットで出力して
        質問の題名：
        ##########
        コードの要約：
        質問のコード
        ##########
        質問をわかりやすくまとめて
        `;
        const messages = [
          { role: "user", content:event.message.text },
        ];
      
        console.log(`Messages: ${messages.map((m) => m.content).join("\n")}`);
      
        let msg = '';
        const events = await openaiClient.streamChatCompletions(deploymentId, messages, { maxTokens: 1000 });
        for await (const event of events) {
          for (const choice of event.choices) {
            const delta = choice.delta?.content;
            if (delta !== undefined) {
              msg　 += `${delta}`;
              // console.log(`Chatbot: ${delta}`);
            }
          }
        }

        const messages2 = [
          { role: "user", content: "次の質問を100文字以内で要約してください。疑問文で、使用言語とエラーを人がインターネットで検索できるようにしてください。"+msg },
        ];
        let msg2 = '';
        const events2 = await openaiClient.streamChatCompletions(deploymentId, messages2, { maxTokens: 1000 });
        for await (const event of events2) {
          for (const choice of event.choices) {
            const delta = choice.delta?.content;
            if (delta !== undefined) {
              msg2　 += `${delta}`;
              // console.log(`Chatbot: ${delta}`);
            }
          }
        }

        const output = await runPythonScript(msg2);
        return client.replyMessage({
          replyToken: event.replyToken,
          messages: [
            {
              type: 'text',
              text: msg,
            },
            {
              type: 'text',
              text: "関連URL"+"\n"+output,
            },
            {
                type: 'text',
                text: '問題は解決しましたか？',
                "quickReply": {
                    "items": [
                        {
                        "type": 'action',
                        "action": {
                            "type": 'postback',
                            "label": 'Yes',
                            "text": 'Yes',
                        },
                        },
                        {
                        "type": 'action',
                        "action": {
                            "type": 'postback',
                            "label": 'No',
                            "text": 'No',
                        },
                        },
                    ],
                    },
            }
          ]
      });
      }

    }
}

const getStreamData = async (stream)  => {
    return new Promise(resolve => {
      let result = [];
      stream.on("data", (chunk) => {
        result.push(Buffer.from(chunk));
      });
      stream.on("end", () => {
        resolve(result);
      });
    });
}

async function runPythonScript(msg2) {
  try {
    const { stdout, stderr } = await execFileAsync('python3', ['./search.py',String(msg2)]);
    if (stderr) {
      console.error(`stderr: ${stderr}`);
    }
    if (stdout) {
      return stdout;
    };
  } catch (error) {
    console.error(`execFile error: ${error}`);
    return error;
  }
}

// "No" ボタンが押されたときの処理を実装する関数
function handleNoAction(event) {
    // ここで、掲示板に質問を掲載するための処理を追加する
    // 例えば、特定のAPIにリクエストを送信したり、ユーザーに対してフィードバックを返したりするなど

    // ユーザーにフィードバックを返す例
    return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{
            type: 'text',
            text: 'AIがまとめた質問文'
        }]
    });
}

// "Yes" ボタンが押されたときの処理を実装する関数
function handleYesAction(event) {
    // 解決のフィードバックを返す例
    return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{
            type: 'text',
            text: '問題が解決しましたね。'
        }]
    });
}

// listen on port
const port = process.env.PORT || 7071;
app.listen(port, () => {
  console.log(`listening on ${port}`);
  console.log(config);
});