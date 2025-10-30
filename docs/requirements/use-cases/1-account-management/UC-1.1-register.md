# UC-1.1 註冊

| 項目 | 內容 |
|------|------|
| **填表人** | 李芝瑢 |
| **商業流程編號** | UC-1.1 |
| **行為者** | 訪客 |
| **內容概述** | 訪客可於系統註冊頁面建立新帳號,輸入基本資訊(使用者名稱、Email、密碼、顯示名稱、生日等),經系統驗證後即可成為正式會員。 |
| **先決條件** | 使用者尚未登入,並進入註冊頁面。 |
| **後置條件** | 系統新增一筆使用者資料至 users 資料表,帳號狀態為「active」,角色為「member」,可立即登入系統。 |
| **主要流程** | 1. 使用者點選「註冊」按鈕進入註冊頁面。<br>2. 系統顯示註冊表單畫面。<br>3. 使用者輸入必要資料:<br>&nbsp;&nbsp;&nbsp;- username (3-50 字元,英數字及底線)<br>&nbsp;&nbsp;&nbsp;- email (有效 Email 格式)<br>&nbsp;&nbsp;&nbsp;- password (8-20 字元,需含大小寫字母與數字)<br>&nbsp;&nbsp;&nbsp;- display_name (2-100 字元顯示名稱)<br>&nbsp;&nbsp;&nbsp;- birth_date (生日,需年滿 13 歲)<br>&nbsp;&nbsp;&nbsp;- gender (選填:male/female/other/prefer_not_to_say)<br>4. 系統即時驗證資料格式(前端 + 後端雙重驗證)。<br>5. 使用者勾選同意條款並完成 reCAPTCHA 驗證。<br>6. 系統確認 username 和 email 未重複。<br>7. 系統使用 bcrypt 加密密碼並儲存至資料庫。<br>8. 註冊成功,自動登入並導向首頁。 |
| **替代流程** | a. 若輸入資料不符格式  系統即時顯示欄位錯誤訊息(如「密碼需含大小寫字母與數字」),要求修正後才能提交。<br>b. 若 username 或 email 已被註冊  系統顯示「使用者名稱已存在」或「Email 已被註冊」,要求更換。<br>c. 若年齡未滿 13 歲  系統顯示「註冊需年滿 13 歲」錯誤訊息並阻止註冊。<br>d. 若 reCAPTCHA 驗證失敗  顯示「驗證失敗,請重試」。 |
| **輔助說明** | 註冊需遵守個資法規,密碼需經 bcrypt 加密儲存(絕不儲存明文密碼)。系統應提供 Google reCAPTCHA v3 防止機器人註冊。username 和 email 需設定唯一索引(UNIQUE KEY)。資料庫約束:chk_age 確保年齡 ≥ 13 歲。 |
| **Screen 畫面** | 註冊頁、首頁 |

---

[ 回到索引](../README.md)
