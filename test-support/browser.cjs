function launchBrowser(chromium) {
  const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
  const browser = executablePath
    ? { executablePath }
    : { channel: process.env.PLAYWRIGHT_CHANNEL || "chrome" };
  return chromium.launch({ ...browser, headless: true });
}

module.exports = { launchBrowser };
