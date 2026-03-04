/**
 * feed-extractor.ts
 * Logic for extracting structured data (feeds, search results, articles) from pages.
 * Ported from the original browser-tools.ts.
 */

/**
 * JS string to be executed in the browser context via Pinchtab's /evaluate.
 */
export const EXTRACTOR_JS = `(maxItems) => {
    const doc = document;
    const normalize = (v, maxLen = 400) => String(v || '').replace(/\\s+/g, ' ').trim().slice(0, maxLen);
    const toAbs = (href) => {
        try { return new URL(href, location.href).toString(); } catch { return String(href || '').trim(); }
    };
    const host = String(location.hostname || '').toLowerCase();
    const url = String(location.href || '').toLowerCase();
    const title = normalize(doc.title || '', 180);
    
    const out = {
        pageType: 'generic',
        extractedFeed: [],
        textBlocks: [],
        pageText: '',
        isGenerating: false,
    };

    // Chat interface detection
    const isChatInterface = /(^|\\.)chatgpt\\.com$/.test(host)
        || /(^|\\.)claude\\.ai$/.test(host)
        || /(^|\\.)gemini\\.google\\.com$/.test(host)
        || /(^|\\.)chat\\.openai\\.com$/.test(host)
        || /\\/c\\/[a-f0-9-]{8,}/.test(url);

    if (isChatInterface) {
        out.pageType = 'chat_interface';
        const stopBtn = doc.querySelector('button[aria-label*="Stop"], [aria-label*="Stop generating"], .stop-button');
        out.isGenerating = !!stopBtn;

        const assistantMsgSelectors = [
            '[data-message-author-role="assistant"]',
            '[data-testid*="conversation-turn"]:last-of-type',
            '.agent-turn',
            '.model-response-text'
        ];
        let lastMsgText = '';
        for (const sel of assistantMsgSelectors) {
            const nodes = Array.from(doc.querySelectorAll(sel));
            if (!nodes.length) continue;
            const last = nodes[nodes.length - 1];
            const txt = normalize(last?.innerText || last?.textContent || '', 3000);
            if (txt.length > 60) { lastMsgText = txt; break; }
        }
        out.pageText = lastMsgText;
        if (lastMsgText) out.textBlocks = [lastMsgText.slice(0, 1200)];
        return out;
    }

    const isX = /(^|\\.)x\\.com$/.test(host) || /(^|\\.)twitter\\.com$/.test(host);
    const isSearch = /(search|results|q=)/.test(url) || /(google|bing|duckduckgo|brave|yahoo)\\./.test(host);

    if (isX) {
        out.pageType = 'x_feed';
        const tweets = Array.from(doc.querySelectorAll('article[data-testid="tweet"]'));
        for (const tw of tweets) {
            const text = normalize(Array.from(tw.querySelectorAll('[data-testid="tweetText"]')).map(n => n.innerText || '').join(' '), 1800);
            const statusLink = tw.querySelector('a[href*="/status/"]');
            const link = statusLink ? toAbs(statusLink.getAttribute('href') || '') : '';
            const author = normalize(tw.querySelector('[data-testid="User-Name"] span')?.textContent || '', 120);
            out.extractedFeed.push({ text, link, author, source: 'x' });
            if (out.extractedFeed.length >= maxItems) break;
        }
        return out;
    }

    if (isSearch) {
        out.pageType = 'search_results';
        const cards = Array.from(doc.querySelectorAll('div.g, li.b_algo, .result, .search-result, article'));
        for (const card of cards) {
            const titleEl = card.querySelector('h3, h2');
            const linkEl = card.querySelector('a[href]');
            const snippetEl = card.querySelector('p, span, .VwiC3b');
            const titleText = normalize(titleEl?.textContent || '', 220);
            const link = normalize(linkEl ? toAbs(linkEl.getAttribute('href') || '') : '', 500);
            const snippet = normalize(snippetEl?.textContent || '', 500);
            if (titleText || snippet) {
                out.extractedFeed.push({ title: titleText, link, snippet, source: host });
            }
            if (out.extractedFeed.length >= maxItems) break;
        }
        return out;
    }

    // Generic article
    const paras = Array.from(doc.querySelectorAll('article p, main p, p'));
    for (const p of paras) {
        const text = normalize(p.innerText || '', 700);
        if (text.length > 80) out.textBlocks.push(text);
        if (out.textBlocks.length >= maxItems) break;
    }
    out.pageType = out.textBlocks.length >= 4 ? 'article' : 'generic';
    out.pageText = out.textBlocks.slice(0, 6).join(' ');
    
    return out;
}`;

export function dedupeFeedItems(items: any[]): any[] {
    const seen = new Set<string>();
    return items.filter(item => {
        const key = item.link || item.text?.slice(0, 100) || item.title?.slice(0, 100);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}
