import { test, expect } from "@playwright/test";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import {
  matchRecipients,
  notifyRecipients,
  submitFeedback,
} from "../lib/queries";

test("종목·지역·승인 기준으로 전달하고 수신 코치만 한 번 답변한다", async () => {
  const db = new PGlite();
  try {
    await db.exec(await readFile("db/001-initial.sql", "utf8"));
    await db.exec(`INSERT INTO members(id,display_name) VALUES ('player','player'),('match','match'),('otherregion','otherregion'),('othersport','othersport'),('unapproved','unapproved');
      INSERT INTO coaches(member_id,name,kind,sports,regions,approved) VALUES
      ('match','일치','coach',ARRAY['러닝'],ARRAY['서울 성동구'],true),
      ('otherregion','다른지역','coach',ARRAY['러닝'],ARRAY['서울 강남구'],true),
      ('othersport','다른종목','facility',ARRAY['야구'],ARRAY['서울 성동구'],true),
      ('unapproved','미승인','coach',ARRAY['러닝'],ARRAY['서울 성동구'],false),
      ('player','자기자신','coach',ARRAY['러닝'],ARRAY['서울 성동구'],true);`);
    const q = await db.query<{ id: string }>(
      `INSERT INTO feedback_requests(member_id,sport,region,concern,consent_version) VALUES ('player','러닝','서울 성동구','러닝 자세에 대해 조언을 받고 싶어요.','test') RETURNING id`,
    );
    const id = q.rows[0].id;
    const recipients = await db.query(matchRecipients, [
      id,
      "러닝",
      "서울 성동구",
      "player",
    ]);
    expect(recipients.rows).toHaveLength(1);
    await db.query(notifyRecipients, [id]);
    const notifications = await db.query<{ member_id: string }>(
      "SELECT member_id FROM notifications",
    );
    expect(notifications.rows).toEqual([{ member_id: "match" }]);
    const body =
      "팔에 힘을 빼고, 상체가 흔들리지 않도록 짧은 거리부터 천천히 연습해 보세요.";
    expect(
      (await db.query(submitFeedback, [id, "otherregion", body])).rows,
    ).toHaveLength(0);
    expect(
      (await db.query(submitFeedback, [id, "unapproved", body])).rows,
    ).toHaveLength(0);
    expect(
      (await db.query(submitFeedback, [id, "match", body])).rows,
    ).toHaveLength(1);
    expect(
      (await db.query(submitFeedback, [id, "match", body])).rows,
    ).toHaveLength(0);
    const replyNotice = await db.query<{ member_id: string }>(
      "SELECT member_id FROM notifications WHERE kind='new_feedback'",
    );
    expect(replyNotice.rows).toEqual([{ member_id: "player" }]);
    await db.exec(
      "UPDATE feedback_requests SET status='closed'; DELETE FROM feedback; DELETE FROM notifications;",
    );
    expect(
      (await db.query(submitFeedback, [id, "match", body])).rows,
    ).toHaveLength(0);
  } finally {
    await db.close();
  }
});

test("요청 API는 다른 출처와 비로그인 요청을 차단한다", async ({ request }) => {
  const foreign = await request.post("/api/requests", {
    headers: { origin: "https://example.com" },
    data: {},
  });
  expect(foreign.status()).toBe(403);
  const unauthenticated = await request.post("/api/requests", {
    headers: { origin: "http://127.0.0.1:3100" },
    data: {},
  });
  expect(unauthenticated.status()).toBe(401);
  const feedback = await request.post("/api/feedback", {
    headers: { origin: "http://127.0.0.1:3100" },
    data: {},
  });
  expect(feedback.status()).toBe(401);
});

test("모바일에서 종목 선택을 이어받고 지역을 바꾸면 하위 지역을 초기화한다", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("link", { name: "야구", exact: false }).click();
  await expect(
    page.getByRole("button", { name: "야구", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("시·도", { exact: true }).selectOption("서울");
  await page.getByLabel("시·군·구", { exact: true }).selectOption("성동구");
  await page.getByLabel("시·도", { exact: true }).selectOption("경기");
  await expect(page.getByLabel("시·군·구", { exact: true })).toHaveValue("");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/request-mobile.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "로그인", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /카카오로 시작하기/ }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: /네이버로 시작하기/ }),
  ).toBeDisabled();
});

test("데스크톱 첫 화면과 로그인 전 개인 화면을 확인한다", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "피드백부터",
  );
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
  await page.goto("/inbox");
  await expect(page.getByRole("link", { name: "로그인하기" })).toBeVisible();
  await page.goto("/coach");
  await expect(page.getByRole("link", { name: "로그인하기" })).toBeVisible();
});
