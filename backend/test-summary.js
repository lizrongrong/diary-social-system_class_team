// test-summary.js
require('dotenv').config(); // 載入變數
const { generateSummary } = require('./src/services/aiService');

console.log("1. 腳本開始執行...");

async function runTest() {
    console.log("2. 準備呼叫 generateSummary...");
    
    const mockDiary = { content: "今天早上突然心血來潮在看股票，平常都是定期定額買零股的我，突然看到台積電價錢不錯，想說買一股看看，結果看到「整股」，不知為何當下就覺得代表是「1股」???(可能腦袋還沒開機) 於是就下單了，結果過沒多久，在證券公司上班的姑姑突然密我，說我買了一張台積電!!!! 蛤? 我整個傻眼?? 原來我不小心選錯了(可能也不是不小心...單純我是個無知的孩子QQ)後來跟爸爸還有姑姑討論後，心情冷靜了許多，趕快掛單排隊賣，幸好最後順利賣出!!還學到手續費跟交易費的算法，結果算一算，我好像還賺到快2000元~~~謝謝幸運之神眷顧我，也謝謝姑姑，謝謝爸爸還有男友，陪著焦慮的我面對，有你們真好!晚上馬上請男友吃雞排壓壓驚" };
    
    try {
        const result = await generateSummary({ diary: mockDiary });
        console.log("3. 執行結果：", result);
    } catch (error) {
        console.error("3. 執行錯誤：", error);
    }
}

// ⚠️ 最重要的一行：必須呼叫這個函式程式才會跑！
runTest();