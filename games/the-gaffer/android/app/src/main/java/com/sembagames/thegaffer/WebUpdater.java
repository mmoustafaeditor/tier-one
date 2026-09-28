package com.sembagames.thegaffer;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.webkit.WebView;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

// Live updates for the app.
//
// The APK carries a copy of the game (assets/index.html + version.json). Whenever a newer web build is published on
// sembagames.app, this class downloads it in the background, checks its size and SHA-256 against version.json, and
// keeps it in the app's files. The page then shows "Update now"; the next start uses the new build anyway.
// If a downloaded build ever fails to start (the page never says "booted"), the app throws it away and goes back to
// the bundled one. A new APK is only needed when the page asks for a newer shell (minShell > SHELL) or a new
// versionCode is announced at /api/the-gaffer/latest; the page shows "Download" for that.
public class WebUpdater {
    // What this APK can run. The web build's minShell must be <= SHELL (see web/vite.config.ts).
    public static final int SHELL = 2;
    private static final String SITE = "https://www.sembagames.app";
    private static final String VERSION_URL = SITE + "/the-gaffer/version.json";
    private static final String HTML_URL = SITE + "/the-gaffer/index.html";
    private static final String LATEST_URL = SITE + "/api/the-gaffer/latest";
    private static final String ASSET_URL = "file:///android_asset/index.html";
    private static final long CHECK_EVERY = 10 * 60 * 1000; // at most every 10 minutes while the app is open

    private final Activity activity;
    private final WebView web;
    private final SharedPreferences prefs;
    private final File dir;
    private final File page;
    private final File backup;
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private int running;           // build number of the page on screen
    private String state = "";     // last JSON sent to the page, for updateState()

    public WebUpdater(Activity activity, WebView web) {
        this.activity = activity;
        this.web = web;
        this.prefs = activity.getSharedPreferences("GafferWebUpdater", Context.MODE_PRIVATE);
        this.dir = new File(activity.getFilesDir(), "web");
        this.page = new File(dir, "index.html");
        this.backup = new File(activity.getFilesDir(), "save-backup.json");
    }

    private int bundledBuild() {
        try (InputStream in = activity.getAssets().open("version.json")) {
            return new JSONObject(new String(readAll(in), StandardCharsets.UTF_8)).optInt("build", 0);
        } catch (Exception e) {
            return 0;
        }
    }

    // Which page to open: the downloaded build if it's newer than the bundled one and started fine last time.
    public String startUrl() {
        int bundled = bundledBuild();
        int cached = prefs.getInt("web_build", 0);
        int pending = prefs.getInt("pending_boot", 0);
        if (cached > 0 && pending == cached) {
            // Last start of this build never reached "booted": don't try it again.
            prefs.edit().putInt("bad_build", cached).remove("web_build").remove("pending_boot").apply();
            deletePage();
            cached = 0;
        }
        if (cached > bundled && page.exists() && cached != prefs.getInt("bad_build", 0)) {
            prefs.edit().putInt("pending_boot", cached).apply();
            running = cached;
            return Uri.fromFile(page).toString();
        }
        running = bundled;
        return ASSET_URL;
    }

    // The page calls this once it has drawn its first screen.
    public void booted(int build) {
        running = build;
        prefs.edit().remove("pending_boot").apply();
    }

    public String updateState() { return state; }

    // "Update now" on the page: open the downloaded build.
    public void applyUpdate() {
        int cached = prefs.getInt("web_build", 0);
        if (cached <= running || !page.exists()) return;
        prefs.edit().putInt("pending_boot", cached).apply();
        final String url = Uri.fromFile(page).toString();
        activity.runOnUiThread(() -> web.loadUrl(url));
    }

    public void openApkUpdate() {
        String url = prefs.getString("apk_url", SITE + "/downloads/TheGaffer.apk");
        activity.runOnUiThread(() -> {
            try { activity.startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception ignored) { }
        });
    }

    public void backupSave(String json) {
        try (FileOutputStream out = new FileOutputStream(backup)) {
            out.write(json.getBytes(StandardCharsets.UTF_8));
        } catch (Exception ignored) { }
    }

    public String restoreSave() {
        if (!backup.exists()) return "";
        try (FileInputStream in = new FileInputStream(backup)) {
            return new String(readAll(in), StandardCharsets.UTF_8);
        } catch (Exception e) {
            return "";
        }
    }

