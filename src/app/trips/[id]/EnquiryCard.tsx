"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabaseBrowser } from "@/lib/supabaseClient";

type Props = {
  id: string;
  title: string;
  duration: number;
  parks: string[];
  price_from: number | null;
  price_to: number | null;
  /** bado zipo optional ukitaka uzitumie kutoka server */
  initialName?: string;
  initialEmail?: string;
  /** operator wa huu trip – kutoka trip.operator_id */
  operatorId?: string | null;
};

const BRAND = {
  ink: "#0e2430",
  primary: "#1B4D3E", // Safari Connector green
  primarySoft: "rgba(27,77,62,.08)",
  border: "#e6ebe9",
};

export default function EnquiryCard({
  id,
  title,
  duration,
  parks,
  price_from,
  price_to,
  initialName,
  initialEmail,
  operatorId,
}: Props) {
  const { user } = useAuth(); // 🔐 current traveller (browser auth)

  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // local state for auto-filled fields
  const [name, setName] = useState(initialName ?? "");
  const [email, setEmail] = useState(initialEmail ?? "");

  const todayISO = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const money = (n: number | null | undefined) =>
    n == null ? null : `USD ${n.toLocaleString()}`;

  // 🔐 auto-fill from logged-in user once we have it
  useEffect(() => {
    if (!user) return;
    const meta: any = user.user_metadata || {};

    setName((prev) => {
      if (prev) return prev; // usibadilishe kama user tayari kaandika
      const composed =
        meta.full_name ||
        meta.name ||
        `${meta.first_name ?? ""} ${meta.last_name ?? ""}`.trim();
      return composed || "";
    });

    setEmail((prev) => {
      if (prev) return prev;
      return user.email || meta.email || "";
    });
  }, [user]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement | null;

    setBusy(true);
    setOk(null);
    setErr(null);

    const f = new FormData(form || undefined);

    const payload: Record<string, any> = {};
    f.forEach((value, key) => {
      payload[key] = value;
    });

    if (!payload.name || !payload.email || !payload.preferred_date) {
      setErr("Please add your name, email, and preferred date.");
      setBusy(false);
      return;
    }

    let activeUser = user;

    // 👉 Kama hana account (si logged in), tumfanyie signUp / signIn hapa hapa
    if (!activeUser) {
      const emailStr = String(payload.email);
      const passwordStr = String(payload.password || "");

      if (!passwordStr || passwordStr.length < 6) {
        setErr("Please create a password with at least 6 characters.");
        setBusy(false);
        return;
      }

      try {
        const { data: signUpData, error: signUpError } =
          await supabaseBrowser.auth.signUp({
            email: emailStr,
            password: passwordStr,
            options: {
              data: {
                full_name: String(payload.name),
              },
            },
          });

        if (signUpError) {
          // Kama user tayari yupo, jaribu kum-log-in badala ya kusignup tena
          if (
            signUpError.message &&
            signUpError.message.toLowerCase().includes("already registered")
          ) {
            const { data: signInData, error: signInError } =
              await supabaseBrowser.auth.signInWithPassword({
                email: emailStr,
                password: passwordStr,
              });

            if (signInError) {
              setErr(
                signInError.message ||
                  "We couldn't log you in with that email and password."
              );
              setBusy(false);
              return;
            }

            activeUser = signInData.user ?? null;
          } else {
            setErr(signUpError.message || "Could not create your account.");
            setBusy(false);
            return;
          }
        } else {
          activeUser = signUpData.user ?? null;
        }
      } catch (authErr: any) {
        console.error("Auth error during quote signup:", authErr);
        setErr(authErr?.message || "Authentication failed. Please try again.");
        setBusy(false);
        return;
      }
    }

    if (!activeUser) {
      setErr("We could not confirm your account. Please try again.");
      setBusy(false);
      return;
    }

    // 🔽 From here: user is guaranteed to have an account (logged-in)
    const adults = Number(payload.adults || 1);

    const extraDetailsLines: string[] = [];

    extraDetailsLines.push(
      `Trip duration: ${duration} day(s)`,
      `Adults: ${adults}`
    );

    if (parks?.length) {
      extraDetailsLines.push(`Parks: ${parks.join(", ")}`);
    }

    if (price_from || price_to) {
      const fromStr = money(price_from) ?? "On request";
      const toStr = price_to ? money(price_to) : null;
      extraDetailsLines.push(
        `Price range: ${fromStr}${toStr ? ` – ${toStr}` : ""}`
      );
    }

    if (payload.country) {
      extraDetailsLines.push(`Country: ${payload.country}`);
    }

    const composedNote = [
      payload.message || "",
      "",
      "---- Trip details ----",
      ...extraDetailsLines,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const { error } = await supabaseBrowser.from("quote_requests").insert([
        {
          trip_id: id,
          trip_title: title,
          date: payload.preferred_date, // yyyy-mm-dd
          pax: adults,
          name: payload.name,
          email: payload.email,
          phone: payload.phone || null,
          note: composedNote,
          traveller_id: activeUser.id,      // ⭐ link na user
          operator_id: operatorId ?? null,  // ⭐ link na operator wa trip
        },
      ]);

      if (error) {
        console.error(
          "quote_requests insert error:",
          error,
          "message:",
          (error as any)?.message,
          "details:",
          (error as any)?.details,
          "code:",
          (error as any)?.code
        );
        setErr(
          (error as any)?.message ||
            (error as any)?.details ||
            "Something went wrong. Please try again."
        );
      } else {
        setOk("Thanks! Your request has been sent to our safari experts.");
        form?.reset();
        setName(initialName ?? "");
        setEmail(initialEmail ?? "");
      }
    } catch (dbErr: any) {
      console.error("quote_requests insert exception:", dbErr);
      setErr(dbErr?.message || "Unexpected error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="sc-card"
      style={{
        background: "#fff",
        border: `1px solid ${BRAND.border}`,
        borderRadius: 14,
        boxShadow: "0 1px 10px rgba(0,0,0,0.03)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* brand accent */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 5,
          background: BRAND.primary,
        }}
      />

      {/* header */}
      <div style={{ padding: "14px 16px 0 16px" }}>
        <div
          style={{
            fontSize: 13,
            color: BRAND.primary,
            fontWeight: 700,
            letterSpacing: ".02em",
          }}
        >
          Talk to a Safari Expert
        </div>
        <div
          style={{
            fontWeight: 800,
            color: BRAND.ink,
            lineHeight: 1.25,
            marginTop: 2,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 12, color: "#5b6f68", marginTop: 6 }}>
          {duration} days
          {parks?.length ? ` • ${parks.join(" • ")}` : ""} ·{" "}
          {money(price_from) ?? "Price on request"}
          {price_to ? ` – ${money(price_to)}` : ""}
        </div>
      </div>

      {/* form */}
      <form
        onSubmit={onSubmit}
        style={{ padding: 16, display: "grid", gap: 10 }}
      >
        <input
          name="name"
          placeholder="Full name"
          required
          style={input}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          style={input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* Kama mtu haja-login, muonyeshe sehemu ya ku-create password */}
        {!user && (
          <input
            name="password"
            type="password"
            placeholder="Create a password (min 6 characters)"
            required
            style={input}
          />
        )}

        <div style={twoCol}>
          <input
            name="phone"
            type="tel"
            placeholder="Phone (optional)"
            style={input}
          />
          <input
            name="country"
            placeholder="Country (optional)"
            style={input}
          />
        </div>

        <div style={twoCol}>
          <input
            name="preferred_date"
            type="date"
            min={todayISO}
            required
            style={input}
            aria-label="Preferred travel date"
          />
          <input
            name="adults"
            type="number"
            min={1}
            defaultValue={2}
            style={input}
            aria-label="Number of adults"
            placeholder="Adults"
          />
        </div>

        <textarea
          name="message"
          rows={3}
          placeholder="Share any must-see parks, budget window, or special notes…"
          style={{ ...input, resize: "vertical" }}
        />

        <button type="submit" disabled={busy} style={btn}>
          {busy ? "Sending…" : "Request a quote"}
        </button>

        {ok && <p style={{ color: "#166534", fontSize: 12 }}>{ok}</p>}
        {err && <p style={{ color: "#b91c1c", fontSize: 12 }}>{err}</p>}

        <p style={{ fontSize: 11, color: "#6a7c76", marginTop: 2 }}>
          No fees. No pressure. We’ll only use your details to respond to this
          enquiry.
        </p>
      </form>
    </div>
  );
}

/* ——— styles ——— */
const input: React.CSSProperties = {
  width: "100%",
  border: `1px solid ${BRAND.border}`,
  background: "#fff",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  outline: "none",
  transition: "border-color .15s, box-shadow .15s",
} as const;

const twoCol: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
} as const;

const btn: React.CSSProperties = {
  width: "100%",
  border: "none",
  borderRadius: 12,
  padding: "12px 14px",
  background: BRAND.primary,
  color: "#fff",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
} as const;
