import { default as assert } from "assert";
import { default as faker } from "faker";
import { Page } from "puppeteer";
import { default as RandExp } from "randexp";
import { ActionHandler } from "../types";

export const inputHandler: ActionHandler<"input", "chrome"> = async (
  page: Page,
  { action }
) => {
  const input = action.form;
  if (input.value) {
    if (typeof input.value === "string") {
      await page.type(input.selector, input.value);

      return { meta: action.meta, value: input.value };
    }
    if (input.value.faker) {
      const fake = faker.fake(`{{${input.value.faker}}}`);
      await page.type(input.selector, fake);

      return { meta: action.meta, value: fake };
    }
    if (input.value.date) {
      const d = new Date(input.value.date);
      const date = d.getDate();
      const month = d.getMonth() + 1;
      const dateStr = `${date < 10 ? "0" + date : date}${
        month < 10 ? "0" + month : month
      }${d.getFullYear()}`;
      await page.type(input.selector, dateStr);

      return { meta: action.meta, value: dateStr };
    }
    throw new Error(`unknown input action ${action}`);
  }
  if (input.constrains && input.constrains.regexp) {
    const regex = new RegExp(input.constrains.regexp);

    const randex = new RandExp(regex);
    randex.defaultRange.subtract(32, 126);
    randex.defaultRange.add(0, 65535);

    const value = randex.gen();

    await page.type(input.selector, value);

    return { meta: action.meta, value };
  }

  throw new Error(`unknown input action ${action}`);
};

export const waitHandler: ActionHandler<"wait", "chrome"> = async (
  page: Page,
  { action }
) => {
  await page.waitFor(action.duration);
  return { meta: action.meta, duration: action.duration };
};

export const clickHandler: ActionHandler<"click", "chrome"> = async (
  page: Page,
  { action }
) => {
  await page.waitForSelector(action.selector);
  await page.tap("body");
  await page.$eval(action.selector, s => (s as any).click());

  return { meta: action.meta };
};

export const radioHandler: ActionHandler<"radio", "chrome"> = async (
  page: Page,
  { action }
) => {
  await page.$eval(`${action.form.selector}[value="${action.form.value}"]`, s =>
    (s as any).click()
  );

  return { meta: action.meta, value: action.form.value };
};

export const selectHandler: ActionHandler<"select", "chrome"> = async (
  page: Page,
  { action }
) => {
  const select = action.form;
  const v = select.constrains && select.constrains.values;
  if (v && v.length > 0) {
    await page.select(
      select.selector,
      `${v[Math.floor(Math.random() * v.length)]}`
    );
    return;
  }
  const value = await page.evaluate(selector => {
    return document.querySelector(selector).children[1].value;
  }, select.selector);
  await page.select(select.selector, `${value}`);

  return { meta: action.meta, value };
};

export const ensureHandler: ActionHandler<"ensure", "chrome"> = async (
  page: Page,
  { action }
) => {
  if (!action.location) {
    return { meta: action.meta, ensure: false };
  }
  const url = await page.url();

  if (action.location.value) {
    assert.strictEqual(
      url,
      action.location.value,
      `location check failed: must be ${action.location.value}, but: ${url}`
    );
  }

  if (action.location.regexp) {
    const regexp = new RegExp(action.location.regexp);
    assert(
      regexp.test(url),
      `location check failed: must be ${action.location.regexp}, but: ${url}`
    );
  }
  return { meta: action.meta, ensure: true };
};

export const screenshotHandler: ActionHandler<"screenshot", "chrome"> = async (
  page: Page,
  { action },
  { imageDir }
) => {
  const filename = action.name;
  const now = Date.now();
  const fullpath = `${imageDir}/chrome-${now}-${filename}.png`;
  await page.screenshot({
    fullPage: true,
    path: fullpath
  });

  return { meta: action.meta, value: fullpath };
};

export const gotoHandler: ActionHandler<"goto", "chrome"> = async (
  page: Page,
  { action }
) => {
  await page.goto(action.url, { waitUntil: "networkidle2" });

  return { meta: action.meta, value: action.url };
};

export const clearHandler: ActionHandler<"clear", "chrome"> = async (
  page: Page,
  { action }
) => {
  await page.waitForSelector(action.selector);
  await page.click(action.selector, { clickCount: 3 });
  await page.keyboard.press("Backspace");

  return { meta: action.meta };
};
