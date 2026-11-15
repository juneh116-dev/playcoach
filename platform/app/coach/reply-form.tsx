"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function ReplyForm({ requestId }: { requestId: string }) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <form
      className="reply"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        try {
          const res = await fetch("/api/feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requestId, body }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          setBody("");
          router.refresh();
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "답변을 보내지 못했습니다.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <label htmlFor={`reply-${requestId}`}>플레이어에게 전할 피드백</label>
      <textarea
        id={`reply-${requestId}`}
        required
        minLength={20}
        maxLength={4000}
        rows={4}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="고민에 대한 관찰과 실천할 수 있는 조언을 적어주세요."
      />
      {error && (
        <p role="alert" className="alert">
          {error}
        </p>
      )}
      <button className="button" disabled={busy || body.trim().length < 20}>
        {busy ? "전송 중…" : "피드백 보내기 ↗"}
      </button>
    </form>
  );
}
