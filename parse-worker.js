// Parses WhatsApp chat exports off the main UI thread.
self.onmessage = function (e) {
  var text = String((e.data && e.data.text) || '');
  var re = /^\[?(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::\d{2})?\s?([APap][Mm])?\]?\s*-?\s*([^:]{1,40}?):\s([\s\S]*)$/;
  var out = [];
  var lines = text.replace(/\u200e/g, '').split(/\r?\n/);
  for (var i = 0; i < lines.length; i++) {
    var raw = lines[i];
    var m = raw.match(re);
    if (m) {
      var d = +m[1], mo = +m[2], y = +m[3], h = +m[4], mi = +m[5], ap = m[6], s = m[7], body = m[8];
      if (y < 100) y = 2000 + y;
      if (ap) {
        ap = ap.toLowerCase();
        if (ap === 'pm' && h < 12) h += 12;
        if (ap === 'am' && h === 12) h = 0;
      }
      out.push({ sender: s.trim(), t: Date.UTC(y, mo - 1, d, h, mi), text: body });
    } else if (out.length && raw.trim()) {
      out[out.length - 1].text += '\n' + raw;
    }
  }
  out = out.filter(function (m) { return !/omitted>?$/i.test(m.text.trim()); });
  self.postMessage({ msgs: out });
};
