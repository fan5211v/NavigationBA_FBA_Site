/* 访问口令遮罩:口令正确才显示站点内容。
 * 口令不以明文存放,这里只保存加盐后的 SHA-256 哈希,用 Site_Dev/set-passcode.sh 修改。
 * 注意:这是纯前端校验,只能挡住普通访客,不是真正的访问控制。 */
(function () {
  var SALT = "navba-gate-fba:";
  var HASH = "73c459a87164a1b3d3d708dd812360bf81f21a0fa1b459cb529f5d2b42194b10";
  var REMEMBER_MINUTES = 60;
  var KEY = "navba-gate-fba";

  var root = document.documentElement;

  function sha256Hex(text) {
    var data = new TextEncoder().encode(text);
    return crypto.subtle.digest("SHA-256", data).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) {
        return ("0" + b.toString(16)).slice(-2);
      }).join("");
    });
  }

  function isUnlocked() {
    try {
      var saved = JSON.parse(localStorage.getItem(KEY) || "null");
      return !!saved && saved.h === HASH && saved.exp > Date.now();
    } catch (e) {
      return false;
    }
  }

  function remember() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        h: HASH,
        exp: Date.now() + REMEMBER_MINUTES * 60 * 1000
      }));
    } catch (e) { /* 无痕模式等写入失败时,仅本次有效 */ }
  }

  if (isUnlocked()) return;

  // 在 <head> 中同步执行:页面渲染前就隐藏 body,避免内容闪现
  var style = document.createElement("style");
  style.textContent =
    "html.gate-locked body{display:none!important}" +
    "#gate{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;" +
    "background:#f5f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif}" +
    "#gate form{width:min(340px,86vw);padding:32px 28px;background:#fff;border-radius:12px;" +
    "box-shadow:0 4px 24px rgba(0,0,0,.08);text-align:center}" +
    "#gate h1{margin:0 0 20px;font-size:18px;font-weight:600;color:#222}" +
    "#gate input{box-sizing:border-box;width:100%;padding:10px 12px;font-size:15px;border:1px solid #ccc;" +
    "border-radius:8px;outline:none;text-align:center}" +
    "#gate input:focus{border-color:#448aff}" +
    "#gate button{width:100%;margin-top:12px;padding:10px;font-size:15px;color:#fff;background:#448aff;" +
    "border:0;border-radius:8px;cursor:pointer}" +
    "#gate .err{min-height:18px;margin-top:10px;font-size:13px;color:#d33}";
  root.appendChild(style);
  root.classList.add("gate-locked");

  function build() {
    var gate = document.createElement("div");
    gate.id = "gate";
    gate.innerHTML =
      '<form autocomplete="off">' +
      "<h1>请输入验证码</h1>" +
      '<input type="password" placeholder="验证码" autofocus>' +
      "<button type=\"submit\">进入</button>" +
      '<div class="err"></div>' +
      "</form>";
    root.appendChild(gate);

    var form = gate.querySelector("form");
    var input = gate.querySelector("input");
    var err = gate.querySelector(".err");
    input.focus();

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!window.crypto || !crypto.subtle) {
        err.textContent = "当前浏览器环境不支持验证,请使用 https 访问";
        return;
      }
      sha256Hex(SALT + input.value).then(function (h) {
        if (h === HASH) {
          remember();
          root.classList.remove("gate-locked");
          gate.remove();
        } else {
          err.textContent = "验证码错误,请重试";
          input.value = "";
          input.focus();
        }
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
