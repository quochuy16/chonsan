/* eslint-disable @typescript-eslint/no-require-imports -- file CommonJS nạp bằng node -r */
// Ổ exFAT/FAT trên Windows trả EISDIR khi readlink một file thường, trong khi Node/webpack chỉ
// chấp nhận EINVAL ("không phải symlink"). Bản vá này đổi EISDIR -> EINVAL.
// Chỉ cần khi dự án nằm trên ổ không phải NTFS. Dùng: NODE_OPTIONS=--require ./scripts/fix-exfat-readlink.cjs
const fs = require("fs");
const toEinval = (err) => {
  if (err && err.code === "EISDIR") {
    err.code = "EINVAL";
    err.errno = -4071;
  }
  return err;
};
const origSync = fs.readlinkSync;
fs.readlinkSync = function (...args) {
  try {
    return origSync.apply(this, args);
  } catch (e) {
    throw toEinval(e);
  }
};
const orig = fs.readlink;
fs.readlink = function (...args) {
  const cb = args.pop();
  return orig.call(this, ...args, (err, res) => cb(toEinval(err), res));
};
const origP = fs.promises.readlink;
fs.promises.readlink = (...args) => origP(...args).catch((e) => Promise.reject(toEinval(e)));
