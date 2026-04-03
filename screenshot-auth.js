const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 800 });
    
    // Navigate to the URL
    console.log('Navigating to the website...');
    await page.goto('https://v0-ai-chat-system-prototype.vercel.app/', {
      waitUntil: 'networkidle2'
    });
    
    // Wait for the password input field to be visible
    console.log('Waiting for password field...');
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    
    // Take a screenshot of the authentication screen
    const screenshotPath = '/home/noro/brain-room-poc/auth-screen-screenshot.png';
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    
    console.log(`Screenshot saved to: ${screenshotPath}`);
    
    // Now let's try to authenticate
    console.log('Entering password...');
    await page.type('input[type="password"]', 'X|&fqa%MyXr7');
    
    // Look for a submit button
    const submitButton = await page.$('button[type="submit"]');
    if (submitButton) {
      await submitButton.click();
      console.log('Clicked submit button');
      
      // Wait a bit for the page to load after authentication
      await page.waitForTimeout(3000);
      
      // Take another screenshot after authentication
      const afterAuthPath = '/home/noro/brain-room-poc/after-auth-screenshot.png';
      await page.screenshot({ 
        path: afterAuthPath,
        fullPage: true 
      });
      console.log(`Post-authentication screenshot saved to: ${afterAuthPath}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();