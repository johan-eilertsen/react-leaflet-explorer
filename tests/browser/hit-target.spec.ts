import { expect, test, type Page } from "@playwright/test";

const tile = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4LsAAAAASUVORK5CYII=", "base64");

async function pointBesideLine(page: Page, offset: number) {
  // Read only rendered SVG geometry, not Leaflet's private hit-testing state.
  return page.locator("path.leaflet-interactive:not(.map-explorer__line-hit-area)").first().evaluate((element, distance) => {
    const path = element as SVGPathElement;
    const length = path.getTotalLength();
    const point = path.getPointAtLength(length / 2);
    const before = path.getPointAtLength(length / 2 - 1);
    const after = path.getPointAtLength(length / 2 + 1);
    const matrix = path.getScreenCTM()!;
    const start = new DOMPoint(before.x, before.y).matrixTransform(matrix);
    const end = new DOMPoint(after.x, after.y).matrixTransform(matrix);
    const middle = new DOMPoint(point.x, point.y).matrixTransform(matrix);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const size = Math.hypot(dx, dy);
    return { x: middle.x - dy / size * distance, y: middle.y + dx / size * distance };
  }, offset);
}

test("the packed component selects beside a thin line, rejects misses and cleans up on remount", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/tiles/**", (route) => route.fulfill({ contentType: "image/png", body: tile }));
  await page.goto("/");
  const status = page.getByRole("status");
  await expect(page.getByRole("application", { name: "Test map" })).toBeVisible();
  await expect(page.locator("path.leaflet-interactive")).toHaveCount(2);
  await expect(status).toHaveText("Nothing selected; callbacks: 0");

  const miss = await pointBesideLine(page, 12);
  await page.mouse.click(miss.x, miss.y);
  await expect(status).toHaveText("Nothing selected; callbacks: 0");

  const hit = await pointBesideLine(page, 6);
  await page.mouse.click(hit.x, hit.y);
  await expect(status).toHaveText("route; callbacks: 1");
  await page.getByRole("button", { name: "Clear selection" }).click();
  await expect(status).toHaveText("Nothing selected; callbacks: 1");
  await page.mouse.click(miss.x, miss.y);
  await expect(status).toHaveText("Nothing selected; callbacks: 1");

  await page.getByRole("button", { name: "Toggle map" }).click();
  await expect(page.getByRole("application", { name: "Test map" })).toHaveCount(0);
  await page.getByRole("button", { name: "Toggle map" }).click();
  await expect(page.locator("path.leaflet-interactive")).toHaveCount(2);
  const remountedHit = await pointBesideLine(page, 6);
  await page.mouse.click(remountedHit.x, remountedHit.y);
  await expect(status).toHaveText("route; callbacks: 2");
  expect(errors).toEqual([]);
});
