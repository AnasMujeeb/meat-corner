import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const VIEWPORTS = [
  { name: "320p", width: 320, height: 600 },
  { name: "360p", width: 360, height: 740 },
  { name: "375p", width: 375, height: 667 },
  { name: "390p", width: 390, height: 844 },
  { name: "412p", width: 412, height: 915 },
  { name: "430p", width: 430, height: 932 },
  { name: "480p", width: 480, height: 800 },
  { name: "600p", width: 600, height: 960 },
  { name: "768p", width: 768, height: 1024 },
  { name: "820p", width: 820, height: 1180 },
  { name: "1024p", width: 1024, height: 768 },
  { name: "667x375l", width: 667, height: 375 },
  { name: "844x390l", width: 844, height: 390 },
];

const DESKTOP_VIEWPORTS = [
  { name: "1280d", width: 1280, height: 800 },
  { name: "1440d", width: 1440, height: 900 },
  { name: "1920d", width: 1920, height: 1080 },
];

const BASE_URL = "http://localhost:4173";

const PAGES = [
  { id: "home", path: "/" },
  { id: "menu", path: "/menu" },
  { id: "healthy", path: "/healthy" },
  { id: "kids", path: "/kids" },
  { id: "catering", path: "/catering" },
  { id: "story", path: "/story" },
  { id: "contact", path: "/contact" },
  { id: "cart", path: "/cart" },
  { id: "404", path: "/404-nonexistent-route" },
];

fs.mkdirSync("reports/audit_screenshots", { recursive: true });

