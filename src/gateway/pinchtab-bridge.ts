import { chromium, type Browser, type Page } from "playwright";

export class PinchtabBridge {
  private browser: Browser | null = null;
  private page: Page | null = null;

  /**
   * Initializes the browser if it hasn't been already (Lazy Loading)
   */
  private async ensureBrowser() {
    if (!this.browser) {
      console.log("[Pinchtab] Launching hyper-fast Chromium instance...");
      this.browser = await chromium.launch({ headless: true });
      const context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: "Wolverine/1.0 (Agentic Intelligence)"
      });
      this.page = await context.newPage();
    }
  }

  /**
   * Navigates to a URL and returns a simplified semantic map
   */
  async navigate(url: string) {
    await this.ensureBrowser();
    console.log(`[Pinchtab] Navigating to: ${url}`);
    await this.page!.goto(url, { waitUntil: "domcontentloaded" });
    return await this.getSnapshot();
  }

  /**
   * Takes a snapshot and simplifies it for LLM context (Small Model Optimization)
   */
  async getSnapshot() {
    await this.ensureBrowser();
    
    // Inject script to find and index interactive elements
    const interactiveElements = await this.page!.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('button, a, input, [role="button"]'));
      return elements.map((el, index) => {
        const rect = el.getBoundingClientRect();
        return {
          id: index,
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || (el as any).value || "").trim().substring(0, 50),
          visible: rect.width > 0 && rect.height > 0
        };
      }).filter(el => el.visible);
    });

    const title = await this.page!.title();
    let markdown = `## Page: ${title}\n\n`;
    markdown += "### Interactive Elements:\n";
    interactiveElements.forEach(el => {
      markdown += `[${el.id}] ${el.tag.toUpperCase()}: "${el.text}"\n`;
    });

    return markdown;
  }

  /**
   * Clicks an element by its ID (as seen in the indexed snapshot)
   */
  async click(elementId: number) {
    await this.ensureBrowser();
    console.log(`[Pinchtab] Clicking element ID: ${elementId}`);
    
    await this.page!.evaluate((id) => {
      const elements = Array.from(document.querySelectorAll('button, a, input, [role="button"]'));
      const target = elements[id] as HTMLElement;
      if (target) target.click();
    }, elementId);

    await this.page!.waitForTimeout(1000); // Wait for potential navigation
    return await this.getSnapshot();
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

export const pinchtab = new PinchtabBridge();
