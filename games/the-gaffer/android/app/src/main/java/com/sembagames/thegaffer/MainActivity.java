package com.sembagames.thegaffer;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.core.content.FileProvider;

import java.io.File;
import java.io.FileOutputStream;

// The Gaffer: the whole game is one web page in a WebView. It plays offline from the copy bundled in the APK
// (assets/index.html); WebUpdater keeps it up to date with the build published on sembagames.app.
// The page talks to Android through window.GafferAndroid (sharing images, save files and text, which a WebView
// can't download on its own; live updates; a copy of the save) and asks the page about the back button through
// window.__gafferBack().
public class MainActivity extends Activity {
    private static final int PICK_FILE = 7;
    private WebView web;
    private ValueCallback<Uri[]> pending;
    private WebUpdater updater;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        int bg = Color.parseColor("#070B16");
        Window w = getWindow();
        w.setStatusBarColor(bg);
        w.setNavigationBarColor(bg);

        web = new WebView(this);
        web.setBackgroundColor(bg);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setTextZoom(100);
        updater = new WebUpdater(this, web);
        web.addJavascriptInterface(new Bridge(), "GafferAndroid");
        web.setWebChromeClient(new WebChromeClient() {
            // <input type="file">: coach photo, save import, world import.
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (pending != null) pending.onReceiveValue(null);
                pending = callback;
                try {
                    startActivityForResult(params.createIntent(), PICK_FILE);
                } catch (ActivityNotFoundException e) {
                    pending = null;
                    return false;
                }
                return true;
            }
        });
        web.setWebViewClient(new WebViewClient() {
            // Links (the Semba Games button) open in the browser.
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                String scheme = u.getScheme();
                if ("http".equals(scheme) || "https".equals(scheme)) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { }
                    return true;
                }
                return false;
            }
        });
        setContentView(web);
        if (savedInstanceState != null) {
            web.restoreState(savedInstanceState);
        } else {
            web.loadUrl(updater.startUrl());
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != PICK_FILE || pending == null) return;
        pending.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
        pending = null;
    }

    private class Bridge {
        // A file made by the page (PNG card, match report, .gaffer save, world .json): written to the cache and
        // handed to the share sheet, where the player can save it to Files or send it.
        @JavascriptInterface
        public boolean shareFile(String name, String base64, String mime, String title) {
            try {
                File dir = new File(getCacheDir(), "shared");
                if (!dir.exists() && !dir.mkdirs()) return false;
                File f = new File(dir, name.replaceAll("[^A-Za-z0-9._-]", "_"));
                try (FileOutputStream out = new FileOutputStream(f)) {
                    out.write(Base64.decode(base64, Base64.DEFAULT));
                }
                Uri uri = FileProvider.getUriForFile(MainActivity.this, "com.sembagames.thegaffer.files", f);
                Intent send = new Intent(Intent.ACTION_SEND);
                send.setType(mime);
                send.putExtra(Intent.EXTRA_STREAM, uri);
                send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                runOnUiThread(() -> startActivity(Intent.createChooser(send, title)));
                return true;
            } catch (Exception e) {
                return false;
            }
        }

        // Live updates and the save copy (see WebUpdater and web/src/update.ts).
        @JavascriptInterface public void booted(int build) { updater.booted(build); }
        @JavascriptInterface public String updateState() { return updater.updateState(); }
        @JavascriptInterface public void applyUpdate() { updater.applyUpdate(); }
        @JavascriptInterface public void openApkUpdate() { updater.openApkUpdate(); }
        @JavascriptInterface public void backupSave(String json) { updater.backupSave(json); }
        @JavascriptInterface public String restoreSave() { return updater.restoreSave(); }
        @JavascriptInterface public int shellVersion() { return WebUpdater.SHELL; }

        @JavascriptInterface
        public boolean shareText(String text) {
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType("text/plain");
            send.putExtra(Intent.EXTRA_TEXT, text);
            runOnUiThread(() -> startActivity(Intent.createChooser(send, null)));
            return true;
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    // The page decides: close a sheet, go up one screen, or 'exit' on the home screen.
    @Override
    public void onBackPressed() {
        web.evaluateJavascript("(window.__gafferBack ? window.__gafferBack() : 'exit')", value -> {
            if (value == null || value.contains("exit")) finish();
        });
    }

    @Override
    protected void onPause() { super.onPause(); web.onPause(); }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        updater.check();
    }
}
