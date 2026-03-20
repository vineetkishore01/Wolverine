import { chromium, type Browser, type Page } from "playwright";

/**
 * PinchtabBridge provides a high-level interface for browser-based automation and data extraction.
 * It uses Playwright (Chromium) to navigate pages, capture snapshots simplified for LLMs,
 * and interact with web elements.
 */
export class PinchtabBridge {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private launchingPromise: Promise<void> | null = null;

  /**
   * Initializes the browser and context if it hasn't been already (Lazy Loading).
   * Sets up viewport and user-agent for a consistent agentic browsing experience.
   * @private
   */
  private async ensureBrowser() {
    if (this.browser) return;
    
    if (this.launchingPromise) {
      return this.launchingPromise;
    }

    this.launchingPromise = (async () => {
      try {
        console.log("[Pinchtab] Launching hyper-fast Chromium instance...");
        this.browser = await chromium.launch({ headless: true });
        const context = await this.browser.newContext({
          viewport: { width: 1280, height: 720 },
          userAgent: "Wolverine/1.0 (Agentic Intelligence)"
        });
        this.page = await context.newPage();
      } catch (err) {
        this.launchingPromise = null;
        throw err;
      }
    })();

    return this.launchingPromise;
  }

  /**
   * Navigates the browser to the specified URL.
   * @param url - The web address to visit.
   * @returns A Markdown snapshot of the page including title and interactive elements.
   */
  async navigate(url: string) {
    await this.ensureBrowser();
    console.log(`[Pinchtab] Navigating to: ${url}`);
    await this.page!.goto(url, { waitUntil: "domcontentloaded" });
    return await this.getSnapshot();
  }

  /**
   * Captures the current page state and transforms it into a simplified Markdown format.
   * This format is optimized for Small Model Context (LLM) by only including 
   * semantic interactive elements (buttons, links, inputs).
   * @returns A Markdown string representing the page title and its interactable components.
   */
  async getSnapshot() {
    await this.ensureBrowser();
    
    // Inject script to find and index interactive elements
    const interactiveElements = await this.page!.evaluate(() => {
      const elements = Array.from((window as any).document.querySelectorAll('button, a, input, [role="button"]'));
      return elements.map((el: any, index: number) => {
        const rect = el.getBoundingClientRect();
        return {
          id: index,
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || el.value || "").trim().substring(0, 50),
          visible: rect.width > 0 && rect.height > 0
        };
      }).filter((el: any) => el.visible);
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
   * Simulates a click on an element identified by its numeric ID from the snapshot.
   * Handles navigation waits and stability detection after the click.
   * @param elementId - The index of the element to click (from the getSnapshot results).
   * @returns A fresh Markdown snapshot of the resulting page after the click.
   */
  async click(elementId: number) {
    await this.ensureBrowser();
    console.log(`[Pinchtab] Clicking element ID: ${elementId}`);
    
    // Capture current URL to detect navigation
    const currentUrl = this.page!.url();
    
    // Create a promise that resolves on navigation OR timeout
    const navigationPromise = this.page!.waitForURL(url => url.toString() !== currentUrl, { timeout: 5000 }).catch(() => null);
    
    await this.page!.evaluate((id: number) => {
      const elements = Array.from((window as any).document.querySelectorAll('button, a, input, [role="button"]'));
      const target = elements[id] as any;
      if (target) target.click();
    }, elementId);

    // Wait for EITHER navigation OR a stable DOM (best of both worlds)
    await Promise.race([
      navigationPromise,
      this.page!.waitForLoadState("domcontentloaded").catch(() => {}),
      new Promise(r => setTimeout(r, 2000)) // Max 2s fallback
    ]);
    
    return await this.getSnapshot();
  }

  /**
   * Closes the browser instance and cleans up memory.
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

export const pinchtab = new PinchtabBridge();
