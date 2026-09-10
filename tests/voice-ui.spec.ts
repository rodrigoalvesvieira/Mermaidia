import { test, expect } from "@playwright/test";
import { snapshot } from "./helpers";

// A protocol/UI integration test, explicitly not evidence of speech recognition.
test("voice is primary: automatic listening, spoken card close, acceleration and pause/resume", async ({
  page,
}) => {
  let interpretationRequests = 0;
  await page.route("**/api/voice/interpret", (route) => {
    interpretationRequests++;
    return route.fulfill({ json: { commands: [] } });
  });
  await page.addInitScript(() => {
    let channel: any;
    let sequence = 0;
    const tracks: any[] = [];
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => {
        const track = {
          enabled: true,
          readyState: "live",
          stop() {
            this.readyState = "ended";
          },
          onended: null,
        };
        tracks.push(track);
        return { getTracks: () => [track], getAudioTracks: () => [track] };
      },
    });
    class TestPeer {
      connectionState = "connected";
      addTrack() {}
      createDataChannel() {
        channel = {
          readyState: "connecting",
          send() {},
          close() {
            this.readyState = "closed";
          },
          onopen: null,
          onmessage: null,
        };
        return channel;
      }
      async createOffer() {
        return { type: "offer", sdp: "v=0\r\n" };
      }
      async setLocalDescription() {}
      async setRemoteDescription() {
        channel.readyState = "open";
        channel.onopen?.();
      }
      close() {
        this.connectionState = "closed";
      }
    }
    (window as any).RTCPeerConnection = TestPeer;
    (window as any).__protocolTurn = (text: string) => {
      const item_id = `fixture-${++sequence}`;
      for (const event of [
        { type: "input_audio_buffer.speech_started", item_id },
        { type: "input_audio_buffer.speech_stopped", item_id },
        {
          type: "conversation.item.input_audio_transcription.completed",
          item_id,
          transcript: text,
        },
      ])
        channel.onmessage?.({ data: JSON.stringify(event) });
    };
    (window as any).__testTracks = tracks;
  });
  await page.route("**/api/voice/status", (route) =>
    route.fulfill({
      json: {
        available: true,
        configured: true,
        adultDevelopmentMode: true,
        childReady: false,
      },
    }),
  );
  await page.route("**/api/voice/enable", (route) =>
    route.fulfill({ json: { csrf: "a".repeat(48), maxSessionMs: 600000 } }),
  );
  await page.route("**/api/voice/session", (route) =>
    route.fulfill({ contentType: "application/sdp", body: "v=0\r\n" }),
  );
  await page.route("**/api/voice/disable", (route) =>
    route.fulfill({ status: 204 }),
  );
  // Short real PCM buffer only replaces narration duration in this UX protocol test.
  const wav = Buffer.alloc(44 + 4800);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(24000, 24);
  wav.writeUInt32LE(48000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(4800, 40);
  await page.route(
    /\/(?:assets\/audio\/narration-[^/]+\.wav|api\/narration\/[^/]+)$/,
    (route) => route.fulfill({ contentType: "audio/wav", body: wav }),
  );
  await page.goto("/");
  await page.locator(".destination").first().click();
  await page.getByRole("button", { name: "Start swimming" }).click();
  await expect(page.locator(".loading")).toHaveCount(0);
  await expect(page.locator(".primary-mic")).toContainText("Listening to you");
  expect(
    await page.evaluate(
      () => (window as any).__mermaidia.voiceStats().narrating,
    ),
  ).toBe(false);
  await expect(
    page.getByRole("button", { name: "Swim forward", exact: true }),
  ).toBeHidden();
  await page.screenshot({ path: "artifacts/voice-ui/protocol-listening.png" });
  const speak = async (text: string) => {
    await page.evaluate((t) => (window as any).__protocolTurn(t), text);
    await page.waitForTimeout(150);
  };
  await speak("what is this fish");
  await expect(page.getByRole("dialog")).toBeVisible();
  expect((await snapshot(page)).motion).toBe("hover");
  await expect(page.locator(".dialog-voice")).toContainText("Listening.");
  await page.screenshot({ path: "artifacts/voice-ui/protocol-discovery.png" });
  await speak("keep swimming");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await speak("I want to swim forward");
  expect((await snapshot(page)).motion).toBe("forward");
  await speak("can we go faster");
  expect((await snapshot(page)).speed).toBe(1);
  await speak("stop");
  expect((await snapshot(page)).motion).toBe("hover");
  await speak("pause");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".dialog-voice")).toContainText("Listening.");
  await speak("resume");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await speak("can we go to the surface");
  await expect
    .poll(async () => (await snapshot(page)).surface, { timeout: 20000 })
    .toBe(true);
  await expect(
    page.getByRole("button", { name: "Show swimming buttons" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Show swimming buttons" }).click();
  await expect(
    page.getByRole("button", { name: "Swim forward", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Stop listening", exact: true })
    .click();
  expect(
    await page.evaluate(() =>
      (window as any).__testTracks.every((t: any) => t.readyState === "ended"),
    ),
  ).toBe(true);
  const stored = await page.evaluate(() =>
    localStorage.getItem("mermaidia-v1"),
  );
  expect(stored).not.toContain("what is this fish");
  expect(interpretationRequests).toBe(0);
});

test("an empty server key names the actual blocker without an adult-session checkbox", async ({
  page,
}) => {
  let enableRequests = 0;
  await page.route("**/api/voice/status", (route) =>
    route.fulfill({
      json: {
        available: false,
        configured: false,
        adultDevelopmentMode: true,
        childReady: false,
        reason:
          "OPENAI_API_KEY is empty or missing on the server. Add your key to .env and restart the server to enable voice.",
      },
    }),
  );
  await page.route("**/api/voice/enable", (route) => {
    enableRequests++;
    return route.fulfill({ status: 403 });
  });
  await page.goto("/");
  await page.locator(".destination").first().click();
  await page.getByRole("button", { name: "Start swimming" }).click();
  await expect(page.locator(".loading")).toHaveCount(0);
  await expect(page.locator(".primary-mic")).toContainText(
    "OpenAI API key is missing",
  );
  await expect(page.locator(".voice-prompt")).toContainText("OPENAI_API_KEY");
  await page
    .getByRole("button", { name: "Start listening", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".availability")).toContainText(
    "OPENAI_API_KEY is empty or missing",
  );
  await expect(
    page.getByText("Enable my adult voice play for this session", {
      exact: true,
    }),
  ).toHaveCount(0);
  expect(enableRequests).toBe(0);
});
