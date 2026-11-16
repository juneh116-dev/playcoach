// Bound to the private PLAYCOACH member spreadsheet. Never publish this as a web app.
// Replace placeholders locally, then run setupMemberSync once as the sheet owner.
function setupMemberSync() {
  PropertiesService.getScriptProperties().setProperties({
    MEMBERS_SHEET_ID: '__SPREADSHEET_ID__',
    MEMBERS_EXPORT_URL: 'https://playcoach-opal.vercel.app/api/internal/members-export',
    MEMBERS_EXPORT_TOKEN: '__EXPORT_TOKEN__'
  });
  syncPlaycoachMembers();
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'syncPlaycoachMembers') ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('syncPlaycoachMembers').timeBased().everyMinutes(5).create();
}

function syncPlaycoachMembers() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    var config = PropertiesService.getScriptProperties().getProperties();
    if (!config.MEMBERS_EXPORT_TOKEN || config.MEMBERS_EXPORT_TOKEN.indexOf('__') === 0) throw new Error('연결 설정이 필요합니다.');
    var rows = [], cursor = '', seen = {}, complete = false;
    for (var page = 0; page < 100; page++) {
      var response = UrlFetchApp.fetch(config.MEMBERS_EXPORT_URL + (cursor ? '?after='+encodeURIComponent(cursor) : ''), {
        headers:{Authorization:'Bearer '+config.MEMBERS_EXPORT_TOKEN},
        muteHttpExceptions:true, followRedirects:false
      });
      if (response.getResponseCode() !== 200) throw new Error('가입자 연결 실패: HTTP '+response.getResponseCode());
      var data = JSON.parse(response.getContentText());
      if (!Array.isArray(data.members)) throw new Error('잘못된 가입자 응답입니다.');
      data.members.forEach(function(member) {
        if (seen[member.id]) return;
        seen[member.id] = true;
        // Prevent member-entered names/emails from becoming spreadsheet formulas.
        rows.push([plainMemberText(member.id),plainMemberText(member.name),plainMemberText(member.email),
          member.joinedAt ? Utilities.formatDate(new Date(member.joinedAt),'Asia/Seoul','yyyy-MM-dd HH:mm:ss') : '',
          plainMemberText({email:'이메일',kakao:'카카오',naver:'네이버'}[member.provider] || member.provider)]);
      });
      if (!data.nextCursor) { complete = true; break; }
      if (data.nextCursor === cursor) throw new Error('페이지 순서가 올바르지 않습니다.');
      cursor = data.nextCursor;
    }
    // Preserve the previous sheet if any page failed or the result was incomplete.
    if (!complete) throw new Error('가입자가 많아 전체 동기화를 완료하지 못했습니다.');
    var book = SpreadsheetApp.openById(config.MEMBERS_SHEET_ID);
    var sheet = book.getSheetByName('가입자');
    if (!sheet) throw new Error('가입자 탭을 찾을 수 없습니다.');
    var headers = ['회원 ID','이름','이메일','가입일 (한국시간)','가입 방식'];
    if (sheet.getRange(1,1,1,5).getDisplayValues()[0].join('|') !== headers.join('|')) throw new Error('가입자 시트의 열 구성을 확인해 주세요.');
    rows.sort(function(a,b) {return b[3].localeCompare(a[3]) || a[0].localeCompare(b[0]);});
    var oldLast = sheet.getLastRow();
    if (sheet.getMaxRows() < rows.length+1) sheet.insertRowsAfter(sheet.getMaxRows(),rows.length+1-sheet.getMaxRows());
    if (rows.length) sheet.getRange(2,1,rows.length,5).setNumberFormat('@').setValues(rows);
    if (oldLast > rows.length+1) sheet.getRange(rows.length+2,1,oldLast-rows.length-1,5).clearContent();
    sheet.getRange('A1').setNote('마지막 동기화: '+Utilities.formatDate(new Date(),'Asia/Seoul','yyyy-MM-dd HH:mm:ss')+' · '+rows.length+'명');
  } finally {
    lock.releaseLock();
  }
}

function plainMemberText(value) {
  var text = String(value == null ? '' : value);
  return /^[\s]*[=+\-@]/.test(text) ? "'"+text : text;
}