async function runAudit() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Populate cart so cart pages and modals can be fully tested
  await page.goto(`${BASE_URL}/menu`, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.setItem(
      "mc_cart",
      JSON.stringify([
        {
          _cartKey: "item-1-default",
          _id: "test-item-1",
          name: "Signature Ribeye Steak Wagyu MB7+",
          price: 185,
          qty: 2,
          _categoryName: "Steaks & Grills",
          _optionNote: "Doneness: Medium Rare · Sauce: Peppercorn",
          images: [{ url: "/uploads/processed/ribeye.webp" }],
        },
      ])
    );
  });

  const issues = [];
  const matrix = [];

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });

    for (const p of PAGES) {
      const url = `${BASE_URL}${p.path}`;
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
        await page.waitForTimeout(300);

        // Check for horizontal overflow and element-level issues
        const evaluation = await page.evaluate((vw) => {
          const docEl = document.documentElement;
          const body = document.body;
          const scrollW = Math.max(docEl.scrollWidth, body.scrollWidth);
          const hasOverflow = scrollW > vw + 1;

          function isClippedByAncestor(el) {
            let parent = el.parentElement;
            while (parent && parent !== document.body && parent !== document.documentElement) {
              const ps = window.getComputedStyle(parent);
              if (
                ps.overflowX === "hidden" ||
                ps.overflowX === "clip" ||
                ps.overflow === "hidden" ||
                ps.overflow === "clip" ||
                ps.overflowX === "auto" ||
                ps.overflowX === "scroll" ||
                ps.overflow === "auto" ||
                ps.overflow === "scroll" ||
                ps.contain?.includes("paint")
              ) {
                return true;
              }
              parent = parent.parentElement;
            }
            return false;
          }

          const overflowingElements = [];
          const smallTapTargets = [];
          const clippedTexts = [];

          const allElements = Array.from(document.querySelectorAll("body *"));

          for (const el of allElements) {
            const style = window.getComputedStyle(el);
            if (
              style.display === "none" ||
              style.visibility === "hidden" ||
              style.opacity === "0"
            )
              continue;

            const rect = el.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) continue;

            const isClipped = isClippedByAncestor(el);

            // Element wider than viewport without clipping container
            if (rect.width > vw + 1.5 && style.position !== "fixed" && !isClipped) {
              const tag = el.tagName.toLowerCase();
              const cls = el.className ? `.${String(el.className).split(" ").join(".")}` : "";
              const id = el.id ? `#${el.id}` : "";
              overflowingElements.push(`${tag}${id}${cls} (w:${Math.round(rect.width)}px > vw:${vw}px)`);
            }

            // Right edge sticking out past viewport without clipping container
            if (rect.right > vw + 2 && style.position !== "fixed" && !isClipped) {
              const tag = el.tagName.toLowerCase();
              const cls = el.className ? `.${String(el.className).split(" ").join(".")}` : "";
              overflowingElements.push(`${tag}${cls} (right:${Math.round(rect.right)}px > vw:${vw}px)`);
            }

            // Interactive element tap target size
            const isClickable =
              el.tagName === "BUTTON" ||
              (el.tagName === "A" && el.href) ||
              el.tagName === "INPUT" ||
              el.tagName === "SELECT" ||
              el.getAttribute("role") === "button" ||
              el.getAttribute("role") === "tab";

            if (isClickable) {
              // Ignore inline paragraph links that just wrap a single word
              const isInlineLink =
                el.tagName === "A" &&
                style.display === "inline" &&
                el.parentElement &&
                window.getComputedStyle(el.parentElement).display !== "flex";

              const isHiddenInput = el.tagName === "INPUT" && el.type === "hidden";

              if (!isInlineLink && !isHiddenInput) {
                if (rect.width > 0 && rect.height > 0 && (rect.width < 43.5 || rect.height < 43.5)) {
                  const tag = el.tagName.toLowerCase();
                  const cls = el.className ? `.${String(el.className).slice(0, 30)}` : "";
                  const text = (el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 20);
                  smallTapTargets.push(`${tag}${cls}["${text}"] (${Math.round(rect.width)}x${Math.round(rect.height)})`);
                }
              }
            }

            // Clipped text check
            if (
              el.children.length === 0 &&
              (el.innerText || "").trim().length > 0 &&
              (style.overflow === "hidden" || style.textOverflow === "ellipsis")
            ) {
              // Check if actual text is unintentionally cut off or clipping parent
              if (el.scrollWidth > el.clientWidth + 2 && !el.classList.contains("food-card__name")) {
                const tag = el.tagName.toLowerCase();
                const cls = el.className ? `.${String(el.className).slice(0, 25)}` : "";
                clippedTexts.push(`${tag}${cls}: "${el.innerText.slice(0, 25)}..."`);
              }
            }
          }

          return {
            scrollW,
            hasOverflow,
            overflowingElements: Array.from(new Set(overflowingElements)),
            smallTapTargets: Array.from(new Set(smallTapTargets)),
            clippedTexts: Array.from(new Set(clippedTexts)),
          };
        }, vp.width);

        const pageOk =
          !evaluation.hasOverflow &&
          evaluation.overflowingElements.length === 0 &&
          evaluation.smallTapTargets.length === 0 &&
          evaluation.clippedTexts.length === 0;

        matrix.push({
          page: p.id,
          width: vp.width,
          status: pageOk ? "OK" : "ISSUE",
          details: evaluation,
        });

        if (!pageOk) {
          issues.push({
            page: p.id,
            width: vp.width,
            hasOverflow: evaluation.hasOverflow,
            scrollW: evaluation.scrollW,
            overflowElements: evaluation.overflowingElements,
            smallTapTargets: evaluation.smallTapTargets,
            clippedTexts: evaluation.clippedTexts,
          });
        }

        // Save representative screenshots
        if ([320, 375, 768].includes(vp.width)) {
          const ssPath = `reports/audit_screenshots/${p.id}_${vp.name}.png`;
          await page.screenshot({ path: ssPath, fullPage: false });
        }
      } catch (err) {
        console.error(`Error on ${p.id} at ${vp.width}:`, err.message);
      }
    }

    // Special modal / drawer tests at 375px
    if (vp.width === 375) {
      // Hamburger panel
      try {
        await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(300);
        const burger = await page.$(".site-header__burger");
        if (burger && (await burger.isVisible())) {
          await burger.click();
          await page.waitForTimeout(300);
          await page.screenshot({ path: "reports/audit_screenshots/hamburger_375p.png" });
          const burgerEval = await page.evaluate(() => {
            const panel = document.querySelector(".mobile-nav-panel");
            return {
              overflow: document.documentElement.scrollWidth > window.innerWidth,
              visible: panel ? window.getComputedStyle(panel).display !== "none" : false,
            };
          });
          if (burgerEval.overflow) {
            issues.push({ page: "hamburger", width: 375, hasOverflow: true });
          }
        }
      } catch (e) {
        console.log("Hamburger check error:", e.message);
      }

      // Item Modal
      try {
        await page.goto(`${BASE_URL}/menu`, { waitUntil: "networkidle" });
        await page.waitForTimeout(400);
        const card = await page.$(".food-card");
        if (card) {
          await card.click();
          await page.waitForTimeout(400);
          await page.screenshot({ path: "reports/audit_screenshots/item_modal_375p.png" });
          const modalEval = await page.evaluate(() => {
            const modal = document.querySelector(".item-modal");
            if (!modal) return null;
            const rect = modal.getBoundingClientRect();
            return {
              width: rect.width,
              viewportW: window.innerWidth,
              overflow: rect.width > window.innerWidth,
            };
          });
          if (modalEval?.overflow) {
            issues.push({ page: "item_modal", width: 375, overflowElements: ["item-modal"] });
          }
        }
      } catch (e) {
        console.log("Item modal check error:", e.message);
      }

      // Waiter Modal
      try {
        await page.goto(`${BASE_URL}/cart`, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(300);
        const waiterBtn = await page.$("button:has-text('SHOW TO WAITER')");
        if (waiterBtn && (await waiterBtn.isVisible())) {
          await waiterBtn.click();
          await page.waitForTimeout(300);
          await page.screenshot({ path: "reports/audit_screenshots/waiter_modal_375p.png" });
          const waiterEval = await page.evaluate(() => {
            const card = document.querySelector(".waiter-modal-card");
            if (!card) return null;
            const rect = card.getBoundingClientRect();
            return {
              width: rect.width,
              viewportW: window.innerWidth,
              overflow: rect.width > window.innerWidth,
            };
          });
          if (waiterEval?.overflow) {
            issues.push({ page: "waiter_modal", width: 375, overflowElements: ["waiter-modal-card"] });
          }
        }
      } catch (e) {
        console.log("Waiter modal check error:", e.message);
      }
    }
  }

  // Desktop validation (1280, 1440, 1920)
  for (const dvp of DESKTOP_VIEWPORTS) {
    await page.setViewportSize({ width: dvp.width, height: dvp.height });
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
    const ssPath = `reports/audit_screenshots/home_${dvp.name}.png`;
    await page.screenshot({ path: ssPath, fullPage: false });
  }

  await browser.close();

  fs.writeFileSync("reports/audit_summary.json", JSON.stringify({ issues, matrix }, null, 2));
  console.log("AUDIT FINISHED. Total issues found:", issues.length);
}

runAudit().catch(console.error);
