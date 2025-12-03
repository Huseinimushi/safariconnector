"use client";

import React from "react";

const BRAND_GREEN = "#0B6B3A";
const BRAND_GOLD = "#D4A017";
const BG_SAND = "#F4F3ED";

export type ItineraryResult = {
  title: string;
  summary: string;
  destination: string;
  daysCount: number;
  travelDate: string | null;
  budgetRange: string;
  style: string;
  groupType: string;
  experiences: string[];
  days: string[];      // "Day 1: ..." etc
  includes: string[];
  excludes: string[];
};

type Props = {
  result: ItineraryResult;
};

const chipStyle: React.CSSProperties = {
  fontSize: 11,
  padding: "4px 8px",
  borderRadius: 999,
  backgroundColor: "#FFFFFF",
  border: "1px solid #E5E7EB",
  color: "#374151",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "#111827",
  marginBottom: 4,
};

const sectionCardStyle: React.CSSProperties = {
  borderRadius: 12,
  backgroundColor: "#FFFFFF",
  border: "1px solid #E5E7EB",
  padding: "10px 11px",
};

export default function AiTripResultPanel({ result }: Props) {
  const {
    title,
    summary,
    destination,
    daysCount,
    travelDate,
    budgetRange,
    style,
    groupType,
    experiences,
    days,
    includes,
    excludes,
  } = result;

  return (
    <div
      style={{
        borderRadius: 20,
        backgroundColor: BG_SAND,
        border: "1px solid #E5E7EB",
        padding: 16,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 10,
        }}
      >
        <div style={{ flex: 1 }}>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              color: "#6B7280",
            }}
          >
            AI generated safari plan
          </p>
          <h2
            style={{
              margin: 0,
              marginTop: 4,
              fontSize: 20,
              fontWeight: 800,
              color: BRAND_GREEN,
            }}
          >
            {title || "Custom safari itinerary"}
          </h2>
          {summary && (
            <p
              style={{
                margin: 0,
                marginTop: 4,
                fontSize: 13,
                color: "#4B5563",
              }}
            >
              {summary}
            </p>
          )}
        </div>

        {/* Quick facts */}
        <div
          style={{
            minWidth: 210,
            borderRadius: 14,
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E7EB",
            padding: "10px 11px",
            fontSize: 12,
          }}
        >
          <div style={{ ...sectionTitleStyle, marginBottom: 6 }}>
            Trip snapshot
          </div>
          <div style={{ display: "grid", rowGap: 4 }}>
            <div>
              <span style={{ color: "#6B7280" }}>Destination</span>
              <br />
              <strong>{destination || "Not specified"}</strong>
            </div>
            <div>
              <span style={{ color: "#6B7280" }}>Duration</span>
              <br />
              <strong>{daysCount || 0} days</strong>
            </div>
            <div>
              <span style={{ color: "#6B7280" }}>Travel date</span>
              <br />
              <strong>{travelDate || "Flexible"}</strong>
            </div>
            <div>
              <span style={{ color: "#6B7280" }}>Budget</span>
              <br />
              <strong>{budgetRange || "On request"}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Chips row */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 14,
        }}
      >
        {style && (
          <span style={{ ...chipStyle, borderColor: BRAND_GREEN, color: BRAND_GREEN }}>
            {style}
          </span>
        )}
        {groupType && <span style={chipStyle}>{groupType}</span>}
        {daysCount > 0 && <span style={chipStyle}>{daysCount} days</span>}
        {destination && <span style={chipStyle}>{destination}</span>}
      </div>

      {/* Grid: Experiences + Day by day */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr)",
          gap: 12,
          marginBottom: 12,
        }}
      >
        {/* Experiences / highlights */}
        <div style={sectionCardStyle}>
          <div style={sectionTitleStyle}>Key experiences</div>
          {(!experiences || experiences.length === 0) && (
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: "#6B7280",
              }}
            >
              No experiences listed.
            </p>
          )}
          {experiences && experiences.length > 0 && (
            <ul
              style={{
                margin: 0,
                marginTop: 4,
                paddingLeft: 18,
                fontSize: 12,
                color: "#374151",
              }}
            >
              {experiences.map((exp, idx) => (
                <li key={idx} style={{ marginBottom: 2 }}>
                  {exp}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Day by day in compact style */}
        <div style={sectionCardStyle}>
          <div style={sectionTitleStyle}>Overview by day</div>
          {(!days || days.length === 0) && (
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: "#6B7280",
              }}
            >
              No day-by-day breakdown.
            </p>
          )}
          {days && days.length > 0 && (
            <div
              style={{
                marginTop: 4,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                fontSize: 12,
                color: "#374151",
              }}
            >
              {days.map((dayText, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "6px 7px",
                    borderRadius: 8,
                    backgroundColor: "#F9FAFB",
                    border: "1px solid #E5E7EB",
                  }}
                >
                  <strong style={{ fontSize: 11, color: BRAND_GREEN }}>
                    Day {idx + 1}
                  </strong>
                  <br />
                  <span>{dayText}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Includes / Excludes */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 12,
        }}
      >
        <div style={sectionCardStyle}>
          <div style={sectionTitleStyle}>What&apos;s included</div>
          {(!includes || includes.length === 0) && (
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: "#6B7280",
              }}
            >
              No inclusions listed.
            </p>
          )}
          {includes && includes.length > 0 && (
            <ul
              style={{
                margin: 0,
                marginTop: 4,
                paddingLeft: 18,
                fontSize: 12,
                color: "#374151",
              }}
            >
              {includes.map((inc, idx) => (
                <li key={idx} style={{ marginBottom: 2 }}>
                  {inc}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={sectionCardStyle}>
          <div style={sectionTitleStyle}>What&apos;s excluded</div>
          {(!excludes || excludes.length === 0) && (
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: "#6B7280",
              }}
            >
              No exclusions listed.
            </p>
          )}
          {excludes && excludes.length > 0 && (
            <ul
              style={{
                margin: 0,
                marginTop: 4,
                paddingLeft: 18,
                fontSize: 12,
                color: "#374151",
              }}
            >
              {excludes.map((exc, idx) => (
                <li key={idx} style={{ marginBottom: 2 }}>
                  {exc}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
