import base from "./playwright.config";
export default { ...base, use: { ...base.use, trace: "off", launchOptions: { executablePath: "/opt/pw-browsers/chromium" } } };
