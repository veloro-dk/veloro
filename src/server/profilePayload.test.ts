import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTimeZone, parseProfilePayload } from "@/server/profilePayload";

test("parseProfilePayload normalizes profile fields", () => {
    const parsed = parseProfilePayload({
        firstName: "  Jane ",
        lastName: " Doe  ",
        email: "  jane@example.com ",
        phone: " +45 12 34 56 78 ",
        preferredLanguage: " EN ",
        timeZone: "Europe/Copenhagen",
    });

    assert.equal(parsed.firstName, "Jane");
    assert.equal(parsed.lastName, "Doe");
    assert.equal(parsed.emailRaw, "jane@example.com");
    assert.equal(parsed.phoneRaw, "+45 12 34 56 78");
    assert.equal(parsed.preferredLanguage, "en");
    assert.equal(parsed.timeZone, "Europe/Copenhagen");
});

test("normalizeTimeZone falls back for invalid time zones", () => {
    assert.equal(normalizeTimeZone("Mars/OlympusMons"), "Europe/Copenhagen");
    assert.equal(normalizeTimeZone(""), "Europe/Copenhagen");
});
