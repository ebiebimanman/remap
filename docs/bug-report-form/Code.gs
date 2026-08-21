/**
 * りまっぷ 紹介サイト － バグ報告フォームの受信スクリプト
 *
 * website/index.html のバグ報告フォームから POST を受け、
 * このスクリプトの所有者（＝デプロイした本人）宛にメールを送る。
 *
 * 宛先はスクリプト所有者から自動で解決するため、
 * このファイルにメールアドレスを書く必要はない。
 *
 * デプロイ手順は同ディレクトリの README.md を参照。
 */

var MAX_LEN = 1000;
var SUBJECT = '【りまっぷ】バグ報告';

function doPost(e) {
  try {
    var p = (e && e.parameter) || {};

    // ハニーポット: ボットが埋めたら送らずに正常終了を返す
    if (p.website) {
      return json({ ok: true });
    }

    var message = String(p.message || '').trim();
    if (message.length < 1 || message.length > MAX_LEN) {
      return json({ ok: false, error: 'invalid_length' });
    }

    var to = resolveRecipient();
    if (!to) {
      return json({ ok: false, error: 'no_recipient' });
    }

    MailApp.sendEmail({
      to: to,
      subject: SUBJECT,
      body: [
        message,
        '',
        '----------------------------------------',
        '受信日時: ' + Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss'),
        'User-Agent: ' + String(p.ua || '不明')
      ].join('\n')
    });

    return json({ ok: true });
  } catch (err) {
    // 実行ログに残す（Apps Script の「実行数」から確認できる）
    console.error(err);
    return json({ ok: false, error: String(err) });
  }
}

/**
 * 宛先を決める。
 * 通常はスクリプト所有者のアドレスが取れるが、
 * 取れない構成のときはスクリプトプロパティ TO を使う。
 */
function resolveRecipient() {
  var owner = '';
  try {
    owner = Session.getEffectiveUser().getEmail() || '';
  } catch (e) {
    owner = '';
  }
  if (owner) return owner;
  return PropertiesService.getScriptProperties().getProperty('TO') || '';
}

/**
 * 【最初に1回だけ実行する】
 *
 * エディタでこの関数を選んで実行すると、メール送信の権限
 * (script.send_mail) の承認ダイアログが出る。承認すると
 * 自分宛にテストメールが届く。
 *
 * 権限を承認しないと doPost が
 * 「MailApp.sendEmail を呼び出す権限がありません」で失敗する。
 */
function sendTestMail() {
  var to = resolveRecipient();
  if (!to) {
    throw new Error('宛先が取得できません。スクリプトプロパティ TO にメールアドレスを設定してください。');
  }
  MailApp.sendEmail({
    to: to,
    subject: SUBJECT + '（テスト）',
    body: 'このメールが届いていれば、バグ報告フォームの送信設定は完了です。'
  });
  console.log('送信しました: ' + to);
}

function doGet() {
  return json({ ok: true, hint: 'POST only' });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