    // Looks for a newer web build and a newer APK. Never blocks the game; any failure just waits for the next check.
    public void check() {
        long now = System.currentTimeMillis();
        if (now - prefs.getLong("last_check", 0) < CHECK_EVERY) { if (!state.isEmpty()) tellPage(state); return; }
        prefs.edit().putLong("last_check", now).apply();
        io.execute(() -> {
            JSONObject out = new JSONObject();
            try {
                JSONObject v = new JSONObject(new String(get(VERSION_URL), StandardCharsets.UTF_8));
                int build = v.optInt("build", 0);
                int minShell = v.optInt("minShell", 1);
                if (build > running && build != prefs.getInt("bad_build", 0)) {
                    if (minShell > SHELL) {
                        out.put("apk", new JSONObject().put("version", v.optString("version")));
                    } else if (prefs.getInt("web_build", 0) == build && page.exists() || download(v)) {
                        out.put("web", new JSONObject().put("version", v.optString("version")).put("build", build));
                    }
                }
            } catch (Exception ignored) { }
            try {
                JSONObject l = new JSONObject(new String(get(LATEST_URL), StandardCharsets.UTF_8));
                if (l.optInt("versionCode", 0) > BuildConfig.VERSION_CODE && !l.optString("downloadUrl").isEmpty()) {
                    prefs.edit().putString("apk_url", l.optString("downloadUrl")).apply();
                    out.put("apk", new JSONObject().put("version", l.optString("version")).put("url", l.optString("downloadUrl")));
                }
            } catch (Exception ignored) { }
            if (out.length() > 0) {
                state = out.toString();
                tellPage(state);
            }
        });
    }

    // Downloads the new page to a temporary file, checks it, then swaps it in.
    private boolean download(JSONObject v) {
        try {
            byte[] html = get(HTML_URL + "?b=" + v.optInt("build"));
            if (html.length != v.optInt("bytes", -1)) return false;
            if (!sha256(html).equalsIgnoreCase(v.optString("sha256"))) return false;
            if (!dir.exists() && !dir.mkdirs()) return false;
            File tmp = new File(dir, "index.html.part");
            try (FileOutputStream out = new FileOutputStream(tmp)) { out.write(html); }
            if (page.exists() && !page.delete()) return false;
            if (!tmp.renameTo(page)) return false;
            prefs.edit().putInt("web_build", v.optInt("build")).putString("web_version", v.optString("version")).apply();
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    // Tells the page; if the page is too old to listen, the app shows its own dialog instead.
    private void tellPage(String json) {
        activity.runOnUiThread(() -> web.evaluateJavascript(
            "(window.__gafferUpdate ? (window.__gafferUpdate(" + json + "), 'ok') : 'none')",
            result -> { if (result == null || result.contains("none")) nativeDialog(json); }));
    }

    private void nativeDialog(String json) {
        try {
            JSONObject s = new JSONObject(json);
            boolean apk = s.has("apk");
            String version = (apk ? s.getJSONObject("apk") : s.getJSONObject("web")).optString("version");
            new AlertDialog.Builder(activity)
                .setTitle("The Gaffer " + version)
                .setMessage(apk ? "A new version of the app is out. Download it to keep getting updates." : "A new version is ready.")
                .setPositiveButton(apk ? "Download" : "Update now", (d, w) -> { if (apk) openApkUpdate(); else applyUpdate(); })
                .setNegativeButton("Later", (d, w) -> d.dismiss())
                .show();
        } catch (Exception ignored) { }
    }

    private void deletePage() { if (page.exists()) //noinspection ResultOfMethodCallIgnored
        page.delete(); }

    private static byte[] get(String url) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(8000);
        c.setReadTimeout(20000);
        c.setUseCaches(false);
        c.setRequestProperty("Cache-Control", "no-cache");
        try (InputStream in = c.getInputStream()) {
            if (c.getResponseCode() != 200) throw new Exception("HTTP " + c.getResponseCode());
            return readAll(in);
        } finally {
            c.disconnect();
        }
    }

    private static byte[] readAll(InputStream in) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[16384];
        int n;
        while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        return out.toByteArray();
    }

    private static String sha256(byte[] data) throws Exception {
        byte[] d = MessageDigest.getInstance("SHA-256").digest(data);
        StringBuilder sb = new StringBuilder();
        for (byte b : d) sb.append(String.format("%02x", b));
        return sb.toString();
    }
}
