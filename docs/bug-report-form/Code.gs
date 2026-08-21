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

    MailApp.sendEmail({
      to: Session.getEffectiveUser().getEmail(),
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
    return json({ ok: false, error: String(err) });
  }
}

function doGet() {
  return json({ ok: true, hint: 'POST only' });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
