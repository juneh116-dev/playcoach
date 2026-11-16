"use client";
import { useState } from "react";
import Link from "next/link";
import { sports, regions } from "@/lib/catalog";
export default function RequestForm({
  signedIn,
  initialSport,
}: {
  signedIn: boolean;
  initialSport?: string;
}) {
  const [sport, setSport] = useState<string>(
    sports.find((s) => s === initialSport) || "",
  );
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [concern, setConcern] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ id: string; recipients: number } | null>(
    null,
  );
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !signedIn) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport,
          region: `${city} ${district}`,
          concern,
          consent,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setDone(data);
      setConcern("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "전송하지 못했습니다. 다시 시도해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (done)
    return (
      <section className="panel success" aria-live="polite">
        <span className="success-icon">✓</span>
        <h2>요청이 접수됐어요.</h2>
        <p>
          {done.recipients > 0
            ? `${done.recipients}명의 지역 코치·레슨장에 요청 알림을 보냈어요. 답변이 도착하면 내 요청에서 확인할 수 있어요.`
            : "현재 이 종목·지역에 연결된 코치가 없어 요청이 전달되지 않았어요. 내 요청에서 내용을 확인하거나 삭제할 수 있어요."}
        </p>
        <Link className="button" href="/inbox">
          내 요청 확인하기 ↗
        </Link>
      </section>
    );
  return (
    <form className="panel request-form" onSubmit={submit}>
      <div className="form-heading">
        <h2>무료 피드백 요청</h2>
        <span>간단하게 시작하세요</span>
      </div>
      <fieldset>
        <legend>
          <span className="step-label">01</span>어떤 종목인가요?
        </legend>
        <div className="chips">
          {sports.map((s) => (
            <button
              type="button"
              key={s}
              aria-pressed={sport === s}
              className={sport === s ? "selected" : ""}
              onClick={() => setSport(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>
          <span className="step-label">02</span>어디에서 배우고 싶나요?
        </legend>
        <div className="region-fields">
          <label>
            시·도
            <select
              aria-label="시·도"
              required
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setDistrict("");
              }}
            >
              <option value="">시·도 선택</option>
              {Object.keys(regions).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            시·군·구
            <select
              aria-label="시·군·구"
              required
              disabled={!city}
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
            >
              <option value="">시·군·구 선택</option>
              {city &&
                regions[city as keyof typeof regions].map((d) => (
                  <option key={d}>{d}</option>
                ))}
            </select>
          </label>
        </div>
        <p className="fine">현재 서울·경기·부산 지역 선택을 지원합니다.</p>
      </fieldset>
      <fieldset>
        <legend>
          <span className="step-label">03</span>어떤 점이 고민인가요?
        </legend>
        <label className="sr-only" htmlFor="concern">
          운동 고민
        </label>
        <textarea
          id="concern"
          required
          maxLength={2000}
          rows={5}
          value={concern}
          onChange={(e) => setConcern(e.target.value)}
          placeholder="예: 달릴 때 상체가 자꾸 흔들려요. 자세를 어떻게 잡으면 좋을까요?"
        />
        <div className="textarea-bottom">
          <span>연락처 등 개인정보는 적지 마세요.</span>
          <span>{concern.length}/2,000</span>
        </div>
        <p className="attachment-note">
          영상 첨부 기능은 준비 중입니다. 현재는 글로 고민을 전달할 수 있어요.
        </p>
      </fieldset>
      <label className="consent">
        <input
          type="checkbox"
          required
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>
          요청 내용을 해당 종목·지역의 승인된 코치·레슨장에 제공하는 데
          동의합니다. <Link href="/privacy">내용 확인</Link>
        </span>
      </label>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      {signedIn ? (
        <button
          className="button full"
          disabled={busy || !sport || !district || !concern.trim() || !consent}
        >
          {busy ? "요청을 보내고 있어요…" : "무료 피드백 요청하기 ↗"}
        </button>
      ) : (
        <Link className="button full" href="/login">
          로그인하고 요청하기 ↗
        </Link>
      )}
      <p className="fine centered">
        코치의 답변 여부와 시간은 달라질 수 있어요.
      </p>
    </form>
  );
}
